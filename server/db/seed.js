require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // ── Schools ──────────────────────────────────────────────
    const schools = [
      ["St. Mary's Academy",      'SCH-001', 'elementary',   'Division of Pasig',    'stmarys@school.edu.ph'],
      ['Holy Cross Kindergarten', 'SCH-002', 'kindergarten', 'Division of Pasig',    'holycross@school.edu.ph'],
      ['Lourdes Academy',         'SCH-003', 'junior',       'Division of Pasig',    'lourdes@school.edu.ph'],
      ['Immaculate Conception',   'SCH-004', 'senior',       'Division of Pasig',    'ic@school.edu.ph'],
      ['San Jose Academy',        'SCH-005', 'elementary',   'Division of Pasig',    'sanjose@school.edu.ph'],
      ['Sacred Heart School',     'SCH-006', 'elementary',   'Division of Pasig',    'sacredheart@school.edu.ph'],
      ['Little Flower Kinder',    'SCH-007', 'kindergarten', 'Division of Pasig',    'littleflower@school.edu.ph'],
      ['St. Joseph High School',  'SCH-008', 'junior',       'Division of Pasig',    'stjoseph@school.edu.ph'],
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
      ['admin', 'Division Administrator', 'Education Program Supervisor', 'Division of Pasig', 'admin@deped-pasig.gov.ph', adminPw]
    );
    console.log('✅ Default admin seeded. (username: admin / password: admin123)');

    // ── Demo staff ────────────────────────────────────────────
    const school1 = await client.query(`SELECT id FROM schools WHERE school_code='SCH-001'`);
    if (school1.rows.length) {
      const sid = school1.rows[0].id;
      const staffPw = await bcrypt.hash('staff123', 10);
      await client.query(
        `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
         VALUES ($1,'Maria','Santos','School Registrar','maria.santos@stmarys.edu.ph',$2,'approved')
         ON CONFLICT (email, school_id) DO NOTHING`,
        [sid, staffPw]
      );
      await client.query(
        `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
         VALUES ($1,'Jose','Reyes','School Principal','jose.reyes@stmarys.edu.ph',$2,'approved')
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
