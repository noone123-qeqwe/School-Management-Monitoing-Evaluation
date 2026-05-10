'use strict';
/**
 * server/db/pool.js
 * Exports a pg-compatible pool instance.
 *
 * MOCK_DB=true  → in-memory MockPool (no PostgreSQL needed)
 * otherwise     → real pg.Pool using DATABASE_URL
 */

require('dotenv').config();

// ── MOCK POOL ────────────────────────────────────────────────────────────────
const bcrypt = require('bcryptjs');

const ADMIN_HASH = bcrypt.hashSync('Admin@1234', 10);
const STAFF_HASH = bcrypt.hashSync('Staff@1234', 10);

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

const db = {
  schools: SCHOOL_LIST,
  admins: [
    {
      id: 1, username: 'admin', full_name: 'Division Administrator',
      position: 'Education Program Supervisor', division: 'Division of Masbate',
      email: 'admin@deped-masbate.gov.ph', password: ADMIN_HASH,
      created_at: new Date().toISOString(),
    },
  ],
  staff: [
    {
      id: 1, school_id: 12, first_name: 'Maria', last_name: 'Santos',
      position: 'School Registrar', email: 'maria.santos@greenmeadows.edu.ph', // Domain updated to match school ID 12
      password: STAFF_HASH, status: 'approved', phone: null,
      created_at: new Date().toISOString(),
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

function schoolFields(schoolId) {
  const s = db.schools.find(x => String(x.id) === String(schoolId));
  return s
    ? { school_name: s.name, school_level: s.level, school_code: s.school_code, division: s.division }
    : { school_name: '', school_level: '', school_code: '', division: '' };
}

class MockPool {
  async query(sql, params = []) {
    const q = sql.trim().toUpperCase();

    if (q === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
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

    if (q.includes('FROM ADMINS') && q.startsWith('SELECT')) {
      const identifier = params[0];
      const row = db.admins.find(a =>
        a.username === identifier || a.email === identifier
      );
      return { rows: row ? [row] : [] };
    }
    // ── STAFF ─────────────────────────────────────────────────────────────────
    if (q.includes('STAFF')) {
      if (q.includes('COUNT(*)')) return { rows: [{ count: String(db.staff.filter(s => s.status === 'pending').length) }] };

      if (q.startsWith('SELECT')) {
        if (q.includes('JOIN SCHOOLS')) {
          const [email, schoolId] = params;
          const row = db.staff.find(s => s.email === (email || '').toLowerCase() && String(s.school_id) === String(schoolId));
          return { rows: row ? [row] : [] };
        }
        if (params.length === 1) {
          const row = db.staff.find(s => String(s.id) === String(params[0]));
          return { rows: row ? [row] : [] };
        }
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
          id: nextId('staff'), school_id: parseInt(schoolId, 10),
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

    if (process.env.NODE_ENV !== 'test') {
      console.warn('[MockPool] Unhandled query (returning []):\n  ', sql.substring(0, 120));
    }
    return { rows: [] };
  }

  async connect() {
    return { query: (sql, p) => this.query(sql, p), release: () => { } };
  }
  on(_e, _cb) { }
  async end() { }
}

// ── POOL SELECTION ────────────────────────────────────────────────────────────
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

module.exports = pool;
