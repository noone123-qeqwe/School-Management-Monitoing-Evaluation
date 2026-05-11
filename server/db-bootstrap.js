/**
 * db-bootstrap.js — SMME Portal: Database + Express Application (single-file bundle)
 *
 * Sections (in order):
 *   1.  Mock Pool        — in-memory database for development (MOCK_DB=true)
 *   2.  Pool             — PostgreSQL connection pool (production / real DB)
 *   3.  Seed             — baseline data (schools, admin, staff, deadlines, notices)
 *   4.  App              — Express application, middleware, routes, error handler, startup
 *
 * Environment variables:
 *   DATABASE_URL              PostgreSQL connection string (required unless MOCK_DB=true)
 *   MOCK_DB=true              Use in-memory mock pool instead of PostgreSQL
 *   NODE_ENV                  'production' enables stricter security defaults
 *   PORT                      HTTP port (default: 3000)
 *   JWT_SECRET                Secret used by route handlers for JWT signing
 *   PG_POOL_MAX               Max PostgreSQL pool connections (default: 10)
 *   SMME_ADMIN_USER           Admin username to seed (default: 'admin')
 *   SMME_ADMIN_PASSWORD       Admin password — required in production
 *   SMME_DEMO_STAFF_PASSWORD  Demo staff password (default: 'staff123')
 *   ALLOW_DEMO_SEED=true      Force demo staff seed even in production
 *
 * Test credentials (mock mode):
 *   Admin  → username : admin
 *   Staff  → email    : maria.santos@adventist.edu.ph  |  password: Staff@1234
 */

'use strict';

require('dotenv').config();

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — MOCK POOL
// In-memory database that mirrors the pg.Pool API.
// Active when MOCK_DB=true.  Never used in production.
// ══════════════════════════════════════════════════════════════════════════════

const bcrypt = require('bcryptjs');

// Pre-hash synchronously so credentials are ready before the first request.
const ADMIN_HASH = bcrypt.hashSync('Admin@1234', 10);
const STAFF_HASH = bcrypt.hashSync('Staff@1234', 10);

/** Master school list — shared by both mock pool and seed. */
const SCHOOL_LIST = [
  { id: 1, name: 'Adventist Elementary School-Placer, Inc.', school_code: 'SCH-001', level: 'elementary', division: 'Division of Masbate', email: 'adventistplacer@school.edu.ph' },
  { id: 2, name: 'Aldeper Mission School, Inc.', school_code: 'SCH-002', level: 'elementary', division: 'Division of Masbate', email: 'aldeper@school.edu.ph' },
  { id: 3, name: 'Amazing Progress Learning Center', school_code: 'SCH-003', level: 'elementary', division: 'Division of Masbate', email: 'amazingprogress@school.edu.ph' },
  { id: 4, name: 'Andres Soriano Jr. Memorial School', school_code: 'SCH-004', level: 'elementary', division: 'Division of Masbate', email: 'andressoriano@school.edu.ph' },
  { id: 5, name: 'Blue Angels Learning Center', school_code: 'SCH-005', level: 'kindergarten', division: 'Division of Masbate', email: 'blueangels@school.edu.ph' },
  { id: 6, name: 'Burias College, Inc.', school_code: 'SCH-006', level: 'senior', division: 'Division of Masbate', email: 'buriasc@school.edu.ph' },
  { id: 7, name: 'Christina Rose Elementary School', school_code: 'SCH-007', level: 'elementary', division: 'Division of Masbate', email: 'christinarose@school.edu.ph' },
  { id: 8, name: 'Daughters of St. Joseph Kindergarten School', school_code: 'SCH-008', level: 'kindergarten', division: 'Division of Masbate', email: 'dsjkinder@school.edu.ph' },
  { id: 9, name: "Eden's Christian Academy", school_code: 'SCH-009', level: 'elementary', division: 'Division of Masbate', email: 'edenschristian@school.edu.ph' },
  { id: 10, name: "Eden's Christian Learning Center", school_code: 'SCH-010', level: 'elementary', division: 'Division of Masbate', email: 'edenslearning@school.edu.ph' },
  { id: 11, name: 'G & A Guitierrez Learning Center Inc.', school_code: 'SCH-011', level: 'elementary', division: 'Division of Masbate', email: 'gaguitierrez@school.edu.ph' },
  { id: 12, name: 'Green Meadows Tiny Tots Inc.', school_code: 'SCH-012', level: 'kindergarten', division: 'Division of Masbate', email: 'greenmeadows@school.edu.ph' },
  { id: 13, name: 'Happy Victory School Inc.', school_code: 'SCH-013', level: 'elementary', division: 'Division of Masbate', email: 'happyvictory@school.edu.ph' },
  { id: 14, name: 'Holy Family Parish Learning Center', school_code: 'SCH-014', level: 'elementary', division: 'Division of Masbate', email: 'holyfamily@school.edu.ph' },
  { id: 15, name: 'Holy Name Academy', school_code: 'SCH-015', level: 'junior', division: 'Division of Masbate', email: 'holynameacademy@school.edu.ph' },
  { id: 16, name: 'Immaculate Conception Parish Learning Center', school_code: 'SCH-016', level: 'elementary', division: 'Division of Masbate', email: 'icplc@school.edu.ph' },
  { id: 17, name: 'Institute of the Orient', school_code: 'SCH-017', level: 'senior', division: 'Division of Masbate', email: 'instituteorient@school.edu.ph' },
  { id: 18, name: 'Liceo de Aroroy', school_code: 'SCH-018', level: 'junior', division: 'Division of Masbate', email: 'liceodearoroy@school.edu.ph' },
  { id: 19, name: 'Liceo de Masbate Colleges Inc.', school_code: 'SCH-019', level: 'senior', division: 'Division of Masbate', email: 'liceodemasbate@school.edu.ph' },
  { id: 20, name: 'Liceo de San Jacinto Foundation, Inc.', school_code: 'SCH-020', level: 'junior', division: 'Division of Masbate', email: 'liceosanjacinto@school.edu.ph' },
  { id: 21, name: 'Liceo de San Pedro Calungsod', school_code: 'SCH-021', level: 'junior', division: 'Division of Masbate', email: 'liceosanpedro@school.edu.ph' },
  { id: 22, name: 'Mandaon Christian Academy', school_code: 'SCH-022', level: 'junior', division: 'Division of Masbate', email: 'mandaonchristian@school.edu.ph' },
  { id: 23, name: 'Masbate Central Technical Institute', school_code: 'SCH-023', level: 'senior', division: 'Division of Masbate', email: 'masbatecti@school.edu.ph' },
  { id: 24, name: 'Masbate Colleges Inc.', school_code: 'SCH-024', level: 'senior', division: 'Division of Masbate', email: 'masbatecolleges@school.edu.ph' },
  { id: 25, name: 'Masbate Ikthus Christian School, Inc.', school_code: 'SCH-025', level: 'junior', division: 'Division of Masbate', email: 'masbateikthus@school.edu.ph' },
  { id: 26, name: 'Masbate Institute of Science and Technology, Inc.', school_code: 'SCH-026', level: 'senior', division: 'Division of Masbate', email: 'masbateist@school.edu.ph' },
  { id: 27, name: "Masbate Learning is Fun Children's Center, Inc.", school_code: 'SCH-027', level: 'kindergarten', division: 'Division of Masbate', email: 'masbatelearning@school.edu.ph' },
  { id: 28, name: 'Masbate Polytechnic and Development College', school_code: 'SCH-028', level: 'senior', division: 'Division of Masbate', email: 'masbatepoly@school.edu.ph' },
  { id: 29, name: 'Masbate Southeastern Institute, Inc.', school_code: 'SCH-029', level: 'junior', division: 'Division of Masbate', email: 'masbatesoutheast@school.edu.ph' },
  { id: 30, name: 'Osmeña Colleges', school_code: 'SCH-030', level: 'senior', division: 'Division of Masbate', email: 'osmenacolleges@school.edu.ph' },
  { id: 31, name: 'Ovilla Technical College', school_code: 'SCH-031', level: 'senior', division: 'Division of Masbate', email: 'ovillatechcollege@school.edu.ph' },
  { id: 32, name: 'San Rafael SDA Multigrade School', school_code: 'SCH-032', level: 'elementary', division: 'Division of Masbate', email: 'sanrafaelsda@school.edu.ph' },
  { id: 33, name: 'Southern Bicol Colleges', school_code: 'SCH-033', level: 'senior', division: 'Division of Masbate', email: 'southernbicol@school.edu.ph' },
  { id: 34, name: 'St. Anthony High School Seminary', school_code: 'SCH-034', level: 'junior', division: 'Division of Masbate', email: 'stanthonyseminary@school.edu.ph' },
  { id: 35, name: 'St. Bernard of Clairvaux Mission School', school_code: 'SCH-035', level: 'elementary', division: 'Division of Masbate', email: 'stbernard@school.edu.ph' },
  { id: 36, name: 'St. Raphael the Archangel Diocesan School', school_code: 'SCH-036', level: 'junior', division: 'Division of Masbate', email: 'straphael@school.edu.ph' },
  { id: 37, name: 'Tunog SDA Multigrade School', school_code: 'SCH-037', level: 'elementary', division: 'Division of Masbate', email: 'tunogsda@school.edu.ph' },
  { id: 38, name: 'Yadah Christian School Inc.', school_code: 'SCH-038', level: 'elementary', division: 'Division of Masbate', email: 'yadahchristian@school.edu.ph' },
];

/** Mutable in-memory store (reset on each process start). */
const db = {
  schools: SCHOOL_LIST,
  admins: [
    {
      id: 1,
      username: 'admin',
      full_name: 'Division Administrator',
      position: 'Education Program Supervisor',
      division: 'Division of Masbate',
      email: 'admin@deped-masbate.gov.ph',
      password: ADMIN_HASH,
      created_at: new Date().toISOString(),
    },
  ],
  staff: [
    {
      id: 1, school_id: 12,
      first_name: 'Maria', last_name: 'Santos',
      position: 'School Registrar',
      email: 'maria.santos@adventist.edu.ph',
      password: STAFF_HASH, status: 'approved', phone: null,
      created_at: new Date().toISOString(),
      // Denormalised school fields (mirrors the real JOIN query)
      school_name: 'Green Meadows Tiny Tots Inc.',
      school_level: 'kindergarten', school_code: 'SCH-012',
      division: 'Division of Masbate',
    },
  ],
  submissions: [], submission_files: [],
  notifications: [], audit_log: [],
  notices: [
    { id: 1, type: 'info', title: 'Deadline Reminder', message: 'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.', created_at: new Date().toISOString() },
    { id: 2, type: 'warning', title: 'System Maintenance', message: 'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.', created_at: new Date().toISOString() },
  ],
  deadlines: [
    { id: 1, doc_type: 'Enrollment Report', school_year: '2026-2027', deadline: '2026-06-15', level: 'all', created_at: new Date().toISOString() },
    { id: 2, doc_type: 'Faculty Credentials', school_year: '2026-2027', deadline: '2026-07-01', level: 'all', created_at: new Date().toISOString() },
    { id: 3, doc_type: 'Compliance Requirements', school_year: '2026-2027', deadline: '2026-06-30', level: 'all', created_at: new Date().toISOString() },
    { id: 4, doc_type: 'Financial Reports', school_year: '2025-2026', deadline: '2026-05-31', level: 'all', created_at: new Date().toISOString() },
  ],
};

const counters = { staff: 2, submissions: 1 };
const nextId = (table) => counters[table]++;

/** Returns denormalised school fields for a given school id. */
function schoolFields(schoolId) {
  const s = db.schools.find(x => String(x.id) === String(schoolId));
  return s
    ? { school_name: s.name, school_level: s.level, school_code: s.school_code, division: s.division }
    : { school_name: '', school_level: '', school_code: '', division: '' };
}

class MockPool {
  async query(sql, params = []) {
    const q = sql.trim().toUpperCase();

    // Health check
    if (q === 'SELECT 1') return { rows: [{ '?column?': 1 }] };

    // Information schema (startup table-existence check)
    if (q.includes('INFORMATION_SCHEMA')) return { rows: [{ table_name: 'mock_tables' }] };

    // ── SCHOOLS ───────────────────────────────────────────────────────────────
    if (q.includes('FROM SCHOOLS') || q.includes('INTO SCHOOLS')) {
      if (q.includes('COUNT(*)')) return { rows: [{ count: String(db.schools.length) }] };
      if (q.startsWith('SELECT')) {
        if (params.length === 1) {
          const row = db.schools.find(s => String(s.id) === String(params[0]) || s.school_code === params[0]);
          return { rows: row ? [row] : [] };
        }
        return { rows: db.schools };
      }
    }

    // ── ADMINS ────────────────────────────────────────────────────────────────
    if (q.includes('FROM ADMINS') && q.startsWith('SELECT')) {
      // FIX 1 — also match by email so email-based login queries work
      const p0 = String(params[0] || '').toLowerCase();
      const row = db.admins.find(a => (a.username || '').toLowerCase() === p0 || (a.email || '').toLowerCase() === p0);
      return { rows: row ? [row] : [] };
    }

    // ── STAFF ─────────────────────────────────────────────────────────────────
    if (q.includes('STAFF')) {
      if (q.includes('COUNT(*)')) return { rows: [{ count: String(db.staff.filter(s => s.status === 'pending').length) }] };

      if (q.startsWith('SELECT')) {
        // JOIN query (login)
        if (q.includes('JOIN SCHOOLS') || q.includes('LEFT JOIN SCHOOLS')) {
          const email = params[0];
          const row = db.staff.find(s => (s.email || '').toLowerCase() === (email || '').toLowerCase());
          return { rows: row ? [row] : [] };
        }
        if (params.length === 1) { const row = db.staff.find(s => String(s.id) === String(params[0])); return { rows: row ? [row] : [] }; }
        if (params.length === 2) {
          const [email, schoolId] = params;
          const row = db.staff.find(s => s.email === (email || '').toLowerCase() && String(s.school_id) === String(schoolId));
          return { rows: row ? [row] : [] };
        }
        return { rows: db.staff };
      }

      if (q.startsWith('INSERT')) {
        const [schoolId, firstName, lastName, position, email, password, status] = params;
        const newStaff = {
          id: nextId('staff'), school_id: schoolId ? parseInt(schoolId, 10) : null,
          first_name: firstName, last_name: lastName, position,
          email: (email || '').toLowerCase(), password,
          status: status || 'pending', phone: null,
          created_at: new Date().toISOString(),
          ...schoolFields(schoolId),
        };
        db.staff.push(newStaff);
        return { rows: [newStaff] };
      }

      if (q.startsWith('UPDATE')) return { rows: [] };
    }

    // ── SUBMISSIONS ───────────────────────────────────────────────────────────
    if (q.includes('SUBMISSIONS')) {
      if (q.includes('COUNT(*)')) return { rows: [{ count: String(db.submissions.length) }] };
      if (q.startsWith('SELECT')) return { rows: db.submissions };
      if (q.startsWith('INSERT')) {
        const [ref, schoolId, staffId, docType, schoolYear, subject, remarks, fileCount, originalRef, isRevision] = params;
        const newSub = {
          id: nextId('submissions'), ref, school_id: schoolId, staff_id: staffId,
          doc_type: docType, school_year: schoolYear, subject, remarks,
          file_count: fileCount, status: 'received',
          original_ref: originalRef || null, is_revision: isRevision || false,
          submitted_at: new Date().toISOString(), feedback: null,
        };
        db.submissions.push(newSub);
        return { rows: [newSub] };
      }
      if (q.startsWith('UPDATE')) return { rows: [] };
    }

    // ── SUBMISSION FILES ──────────────────────────────────────────────────────
    if (q.includes('SUBMISSION_FILES') || q.includes('SUBMISSION FILES')) {
      if (q.startsWith('INSERT')) db.submission_files.push({ id: Date.now() });
      return { rows: db.submission_files };
    }

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    if (q.includes('NOTIFICATIONS')) {
      if (q.startsWith('SELECT')) return { rows: db.notifications };
      if (q.startsWith('INSERT')) { db.notifications.push({ id: Date.now(), created_at: new Date().toISOString() }); return { rows: [] }; }
      return { rows: [] };
    }

    // ── NOTICES ───────────────────────────────────────────────────────────────
    if (q.includes('NOTICES')) {
      if (q.startsWith('SELECT')) return { rows: db.notices };
      if (q.startsWith('INSERT')) {
        const n = { id: Date.now(), type: params[0], title: params[1], message: params[2], created_at: new Date().toISOString() };
        db.notices.unshift(n);
        return { rows: [n] };
      }
      if (q.startsWith('DELETE')) { db.notices = db.notices.filter(n => String(n.id) !== String(params[0])); return { rows: [] }; }
    }

    // ── DEADLINES ─────────────────────────────────────────────────────────────
    if (q.includes('DEADLINES')) {
      if (q.startsWith('SELECT')) return { rows: db.deadlines };
      if (q.startsWith('INSERT')) {
        const d = { id: Date.now(), doc_type: params[0], school_year: params[1], deadline: params[2], level: params[3] || 'all', created_at: new Date().toISOString() };
        db.deadlines.push(d);
        return { rows: [d] };
      }
      if (q.startsWith('DELETE')) { db.deadlines = db.deadlines.filter(d => String(d.id) !== String(params[0])); return { rows: [] }; }
    }

    // ── AUDIT LOG ─────────────────────────────────────────────────────────────
    if (q.includes('AUDIT_LOG') || q.includes('AUDIT LOG')) {
      if (q.startsWith('INSERT')) db.audit_log.unshift({ id: Date.now(), action: params[0], ref: params[1], created_at: new Date().toISOString() });
      return { rows: db.audit_log };
    }

    // Unhandled — surface in dev so gaps are visible immediately
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[MockPool] Unhandled query (returning []):\n  ', sql.substring(0, 120));
    }
    return { rows: [] };
  }

  async connect() {
    return { query: (sql, p) => this.query(sql, p), release: () => { } };
  }
  on(_e, _cb) { /* no-op: mirrors pg Pool event API */ }
  async end() { /* no-op */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — POOL
// Returns MockPool when MOCK_DB=true, otherwise creates a real pg.Pool.
// ══════════════════════════════════════════════════════════════════════════════

let pool;

if (process.env.MOCK_DB === 'true') {
  console.log('[pool] MOCK_DB=true — using in-memory MockPool.');
  pool = new MockPool();
} else {
  if (!process.env.DATABASE_URL) {
    console.error('\n❌  FATAL: DATABASE_URL is not set.');
    console.error('    Add it to your .env file (local) or Render environment variables.\n');
    process.exit(1);
  }

  const { Pool } = require('pg');
  const isProduction = process.env.NODE_ENV === 'production';

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: parseInt(process.env.PG_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') console.log('[pool] New PostgreSQL client connected.');
  });

  pool.on('error', (err) => {
    console.error('[pool] Unexpected idle-client error:', err.message);
  });

  console.log(`[pool] Connecting to PostgreSQL… (${process.env.DATABASE_URL.substring(0, 35)}…)`);
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — SEED
// Idempotent — safe to run multiple times; all inserts use conflict guards.
// ══════════════════════════════════════════════════════════════════════════════

const DEADLINES_DATA = [
  ['Enrollment Report', '2026-2027', '2026-06-15', 'all'],
  ['Faculty Credentials', '2026-2027', '2026-07-01', 'all'],
  ['Compliance Requirements', '2026-2027', '2026-06-30', 'all'],
  ['Financial Reports', '2025-2026', '2026-05-31', 'all'],
];

const NOTICES_DATA = [
  ['info', 'Deadline Reminder', 'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.'],
  ['warning', 'System Maintenance', 'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.'],
  ['success', 'New Document Type Added', 'You can now submit TVL Strand Offerings directly through the portal.'],
];

async function seed() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.ALLOW_DEMO_SEED === 'true';
  const adminUser = process.env.SMME_ADMIN_USER || 'admin';
  const adminPass = process.env.SMME_ADMIN_PASSWORD;
  const demoStaffPw = process.env.SMME_DEMO_STAFF_PASSWORD || 'Staff@1234';

  const client = await pool.connect();
  try {
    console.log('\n🌱  Seeding database…\n');

    // 1. Schools
    console.log('   Seeding schools…');
    for (const s of SCHOOL_LIST) {
      await client.query(
        `INSERT INTO schools (name, school_code, level, division, email)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (school_code) DO NOTHING`,
        [s.name, s.school_code, s.level, s.division, s.email]
      );
    }
    console.log(`   ✅  ${SCHOOL_LIST.length} schools seeded (duplicates skipped).`);

    // 2. Admin account
    const canSeedAdmin = !isProd || Boolean(adminPass);
    if (canSeedAdmin) {
      if (!adminPass) console.warn('   ⚠️   No SMME_ADMIN_PASSWORD — using insecure default. Set it before going live!');
      const hash = await bcrypt.hash(adminPass || 'Admin@1234', 12);
      // FIX 2 — DO UPDATE so a re-run always corrects a stale/wrong password
      await client.query(
        `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (username) DO UPDATE SET password = EXCLUDED.password`,
        [adminUser, 'Division Administrator', 'Education Program Supervisor', 'Division of Masbate', 'admin@deped-masbate.gov.ph', hash]
      );
      console.log(`   ✅  Admin account seeded/updated (username: ${adminUser}).`);
    } else {
      console.log('   ⚠️   Admin seed skipped in production — set SMME_ADMIN_PASSWORD to enable.');
    }

    // 3. Demo staff (dev / explicit opt-in only)
    if (!isProd || allowDemo) {
      const { rows } = await client.query(`SELECT id FROM schools WHERE school_code = 'SCH-012'`);
      if (rows.length > 0) {
        const sid = rows[0].id;
        const hash = await bcrypt.hash(demoStaffPw, 12);
        for (const [first, last, position, email] of [
          ['Maria', 'Santos', 'School Registrar', 'maria.santos@adventist.edu.ph'],
          ['Jose', 'Reyes', 'School Principal', 'jose.reyes@adventist.edu.ph'],
        ]) {
          // FIX 3 — DO UPDATE so a re-run always corrects stale staff passwords
          await client.query(
            `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
             VALUES ($1,$2,$3,$4,$5,$6,'approved')
             ON CONFLICT (email, school_id) DO UPDATE SET password = EXCLUDED.password, status = 'approved'`,
            [sid, first, last, position, email, hash]
          );
          // Also update if staff exists under a different school
          await client.query(
            `UPDATE staff SET school_id=$1, password=$2, status='approved'
             WHERE email=$3 AND school_id != $1`,
            [sid, hash, email]
          );
        }
        console.log('   ✅  Demo staff seeded.');
      } else {
        console.warn('   ⚠️   SCH-012 not found — demo staff skipped.');
      }
    } else {
      console.log('   ℹ️   Demo staff skipped in production (set ALLOW_DEMO_SEED=true to override).');
    }

    // 4. Deadlines
    for (const [docType, schoolYear, deadline, level] of DEADLINES_DATA) {
      await client.query(
        `INSERT INTO deadlines (doc_type, school_year, deadline, level)
         SELECT $1,$2,$3,$4 WHERE NOT EXISTS (
           SELECT 1 FROM deadlines WHERE doc_type=$1 AND school_year=$2 AND deadline=$3 AND level=$4
         )`,
        [docType, schoolYear, deadline, level]
      );
    }
    console.log(`   ✅  ${DEADLINES_DATA.length} deadlines seeded.`);

    // 5. Notices
    for (const [type, title, message] of NOTICES_DATA) {
      await client.query(
        `INSERT INTO notices (type, title, message)
         SELECT $1,$2,$3 WHERE NOT EXISTS (SELECT 1 FROM notices WHERE title=$2)`,
        [type, title, message]
      );
    }
    console.log(`   ✅  ${NOTICES_DATA.length} notices seeded.`);

    console.log('\n🎉  Database seeded successfully!\n');
  } catch (err) {
    console.error('\n❌  Seed failed:', err.message);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
    throw err;
  } finally {
    client.release();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — EXPRESS APPLICATION
// ══════════════════════════════════════════════════════════════════════════════

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Route modules
const authRoutes = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

const fs = require('fs');
const STATIC_ROOT_CANDIDATES = [
  path.join(__dirname, '../codes'),
  path.join(__dirname, '../public'),
  path.join(__dirname, '../../codes'),
  path.join(__dirname, '../../Files/codes'),
];
// FIX 4 — pick the first candidate that actually exists on disk
const STATIC_ROOT = STATIC_ROOT_CANDIDATES.find(p => { try { return fs.existsSync(path.join(p, 'index.html')); } catch { return false; } })
  || path.join(__dirname, '../codes'); // safe fallback (express.static handles missing gracefully)
const LANDING_PAGE = path.join(STATIC_ROOT, 'index.html');
const ASSET_RE = /\.(html|js|css|png|jpe?g|gif|ico|svg|woff2?|ttf|eot|map)$/i;

// ── Trust proxy (required on Render / reverse-proxy hosts) ───────────────────
app.set('trust proxy', 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: isProd ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
}));

app.use((_req, res, next) => { res.removeHeader('X-Powered-By'); next(); });

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: isProd ? false : 'http://localhost:3000',
  credentials: true,
}));

// ── Rate limiters ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 100,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
  skip: (req) => !req.path.startsWith('/api'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes before trying again.' },
  skipSuccessfulRequests: true,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 20,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Upload limit reached. Please try again in an hour.' },
});

app.use(generalLimiter);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Apply tiered limiters before route handlers ───────────────────────────────
app.use('/api/auth/staff/login', authLimiter);
app.use('/api/auth/admin/login', authLimiter);
app.use('/api/auth/staff/register', authLimiter);
app.use('/api/submissions', (req, res, next) => {
  // Only apply the strict 20/hr upload limiter to the actual file submission endpoint, not smart validations or comments
  if (req.method === 'POST' && (req.path === '/' || req.path === '')) {
    return uploadLimiter(req, res, next);
  }
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ── Static files ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  if (req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.get('/pages/:page', (req, res) => res.redirect(301, `/html/${req.params.page}`));
app.use(express.static(STATIC_ROOT, { maxAge: isProd ? '1d' : 0, etag: true }));
app.get('/', (req, res, next) => res.sendFile(LANDING_PAGE, err => { if (err) next(err); }));

// ── SPA fallback ──────────────────────────────────────────────────────────────
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || ASSET_RE.test(req.path)) return next();
  res.sendFile(LANDING_PAGE, err => { if (err) next(err); });
});

// ── Catch-all for undefined API routes ────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${err.message}`);
  if (res.headersSent) return _next(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File exceeds the 100 MB size limit.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
  res.status(err.status || 500).json({
    error: isProd ? 'An unexpected error occurred. Please try again.' : err.message,
  });
});

// ── Startup routine ───────────────────────────────────────────────────────────
async function onServerStart() {
  console.log(`\n🚀  SMME Portal running on port ${PORT}`);
  console.log(`    Environment  : ${process.env.NODE_ENV || 'development'}`);
  console.log(`    DATABASE_URL : ${process.env.DATABASE_URL ? '✅ set' : '❌ NOT SET'}`);
  console.log(`    JWT_SECRET   : ${process.env.JWT_SECRET ? '✅ set' : '❌ NOT SET'}`);
  console.log(`    MOCK_DB      : ${process.env.MOCK_DB === 'true' ? 'true (no PostgreSQL)' : 'false'}`);

  try {
    await pool.query('SELECT 1');
    console.log('✅  Database connection successful.');

    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    const rootDir = path.join(__dirname, '..');

    const { rows: tables } = await pool.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableNames = tables.map(r => r.table_name);

    if (tableNames.length === 0) {
      console.log('⚠️   No tables found — running migrations and seed…');
      try {
        // FIX 7 — use async exec so the event loop is never blocked during startup
        await execAsync('node server/db/migrate.js', { cwd: rootDir });
        await execAsync('node server/db/seed.js', { cwd: rootDir });
        console.log('✅  Auto-migration complete.');
      } catch (migErr) {
        console.error('❌  Auto-migration failed:', migErr.message);
      }
      return;
    }

    console.log('    Tables found :', tableNames.join(', '));

    if (isProd) {
      console.log('ℹ️   Production mode: automatic seed update disabled.');
      return;
    }

    // Re-seed if schools list is outdated
    try {
      const { rows } = await pool.query('SELECT COUNT(*) FROM schools');
      if (parseInt(rows[0].count, 10) < 38) {
        console.log('⚠️   School list outdated — re-seeding…');
        await execAsync('node server/db/seed.js', { cwd: rootDir });
        console.log('✅  Schools re-seeded.');
      }
    } catch { /* schools table may not exist yet */ }

  } catch (err) {
    console.error('❌  Database connection FAILED:', err.message);
  }
}

// ── Entry-point guard ─────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, onServerStart);
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown() {
  console.log('\n🛑 Received kill signal, shutting down gracefully...');
  pool.end().then(() => {
    console.log('✅ PostgreSQL pool closed.');
    process.exit(0);
  }).catch(() => process.exit(1));
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// ── Exports ───────────────────────────────────────────────────────────────────
module.exports = { app, onServerStart, pool, seed, MockPool, db };