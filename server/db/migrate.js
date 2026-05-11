'use strict';
/**
 * server/db/migrate.js
 * Creates all database tables if they don't already exist.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */

try { require('dotenv').config(); } catch {}

const { Pool } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const client = await pool.connect();
  try {
    console.log('\n🔧  Running migrations…\n');

    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id          SERIAL PRIMARY KEY,
        name        TEXT NOT NULL,
        school_code TEXT NOT NULL UNIQUE,
        level       TEXT NOT NULL,
        division    TEXT NOT NULL,
        email       TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  schools');

    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id         SERIAL PRIMARY KEY,
        username   TEXT NOT NULL UNIQUE,
        full_name  TEXT NOT NULL,
        position   TEXT,
        division   TEXT,
        email      TEXT,
        phone      TEXT,
        password   TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add phone column if it doesn't exist (for existing databases)
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone TEXT;
    `).catch(() => {});
    console.log('   ✅  admins');

    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id         SERIAL PRIMARY KEY,
        school_id  INTEGER NOT NULL REFERENCES schools(id),
        first_name TEXT NOT NULL,
        last_name  TEXT NOT NULL,
        position   TEXT NOT NULL,
        email      TEXT NOT NULL,
        password   TEXT NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending',
        phone      TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (email, school_id)
      );
    `);
    console.log('   ✅  staff');

    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id           SERIAL PRIMARY KEY,
        ref          TEXT NOT NULL UNIQUE,
        school_id    INTEGER NOT NULL REFERENCES schools(id),
        staff_id     INTEGER NOT NULL REFERENCES staff(id),
        doc_type     TEXT NOT NULL,
        school_year  TEXT NOT NULL,
        subject      TEXT,
        remarks      TEXT,
        file_count   INTEGER DEFAULT 0,
        status       TEXT NOT NULL DEFAULT 'received',
        feedback     TEXT,
        original_ref TEXT,
        is_revision  BOOLEAN DEFAULT FALSE,
        reviewed_by  INTEGER REFERENCES admins(id),
        reviewed_at  TIMESTAMPTZ,
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add columns for existing databases
    await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES admins(id);`).catch(() => {});
    await client.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;`).catch(() => {});
    console.log('   ✅  submissions');

    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_files (
        id            SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        original_name TEXT NOT NULL,
        stored_name   TEXT NOT NULL,
        mime_type     TEXT,
        file_size     BIGINT,
        uploaded_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  submission_files');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        school_id  INTEGER REFERENCES schools(id) ON DELETE CASCADE,
        staff_id   INTEGER REFERENCES staff(id) ON DELETE CASCADE,
        type       TEXT NOT NULL DEFAULT 'info',
        title      TEXT,
        message    TEXT NOT NULL,
        ref        TEXT,
        is_read    BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add columns for existing databases
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);`).catch(() => {});
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';`).catch(() => {});
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref TEXT;`).catch(() => {});
    console.log('   ✅  notifications');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id               SERIAL PRIMARY KEY,
        type             TEXT NOT NULL DEFAULT 'info',
        title            TEXT NOT NULL,
        message          TEXT NOT NULL,
        target_level     TEXT NOT NULL DEFAULT 'all',
        target_school_id INTEGER REFERENCES schools(id),
        created_by       INTEGER REFERENCES admins(id),
        created_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add columns for existing databases
    await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS target_level TEXT DEFAULT 'all';`).catch(() => {});
    await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS target_school_id INTEGER REFERENCES schools(id);`).catch(() => {});
    await client.query(`ALTER TABLE notices ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id);`).catch(() => {});
    console.log('   ✅  notices');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notice_views (
        id         SERIAL PRIMARY KEY,
        notice_id  INTEGER NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
        school_id  INTEGER NOT NULL REFERENCES schools(id),
        viewed_by  INTEGER NOT NULL REFERENCES staff(id),
        viewed_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (notice_id, school_id, viewed_by)
      );
    `);
    console.log('   ✅  notice_views');

    await client.query(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id          SERIAL PRIMARY KEY,
        doc_type    TEXT NOT NULL,
        school_year TEXT NOT NULL,
        deadline    DATE NOT NULL,
        level       TEXT NOT NULL DEFAULT 'all',
        created_by  INTEGER REFERENCES admins(id),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add column for existing databases
    await client.query(`ALTER TABLE deadlines ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES admins(id);`).catch(() => {});
    console.log('   ✅  deadlines');

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id         SERIAL PRIMARY KEY,
        action     TEXT NOT NULL,
        ref        TEXT,
        school_id  INTEGER REFERENCES schools(id),
        staff_id   INTEGER REFERENCES staff(id),
        admin_id   INTEGER REFERENCES admins(id),
        doc_type   TEXT,
        remarks    TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    // Add columns for existing databases
    await client.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS school_id INTEGER REFERENCES schools(id);`).catch(() => {});
    await client.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES staff(id);`).catch(() => {});
    await client.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id);`).catch(() => {});
    await client.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS doc_type TEXT;`).catch(() => {});
    await client.query(`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS remarks TEXT;`).catch(() => {});
    console.log('   ✅  audit_log');

    await client.query(`
      CREATE TABLE IF NOT EXISTS validation_rules (
        id          SERIAL PRIMARY KEY,
        code        TEXT NOT NULL UNIQUE,
        label       TEXT NOT NULL,
        severity    TEXT NOT NULL DEFAULT 'error',
        is_enabled  BOOLEAN DEFAULT TRUE,
        rule_config JSONB DEFAULT '{}',
        updated_by  INTEGER REFERENCES admins(id),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  validation_rules');

    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_comments (
        id                SERIAL PRIMARY KEY,
        submission_id     INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        author_role       TEXT NOT NULL,
        author_staff_id   INTEGER REFERENCES staff(id),
        author_admin_id   INTEGER REFERENCES admins(id),
        body              TEXT NOT NULL,
        created_at        TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_submission_comments_sub ON submission_comments(submission_id);`);
    console.log('   ✅  submission_comments');

    console.log('\n🎉  Migrations complete!\n');
  } catch (err) {
    console.error('\n❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
