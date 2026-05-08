require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // ── Schools ──────────────────────────────────────────────
    const schools = [
      ['Amazing Progress Learning Center',                    'SCH-001', 'elementary',   'Division of Masbate', 'amazingprogress@school.edu.ph'],
      ['Andres Soriano Jr. Memorial School',                  'SCH-002', 'elementary',   'Division of Masbate', 'andressoriano@school.edu.ph'],
      ['Blue Angels Learning Center',                         'SCH-003', 'kindergarten', 'Division of Masbate', 'blueangels@school.edu.ph'],
      ['Christina Rose Elementary School',                    'SCH-004', 'elementary',   'Division of Masbate', 'christinarose@school.edu.ph'],
      ['Daughters of St. Joseph Kindergarten School',         'SCH-005', 'kindergarten', 'Division of Masbate', 'dsjkinder@school.edu.ph'],
      ["Eden's Christian Academy",                            'SCH-006', 'elementary',   'Division of Masbate', 'edenschristian@school.edu.ph'],
      ["Eden's Christian Learning Center",                    'SCH-007', 'elementary',   'Division of Masbate', 'edenslearning@school.edu.ph'],
      ['G & A Guitierrez Learning Center Inc.',               'SCH-008', 'elementary',   'Division of Masbate', 'gaguitierrez@school.edu.ph'],
      ['Green Meadows Tiny Tots Inc.',                        'SCH-009', 'kindergarten', 'Division of Masbate', 'greenmeadows@school.edu.ph'],
      ['Happy Victory School Inc.',                           'SCH-010', 'elementary',   'Division of Masbate', 'happyvictory@school.edu.ph'],
      ['Holy Family Parish Learning Center',                  'SCH-011', 'elementary',   'Division of Masbate', 'holyfamily@school.edu.ph'],
      ['Holy Name Academy',                                   'SCH-012', 'junior',       'Division of Masbate', 'holynameacademy@school.edu.ph'],
      ['Immaculate Conception Parish Learning Center',        'SCH-013', 'elementary',   'Division of Masbate', 'icplc@school.edu.ph'],
      ['Institute of the Orient',                             'SCH-014', 'senior',       'Division of Masbate', 'instituteorient@school.edu.ph'],
      ['Liceo de Masbate Colleges Inc.',                      'SCH-015', 'senior',       'Division of Masbate', 'liceodemasbate@school.edu.ph'],
      ['Liceo de San Jacinto Foundation, Inc.',               'SCH-016', 'junior',       'Division of Masbate', 'liceosanjacinto@school.edu.ph'],
      ['Mandaon Christian Academy',                           'SCH-017', 'junior',       'Division of Masbate', 'mandaonchristian@school.edu.ph'],
      ['Masbate Central Technical Institute',                 'SCH-018', 'senior',       'Division of Masbate', 'masbatecti@school.edu.ph'],
      ['Masbate Colleges Inc.',                               'SCH-019', 'senior',       'Division of Masbate', 'masbatecolleges@school.edu.ph'],
      ['Masbate Ikthus Christian School, Inc.',               'SCH-020', 'junior',       'Division of Masbate', 'masbateikthus@school.edu.ph'],
      ['Masbate Institute of Science and Technology, Inc.',   'SCH-021', 'senior',       'Division of Masbate', 'masbateist@school.edu.ph'],
      ["Masbate Learning is Fun Children's Center, Inc.",     'SCH-022', 'kindergarten', 'Division of Masbate', 'masbatelearning@school.edu.ph'],
      ['Masbate Polytechnic and Development College',         'SCH-023', 'senior',       'Division of Masbate', 'masbatepoly@school.edu.ph'],
      ['Masbate Southeastern Institute, Inc.',                'SCH-024', 'junior',       'Division of Masbate', 'masbatesoutheast@school.edu.ph'],
      ['Osmeña Colleges',                                     'SCH-025', 'senior',       'Division of Masbate', 'osmenacolleges@school.edu.ph'],
      ['St. Anthony High School Seminary',                    'SCH-026', 'junior',       'Division of Masbate', 'stanthonyseminary@school.edu.ph'],
      ['St. Raphael the Archangel Diocesan School',           'SCH-027', 'junior',       'Division of Masbate', 'straphael@school.edu.ph'],
      ['Yadah Christian School Inc.',                         'SCH-028', 'elementary',   'Division of Masbate', 'yadahchristian@school.edu.ph'],
    ];

    for (const [name, code, level, division, email] of schools) {
      await client.query(
        `INSERT INTO schools (name, school_code, level, division, email)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (school_code) DO NOTHING`,
        [name, code, level, division, email]
      );
    }
    console.log('✅ Schools seeded.');

    // ── Default admin ─────────────────────────────────────────
    const adminPw = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO admins (username, full_name, position, division, email, password)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING`,
      ['admin', 'Division Administrator', 'Education Program Supervisor', 'Division of Masbate', 'admin@deped-masbate.gov.ph', adminPw]
    );
    console.log('✅ Default admin seeded. (username: admin / password: admin123)');

    // ── Demo staff ────────────────────────────────────────────
    const school1 = await client.query(`SELECT id FROM schools WHERE school_code='SCH-001'`);
    if (school1.rows.length) {
      const sid = school1.rows[0].id;
      const staffPw = await bcrypt.hash('staff123', 10);
      await client.query(
        `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
         VALUES ($1,'Maria','Santos','School Registrar','maria.santos@amazingprogress.edu.ph',$2,'approved')
         ON CONFLICT (email, school_id) DO NOTHING`,
        [sid, staffPw]
      );
      await client.query(
        `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
         VALUES ($1,'Jose','Reyes','School Principal','jose.reyes@amazingprogress.edu.ph',$2,'approved')
         ON CONFLICT (email, school_id) DO NOTHING`,
        [sid, staffPw]
      );
    }
    console.log('✅ Demo staff seeded. (password: staff123)');

    // ── Default deadlines ─────────────────────────────────────
    const deadlines = [
      ['Enrollment Report',       '2026-2027', '2026-06-15', 'all'],
      ['Faculty Credentials',     '2026-2027', '2026-07-01', 'all'],
      ['Compliance Requirements', '2026-2027', '2026-06-30', 'all'],
      ['Financial Reports',       '2025-2026', '2026-05-31', 'all'],
    ];
    for (const [doc_type, school_year, deadline, level] of deadlines) {
      await client.query(
        `INSERT INTO deadlines (doc_type, school_year, deadline, level)
         VALUES ($1,$2,$3,$4)`,
        [doc_type, school_year, deadline, level]
      );
    }
    console.log('✅ Deadlines seeded.');

    // ── Default notices ───────────────────────────────────────
    await client.query(
      `INSERT INTO notices (type, title, message) VALUES
       ('info',    'Deadline Reminder',       'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.'),
       ('warning', 'System Maintenance',      'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.'),
       ('success', 'New Document Type Added', 'You can now submit TVL Strand Offerings directly through the portal.')`
    );
    console.log('✅ Notices seeded.');

    console.log('\n🎉 Database seeded successfully!');
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
