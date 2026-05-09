// Mock database pool for development without PostgreSQL
// Test credentials:  admin / Admin@1234   |   staff: maria.santos@adventist.edu.ph / Staff@1234
const bcrypt = require('bcryptjs');

// Hashes generated synchronously so they are ready before any request arrives
const ADMIN_HASH = bcrypt.hashSync('Admin@1234', 10);
const STAFF_HASH = bcrypt.hashSync('Staff@1234', 10);
console.log('Mock pool: password hashes ready (sync)');
console.log('  Admin  — username: admin | password: Admin@1234');
console.log('  School — email: maria.santos@adventist.edu.ph | password: Staff@1234');

const mockData = {
  schools: [
    { id:  1, name: 'Adventist Elementary School-Placer, Inc.',            school_code: 'SCH-001', level: 'elementary',   division: 'Division of Masbate' },
    { id:  2, name: 'Aldeper Mission School, Inc.',                        school_code: 'SCH-002', level: 'elementary',   division: 'Division of Masbate' },
    { id:  3, name: 'Amazing Progress Learning Center',                    school_code: 'SCH-003', level: 'elementary',   division: 'Division of Masbate' },
    { id:  4, name: 'Andres Soriano Jr. Memorial School',                  school_code: 'SCH-004', level: 'elementary',   division: 'Division of Masbate' },
    { id:  5, name: 'Blue Angels Learning Center',                         school_code: 'SCH-005', level: 'kindergarten', division: 'Division of Masbate' },
    { id:  6, name: 'Burias College, Inc.',                                school_code: 'SCH-006', level: 'senior',       division: 'Division of Masbate' },
    { id:  7, name: 'Christina Rose Elementary School',                    school_code: 'SCH-007', level: 'elementary',   division: 'Division of Masbate' },
    { id:  8, name: 'Daughters of St. Joseph Kindergarten School',         school_code: 'SCH-008', level: 'kindergarten', division: 'Division of Masbate' },
    { id:  9, name: "Eden's Christian Academy",                            school_code: 'SCH-009', level: 'elementary',   division: 'Division of Masbate' },
    { id: 10, name: "Eden's Christian Learning Center",                    school_code: 'SCH-010', level: 'elementary',   division: 'Division of Masbate' },
    { id: 11, name: 'G & A Guitierrez Learning Center Inc.',               school_code: 'SCH-011', level: 'elementary',   division: 'Division of Masbate' },
    { id: 12, name: 'Green Meadows Tiny Tots Inc.',                        school_code: 'SCH-012', level: 'kindergarten', division: 'Division of Masbate' },
    { id: 13, name: 'Happy Victory School Inc.',                           school_code: 'SCH-013', level: 'elementary',   division: 'Division of Masbate' },
    { id: 14, name: 'Holy Family Parish Learning Center',                  school_code: 'SCH-014', level: 'elementary',   division: 'Division of Masbate' },
    { id: 15, name: 'Holy Name Academy',                                   school_code: 'SCH-015', level: 'junior',       division: 'Division of Masbate' },
    { id: 16, name: 'Immaculate Conception Parish Learning Center',        school_code: 'SCH-016', level: 'elementary',   division: 'Division of Masbate' },
    { id: 17, name: 'Institute of the Orient',                             school_code: 'SCH-017', level: 'senior',       division: 'Division of Masbate' },
    { id: 18, name: 'Liceo de Aroroy',                                     school_code: 'SCH-018', level: 'junior',       division: 'Division of Masbate' },
    { id: 19, name: 'Liceo de Masbate Colleges Inc.',                      school_code: 'SCH-019', level: 'senior',       division: 'Division of Masbate' },
    { id: 20, name: 'Liceo de San Jacinto Foundation, Inc.',               school_code: 'SCH-020', level: 'junior',       division: 'Division of Masbate' },
    { id: 21, name: 'Liceo de San Pedro Calungsod',                        school_code: 'SCH-021', level: 'junior',       division: 'Division of Masbate' },
    { id: 22, name: 'Mandaon Christian Academy',                           school_code: 'SCH-022', level: 'junior',       division: 'Division of Masbate' },
    { id: 23, name: 'Masbate Central Technical Institute',                 school_code: 'SCH-023', level: 'senior',       division: 'Division of Masbate' },
    { id: 24, name: 'Masbate Colleges Inc.',                               school_code: 'SCH-024', level: 'senior',       division: 'Division of Masbate' },
    { id: 25, name: 'Masbate Ikthus Christian School, Inc.',               school_code: 'SCH-025', level: 'junior',       division: 'Division of Masbate' },
    { id: 26, name: 'Masbate Institute of Science and Technology, Inc.',   school_code: 'SCH-026', level: 'senior',       division: 'Division of Masbate' },
    { id: 27, name: "Masbate Learning is Fun Children's Center, Inc.",     school_code: 'SCH-027', level: 'kindergarten', division: 'Division of Masbate' },
    { id: 28, name: 'Masbate Polytechnic and Development College',         school_code: 'SCH-028', level: 'senior',       division: 'Division of Masbate' },
    { id: 29, name: 'Masbate Southeastern Institute, Inc.',                school_code: 'SCH-029', level: 'junior',       division: 'Division of Masbate' },
    { id: 30, name: 'Osmeña Colleges',                                     school_code: 'SCH-030', level: 'senior',       division: 'Division of Masbate' },
    { id: 31, name: 'Ovilla Technical College',                            school_code: 'SCH-031', level: 'senior',       division: 'Division of Masbate' },
    { id: 32, name: 'San Rafael SDA Multigrade School',                    school_code: 'SCH-032', level: 'elementary',   division: 'Division of Masbate' },
    { id: 33, name: 'Southern Bicol Colleges',                             school_code: 'SCH-033', level: 'senior',       division: 'Division of Masbate' },
    { id: 34, name: 'St. Anthony High School Seminary',                    school_code: 'SCH-034', level: 'junior',       division: 'Division of Masbate' },
    { id: 35, name: 'St. Bernard of Clairvaux Mission School',             school_code: 'SCH-035', level: 'elementary',   division: 'Division of Masbate' },
    { id: 36, name: 'St. Raphael the Archangel Diocesan School',           school_code: 'SCH-036', level: 'junior',       division: 'Division of Masbate' },
    { id: 37, name: 'Tunog SDA Multigrade School',                         school_code: 'SCH-037', level: 'elementary',   division: 'Division of Masbate' },
    { id: 38, name: 'Yadah Christian School Inc.',                         school_code: 'SCH-038', level: 'elementary',   division: 'Division of Masbate' },
  ],
  staff: [
    {
      id: 1, school_id: 1, first_name: 'Maria', last_name: 'Santos',
      position: 'School Registrar', email: 'maria.santos@adventist.edu.ph',
      password: STAFF_HASH, status: 'approved', phone: null,
      created_at: new Date().toISOString(),
      school_name: 'Adventist Elementary School-Placer, Inc.', school_level: 'elementary',
      school_code: 'SCH-001', division: 'Division of Masbate',
    },
  ],
  admins: [
    {
      id: 1, username: 'admin', full_name: 'Division Administrator',
      position: 'Education Program Supervisor', division: 'Division of Masbate',
      email: 'admin@deped-masbate.gov.ph', password: ADMIN_HASH,
      created_at: new Date().toISOString(),
    },
  ],
  submissions: [],
  notifications: [],
  notices: [
    { id: 1, type: 'info',    title: 'Deadline Reminder',  message: 'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.', created_at: new Date().toISOString() },
    { id: 2, type: 'warning', title: 'System Maintenance', message: 'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.',  created_at: new Date().toISOString() },
  ],
  deadlines: [
    { id: 1, doc_type: 'Enrollment Report',       school_year: '2026-2027', deadline: '2026-06-15', level: 'all', created_at: new Date().toISOString() },
    { id: 2, doc_type: 'Faculty Credentials',     school_year: '2026-2027', deadline: '2026-07-01', level: 'all', created_at: new Date().toISOString() },
    { id: 3, doc_type: 'Compliance Requirements', school_year: '2026-2027', deadline: '2026-06-30', level: 'all', created_at: new Date().toISOString() },
    { id: 4, doc_type: 'Financial Reports',       school_year: '2025-2026', deadline: '2026-05-31', level: 'all', created_at: new Date().toISOString() },
  ],
  audit_log: [],
};

let subIdCounter = 1;
let staffIdCounter = 2;

class MockPool {
  async query(sql, params = []) {
    const q = sql.trim().toUpperCase();

    // ── SCHOOLS ──────────────────────────────────────────────
    if (q.includes('FROM SCHOOLS') && q.startsWith('SELECT')) {
      return { rows: mockData.schools };
    }

    // ── ADMINS ───────────────────────────────────────────────
    if (q.includes('FROM ADMINS') && q.startsWith('SELECT')) {
      const [username] = params;
      const admin = mockData.admins.find(a => a.username === username);
      return { rows: admin ? [admin] : [] };
    }

    // ── STAFF LOGIN (JOIN with schools) ──────────────────────
    if (q.includes('FROM STAFF') && q.includes('JOIN SCHOOLS') && q.startsWith('SELECT')) {
      const [email, schoolId] = params;
      const staff = mockData.staff.find(
        s => s.email === (email || '').toLowerCase() && String(s.school_id) === String(schoolId)
      );
      return { rows: staff ? [staff] : [] };
    }

    // ── STAFF SELECT (no join) ───────────────────────────────
    if (q.includes('FROM STAFF') && q.startsWith('SELECT')) {
      if (params.length === 1) {
        // by id
        const s = mockData.staff.find(x => String(x.id) === String(params[0]));
        return { rows: s ? [s] : [] };
      }
      if (params.length === 2) {
        const [email, schoolId] = params;
        const s = mockData.staff.find(
          x => x.email === (email || '').toLowerCase() && String(x.school_id) === String(schoolId)
        );
        return { rows: s ? [s] : [] };
      }
      return { rows: mockData.staff };
    }

    // ── STAFF INSERT (register) ──────────────────────────────
    if (q.includes('INSERT INTO STAFF')) {
      const [schoolId, firstName, lastName, position, email, password, status] = params;
      const school = mockData.schools.find(s => String(s.id) === String(schoolId));
      const newStaff = {
        id: staffIdCounter++,
        school_id: parseInt(schoolId),
        first_name: firstName, last_name: lastName,
        position, email: (email || '').toLowerCase(),
        password, status: status || 'pending',
        phone: null, created_at: new Date().toISOString(),
        school_name: school ? school.name : '',
        school_level: school ? school.level : '',
        school_code: school ? school.school_code : '',
        division: school ? school.division : '',
      };
      mockData.staff.push(newStaff);
      return { rows: [newStaff] };
    }

    // ── STAFF UPDATE ─────────────────────────────────────────
    if (q.includes('UPDATE STAFF')) {
      return { rows: [] };
    }

    // ── SUBMISSIONS ──────────────────────────────────────────
    if (q.includes('FROM SUBMISSIONS') && q.startsWith('SELECT')) {
      return { rows: mockData.submissions };
    }
    if (q.includes('INSERT INTO SUBMISSIONS')) {
      const newSub = {
        id: subIdCounter++, ref: params[0], school_id: params[1], staff_id: params[2],
        doc_type: params[3], school_year: params[4], subject: params[5],
        remarks: params[6], file_count: params[7], status: 'received',
        original_ref: params[8] || null, is_revision: params[9] || false,
        submitted_at: new Date().toISOString(), feedback: null,
      };
      mockData.submissions.push(newSub);
      return { rows: [newSub] };
    }
    if (q.includes('UPDATE SUBMISSIONS')) {
      return { rows: [] };
    }

    // ── SUBMISSION FILES ─────────────────────────────────────
    if (q.includes('SUBMISSION_FILES')) {
      return { rows: [] };
    }

    // ── NOTIFICATIONS ────────────────────────────────────────
    if (q.includes('FROM NOTIFICATIONS')) {
      return { rows: mockData.notifications };
    }
    if (q.includes('INSERT INTO NOTIFICATIONS')) {
      return { rows: [] };
    }
    if (q.includes('UPDATE NOTIFICATIONS')) {
      return { rows: [] };
    }

    // ── NOTICES ──────────────────────────────────────────────
    if (q.includes('FROM NOTICES')) {
      return { rows: mockData.notices };
    }
    if (q.includes('INSERT INTO NOTICES')) {
      const newNotice = { id: Date.now(), type: params[0], title: params[1], message: params[2], created_at: new Date().toISOString() };
      mockData.notices.unshift(newNotice);
      return { rows: [newNotice] };
    }
    if (q.includes('DELETE FROM NOTICES')) {
      mockData.notices = mockData.notices.filter(n => String(n.id) !== String(params[0]));
      return { rows: [] };
    }

    // ── DEADLINES ────────────────────────────────────────────
    if (q.includes('FROM DEADLINES')) {
      return { rows: mockData.deadlines };
    }
    if (q.includes('INSERT INTO DEADLINES')) {
      const newDl = { id: Date.now(), doc_type: params[0], school_year: params[1], deadline: params[2], level: params[3] || 'all', created_at: new Date().toISOString() };
      mockData.deadlines.push(newDl);
      return { rows: [newDl] };
    }
    if (q.includes('DELETE FROM DEADLINES')) {
      mockData.deadlines = mockData.deadlines.filter(d => String(d.id) !== String(params[0]));
      return { rows: [] };
    }

    // ── AUDIT LOG ────────────────────────────────────────────
    if (q.includes('AUDIT_LOG') || q.includes('AUDIT LOG')) {
      if (q.startsWith('INSERT')) {
        mockData.audit_log.unshift({ id: Date.now(), action: params[0], ref: params[1], created_at: new Date().toISOString() });
      }
      return { rows: mockData.audit_log };
    }

    // ── STATS (COUNT queries) ────────────────────────────────
    if (q.includes('COUNT(*)') && q.includes('FROM SUBMISSIONS')) {
      return { rows: [{ count: String(mockData.submissions.length) }] };
    }
    if (q.includes('COUNT(*)') && q.includes('FROM SCHOOLS')) {
      return { rows: [{ count: String(mockData.schools.length) }] };
    }
    if (q.includes('COUNT(*)') && q.includes('FROM STAFF')) {
      return { rows: [{ count: String(mockData.staff.filter(s => s.status === 'pending').length) }] };
    }

    // ── INFORMATION SCHEMA (table check) ────────────────────
    if (q.includes('INFORMATION_SCHEMA')) {
      return { rows: [{ table_name: 'mock_tables' }] };
    }

    // ── SELECT 1 (health check) ──────────────────────────────
    if (q.trim() === 'SELECT 1') {
      return { rows: [{ '?column?': 1 }] };
    }

    // Default
    return { rows: [] };
  }

  async connect() {
    const self = this;
    return {
      query: (sql, params) => self.query(sql, params),
      release: () => {},
    };
  }

  on(event, callback) {}
  async end() {}
}

module.exports = new MockPool();
