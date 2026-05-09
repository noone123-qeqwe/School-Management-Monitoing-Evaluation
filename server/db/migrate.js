'use strict';
/**
 * server/db/migrate.js
 * Creates all database tables if they don't already exist.
 * Safe to run multiple times (uses CREATE TABLE IF NOT EXISTS).
 */

require('dotenv').config();

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
        password   TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
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
        submitted_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  submissions');

    await client.query(`
      CREATE TABLE IF NOT EXISTS submission_files (
        id            SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
        filename      TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mimetype      TEXT,
        size          BIGINT,
        uploaded_at   TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  submission_files');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id         SERIAL PRIMARY KEY,
        staff_id   INTEGER REFERENCES staff(id) ON DELETE CASCADE,
        message    TEXT NOT NULL,
        is_read    BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  notifications');

    await client.query(`
      CREATE TABLE IF NOT EXISTS notices (
        id         SERIAL PRIMARY KEY,
        type       TEXT NOT NULL DEFAULT 'info',
        title      TEXT NOT NULL,
        message    TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  notices');

    await client.query(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id          SERIAL PRIMARY KEY,
        doc_type    TEXT NOT NULL,
        school_year TEXT NOT NULL,
        deadline    DATE NOT NULL,
        level       TEXT NOT NULL DEFAULT 'all',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  deadlines');

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id         SERIAL PRIMARY KEY,
        action     TEXT NOT NULL,
        ref        TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('   ✅  audit_log');

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
