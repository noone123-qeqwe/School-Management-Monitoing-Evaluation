/* ============================================================
   SMME PORTAL — DATABASE MIGRATION  (v2.0)
   Run: node server/db/migrate.js
   ============================================================ */

require('dotenv').config();
const pool = require('./pool');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    // ── Schools ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id           SERIAL PRIMARY KEY,
        name         TEXT        NOT NULL,
        school_code  VARCHAR(20) NOT NULL UNIQUE,
        level        VARCHAR(20) NOT NULL CHECK (level IN ('kindergarten','elementary','junior','senior')),
        division     TEXT        NOT NULL DEFAULT 'Division of Masbate',
        email        TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Admins ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id          SERIAL PRIMARY KEY,
        username    VARCHAR(50)  NOT NULL UNIQUE,
        full_name   TEXT         NOT NULL,
        position    TEXT,
        division    TEXT,
        email       TEXT,
        password    TEXT         NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── Staff ─────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id          SERIAL PRIMARY KEY,
        school_id   INTEGER      NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        first_name  TEXT         NOT NULL,
        last_name   TEXT         NOT NULL,
        position    TEXT         NOT NULL,
        email       TEXT         NOT NULL,
        password    TEXT         NOT NULL,
        phone       TEXT,
        status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending','approved','rejected')),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE (email, school_id)
      )
    `);

    // ── Submissions ───────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id            SERIAL PRIMARY KEY,
        ref           VARCHAR(50)  NOT NULL UNIQUE,
        school_id     INTEGER      NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
        staff_id      INTEGER      NOT NULL REFERENCES staff(id)   ON DELETE RESTRICT,
        doc_type      TEXT         NOT NULL,
        school_year   VARCHAR(20)  NOT NULL,
        subject       TEXT,
        remarks       TEXT,
        file_count    INTEGER      NOT NULL DEFAULT 0,
        status        VARCHAR(20)  NOT NULL DEFAULT 'received'
                                   CHECK (status IN ('received','under_review','approved','rejected','revision_requested')),
        original_ref  VARCHAR(50),
        is_revision   BOOLEAN      NOT NULL DEFAULT FALSE,
        feedback      TEXT,
        submitted_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── Submission Files ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_files (
        id             SERIAL PRIMARY KEY,
        submission_id  INTEGER  NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        original_name  TEXT     NOT NULL,
        stored_name    TEXT     NOT NULL,
        mime_type      TEXT,
        size_bytes     BIGINT,
        uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Notifications ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id           SERIAL PRIMARY KEY,
        staff_id     INTEGER      REFERENCES staff(id) ON DELETE CASCADE,
        type         VARCHAR(20)  NOT NULL DEFAULT 'info',
        title        TEXT         NOT NULL,
        message      TEXT         NOT NULL,
        is_read      BOOLEAN      NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── Notices (admin broadcast) ─────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id          SERIAL PRIMARY KEY,
        type        VARCHAR(20)  NOT NULL DEFAULT 'info'
                                 CHECK (type IN ('info','warning','success','danger')),
        title       TEXT         NOT NULL,
        message     TEXT         NOT NULL,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── Deadlines ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id           SERIAL PRIMARY KEY,
        doc_type     TEXT         NOT NULL,
        school_year  VARCHAR(20)  NOT NULL,
        deadline     DATE         NOT NULL,
        level        VARCHAR(20)  NOT NULL DEFAULT 'all',
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    // ── Audit Log ─────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        action      TEXT         NOT NULL,
        ref         TEXT,
        actor_id    INTEGER,
        actor_role  VARCHAR(20),
        meta        JSONB,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    console.log('✅ All tables created (or already exist).');
    console.log('\n🎉 Migration complete!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();