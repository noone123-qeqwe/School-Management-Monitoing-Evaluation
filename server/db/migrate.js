require('dotenv').config();
const pool = require('./pool');

const schema = `
-- ============================================================
-- SMME Portal – PostgreSQL Schema
-- ============================================================

-- Schools
CREATE TABLE IF NOT EXISTS schools (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  school_code VARCHAR(20)  NOT NULL UNIQUE,
  level       VARCHAR(20)  NOT NULL CHECK (level IN ('kindergarten','elementary','junior','senior')),
  division    VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Staff accounts (school users)
CREATE TABLE IF NOT EXISTS staff (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  first_name  VARCHAR(100) NOT NULL,
  last_name   VARCHAR(100) NOT NULL,
  position    VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  phone       VARCHAR(30),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (email, school_id)
);

-- Admin accounts (division office)
CREATE TABLE IF NOT EXISTS admins (
  id          SERIAL PRIMARY KEY,
  username    VARCHAR(100) NOT NULL UNIQUE,
  full_name   VARCHAR(200) NOT NULL,
  position    VARCHAR(100),
  division    VARCHAR(100) NOT NULL,
  email       VARCHAR(150),
  phone       VARCHAR(30),
  password    VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id            SERIAL PRIMARY KEY,
  ref           VARCHAR(30)  NOT NULL UNIQUE,
  school_id     INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  staff_id      INTEGER REFERENCES staff(id)   ON DELETE SET NULL,
  doc_type      VARCHAR(100) NOT NULL,
  school_year   VARCHAR(20)  NOT NULL,
  subject       TEXT         NOT NULL,
  remarks       TEXT,
  file_count    INTEGER      DEFAULT 0,
  status        VARCHAR(20)  NOT NULL DEFAULT 'received' CHECK (status IN ('received','review','approved','returned')),
  feedback      TEXT,
  original_ref  VARCHAR(30),
  is_revision   BOOLEAN      DEFAULT FALSE,
  reviewed_by   INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at   TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Uploaded files (metadata only – actual files stored on disk/cloud)
CREATE TABLE IF NOT EXISTS submission_files (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  original_name VARCHAR(255) NOT NULL,
  stored_name   VARCHAR(255) NOT NULL,
  mime_type     VARCHAR(100),
  file_size     BIGINT,
  uploaded_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  type        VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','success','warning')),
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  ref         VARCHAR(30),
  is_read     BOOLEAN      DEFAULT FALSE,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Division notices (broadcast to all schools)
CREATE TABLE IF NOT EXISTS notices (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','warning','success')),
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  target_level VARCHAR(20) DEFAULT 'all' CHECK (target_level IN ('all','kindergarten','elementary','junior','senior')),
  target_school_id INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  created_by  INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Notice view tracking (for campaign read analytics)
CREATE TABLE IF NOT EXISTS notice_views (
  id          SERIAL PRIMARY KEY,
  notice_id   INTEGER REFERENCES notices(id) ON DELETE CASCADE,
  school_id   INTEGER REFERENCES schools(id) ON DELETE CASCADE,
  viewed_by   INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  viewed_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (notice_id, school_id, viewed_by)
);

-- Deadlines
CREATE TABLE IF NOT EXISTS deadlines (
  id          SERIAL PRIMARY KEY,
  doc_type    VARCHAR(100) NOT NULL,
  school_year VARCHAR(20)  NOT NULL,
  deadline    DATE         NOT NULL,
  level       VARCHAR(20)  DEFAULT 'all',
  created_by  INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          SERIAL PRIMARY KEY,
  action      VARCHAR(30)  NOT NULL,
  ref         VARCHAR(30),
  school_id   INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  staff_id    INTEGER REFERENCES staff(id)   ON DELETE SET NULL,
  admin_id    INTEGER REFERENCES admins(id)  ON DELETE SET NULL,
  doc_type    VARCHAR(100),
  remarks     TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Submission templates (per staff)
CREATE TABLE IF NOT EXISTS templates (
  id          SERIAL PRIMARY KEY,
  staff_id    INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  doc_type    VARCHAR(100),
  school_year VARCHAR(20),
  subject     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Admin-configurable data validation rules for submissions
CREATE TABLE IF NOT EXISTS validation_rules (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(50) NOT NULL UNIQUE,
  label         VARCHAR(200) NOT NULL,
  is_enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
  severity      VARCHAR(20)  NOT NULL DEFAULT 'error' CHECK (severity IN ('error','warning')),
  rule_config   JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_by    INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_school    ON submissions(school_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status    ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_staff     ON submissions(staff_id);
CREATE INDEX IF NOT EXISTS idx_submissions_school_submitted_at ON submissions(school_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_status_submitted_at ON submissions(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_school  ON notifications(school_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_school_created_at ON notifications(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action      ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_school          ON staff(school_id);
CREATE INDEX IF NOT EXISTS idx_notices_target_level  ON notices(target_level);
CREATE INDEX IF NOT EXISTS idx_notices_target_school ON notices(target_school_id);
CREATE INDEX IF NOT EXISTS idx_notice_views_notice   ON notice_views(notice_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_validation_rules_code ON validation_rules(code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deadlines_unique
  ON deadlines(doc_type, school_year, deadline, level);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running database migrations...');
    await client.query(schema);
    console.log('✅ Migrations complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
