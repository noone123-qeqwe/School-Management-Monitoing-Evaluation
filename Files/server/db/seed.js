require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./pool');

async function seed() {
  const isProd = process.env.NODE_ENV === 'production';
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    // ── Schools ──────────────────────────────────────────────
    const schools = [
      ['Adventist Elementary School-Placer, Inc.',              'SCH-001', 'elementary',   'Division of Masbate', 'adventistplacer@school.edu.ph'],
      ['Aldeper Mission School, Inc.',                          'SCH-002', 'elementary',   'Division of Masbate', 'aldeper@school.edu.ph'],
      ['Andres Soriano Jr. Memorial School',                    'SCH-004', 'elementary',   'Division of Masbate', 'andressoriano@school.edu.ph'],
      ['Blue Angels Learning Center',                           'SCH-005', 'kindergarten', 'Division of Masbate', 'blueangels@school.edu.ph'],
      ['Burias College, Inc.',                                  'SCH-006', 'senior',       'Division of Masbate', 'buriasc@school.edu.ph'],
      ['Christina Rose Elementary School',                      'SCH-007', 'elementary',   'Division of Masbate', 'christinarose@school.edu.ph'],
      ['Daughters of St. Joseph Kindergarten School',           'SCH-008', 'kindergarten', 'Division of Masbate', 'dsjkinder@school.edu.ph'],
      ["Eden's Christian Academy",                              'SCH-009', 'elementary',   'Division of Masbate', 'edenschristian@school.edu.ph'],
      ["Eden's Christian Learning Center",                      'SCH-010', 'elementary',   'Division of Masbate', 'edenslearning@school.edu.ph'],
      ['G & A Guitierrez Learning Center Inc.',                 'SCH-011', 'elementary',   'Division of Masbate', 'gaguitierrez@school.edu.ph'],
      ['Green Meadows Tiny Tots Inc.',                          'SCH-012', 'kindergarten', 'Division of Masbate', 'greenmeadows@school.edu.ph'],
      ['Happy Victory School Inc.',                             'SCH-013', 'elementary',   'Division of Masbate', 'happyvictory@school.edu.ph'],
      ['Holy Family Parish Learning Center',                    'SCH-014', 'elementary',   'Division of Masbate', 'holyfamily@school.edu.ph'],
      ['Holy Name Academy',                                     'SCH-015', 'junior',       'Division of Masbate', 'holynameacademy@school.edu.ph'],
      ['Immaculate Conception Parish Learning Center',          'SCH-016', 'elementary',   'Division of Masbate', 'icplc@school.edu.ph'],
      ['Institute of the Orient',                               'SCH-017', 'senior',       'Division of Masbate', 'instituteorient@school.edu.ph'],
      ['Liceo de Aroroy',                                       'SCH-018', 'junior',       'Division of Masbate', 'liceodearoroy@school.edu.ph'],
      ['Liceo de Masbate Colleges Inc.',                        'SCH-019', 'senior',       'Division of Masbate', 'liceodemasbate@school.edu.ph'],
      ['Liceo de San Jacinto Foundation, Inc.',                 'SCH-020', 'junior',       'Division of Masbate', 'liceosanjacinto@school.edu.ph'],
      ['Liceo de San Pedro Calungsod',                          'SCH-021', 'junior',       'Division of Masbate', 'liceosanpedro@school.edu.ph'],
      ['Mandaon Christian Academy',                             'SCH-022', 'junior',       'Division of Masbate', 'mandaonchristian@school.edu.ph'],
      ['Masbate Central Technical Institute',                   'SCH-023', 'senior',       'Division of Masbate', 'masbatecti@school.edu.ph'],
      ['Masbate Colleges Inc.',                                 'SCH-024', 'senior',       'Division of Masbate', 'masbatecolleges@school.edu.ph'],
      ['Masbate Ikthus Christian School, Inc.',                 'SCH-025', 'junior',       'Division of Masbate', 'masbateikthus@school.edu.ph'],
      ['Masbate Institute of Science and Technology, Inc.',     'SCH-026', 'senior',       'Division of Masbate', 'masbateist@school.edu.ph'],
      ["Masbate Learning is Fun Children's Center, Inc.",       'SCH-027', 'kindergarten', 'Division of Masbate', 'masbatelearning@school.edu.ph'],
      ['Masbate Polytechnic and Development College',           'SCH-028', 'senior',       'Division of Masbate', 'masbatepoly@school.edu.ph'],
      ['Masbate Southeastern Institute, Inc.',                  'SCH-029', 'junior',       'Division of Masbate', 'masbatesoutheast@school.edu.ph'],
      ['Osmeña Colleges',                                       'SCH-030', 'senior',       'Division of Masbate', 'osmenacolleges@school.edu.ph'],
      ['Ovilla Technical College',                              'SCH-031', 'senior',       'Division of Masbate', 'ovillatechcollege@school.edu.ph'],
      ['San Rafael SDA Multigrade School',                      'SCH-032', 'elementary',   'Division of Masbate', 'sanrafaelsda@school.edu.ph'],
      ['Southern Bicol Colleges',                               'SCH-033', 'senior',       'Division of Masbate', 'southernbicol@school.edu.ph'],
      ['St. Anthony High School Seminary',                      'SCH-034', 'junior',       'Division of Masbate', 'stanthonyseminary@school.edu.ph'],
      ['St. Bernard of Clairvaux Mission School',               'SCH-035', 'elementary',   'Division of Masbate', 'stbernard@school.edu.ph'],
      ['St. Raphael the Archangel Diocesan School',             'SCH-036', 'junior',       'Division of Masbate', 'straphael@school.edu.ph'],
      ['Tunog SDA Multigrade School',                           'SCH-037', 'elementary',   'Division of Masbate', 'tunogsda@school.edu.ph'],
      ['Yadah Christian School Inc.',                           'SCH-038', 'elementary',   'Division of Masbate', 'yadahchristian@school.edu.ph'],
    ];

    for (const [name, code, level, division, email] of schools) {
      await client.query(
        `INSERT INTO schools (name, school_code, level, division, email)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (school_code) DO NOTHING`,
        [name, code, level, division, email]
      );
    }
    console.log('✅ Schools seeded.');

    // ── Admin bootstrap (safe in production) ─────────────────
    const adminUser = process.env.SMME_ADMIN_USER || 'admin';
    const adminPass = process.env.SMME_ADMIN_PASSWORD;
    const canSeedAdmin = !isProd || Boolean(adminPass);
    if (canSeedAdmin) {
      const adminPw = await bcrypt.hash(adminPass || 'admin123', 10);
      await client.query(
        `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING`,
        [adminUser, 'Division Administrator', 'Education Program Supervisor', 'Division of Masbate', 'admin@deped-masbate.gov.ph', adminPw]
      );
      console.log('✅ Admin account seeded.');
    } else {
      console.log('⚠️  Admin seed skipped in production (set SMME_ADMIN_PASSWORD to enable).');
    }

    // ── Demo staff ────────────────────────────────────────────
    if (!isProd || allowDemoSeed) {
      const school1 = await client.query(`SELECT id FROM schools WHERE school_code='SCH-001'`);
      if (school1.rows.length) {
        const sid = school1.rows[0].id;
        const staffPw = await bcrypt.hash(process.env.SMME_DEMO_STAFF_PASSWORD || 'staff123', 10);
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
      console.log('✅ Demo staff seeded.');
    } else {
      console.log('ℹ️  Demo staff seed skipped in production.');
    }

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
         SELECT $1,$2,$3,$4
         WHERE NOT EXISTS (
           SELECT 1 FROM deadlines
           WHERE doc_type=$1 AND school_year=$2 AND deadline=$3 AND level=$4
         )`,
        [doc_type, school_year, deadline, level]
      );
    }
    console.log('✅ Deadlines seeded.');

    // ── Default notices ───────────────────────────────────────
    await client.query(
      `INSERT INTO notices (type, title, message)
       SELECT * FROM (
         VALUES
         ('info',    'Deadline Reminder',       'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.'),
         ('warning', 'System Maintenance',      'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.'),
         ('success', 'New Document Type Added', 'You can now submit TVL Strand Offerings directly through the portal.')
       ) AS seed(type, title, message)
       WHERE NOT EXISTS (SELECT 1 FROM notices n WHERE n.title = seed.title)`
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
