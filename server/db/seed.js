'use strict';
/**
 * server/db/seed.js
 * Seeds baseline data: schools, admin account, demo staff, deadlines, notices.
 * Idempotent — safe to run multiple times (all inserts use conflict guards).
 */

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const SCHOOL_LIST = [
  { name: 'Adventist Elementary School-Placer, Inc.',          school_code: 'SCH-001', level: 'elementary',   division: 'Division of Masbate', email: 'adventistplacer@school.edu.ph'  },
  { name: 'Aldeper Mission School, Inc.',                      school_code: 'SCH-002', level: 'elementary',   division: 'Division of Masbate', email: 'aldeper@school.edu.ph'          },
  { name: 'Amazing Progress Learning Center',                  school_code: 'SCH-003', level: 'elementary',   division: 'Division of Masbate', email: 'amazingprogress@school.edu.ph'  },
  { name: 'Andres Soriano Jr. Memorial School',                school_code: 'SCH-004', level: 'elementary',   division: 'Division of Masbate', email: 'andressoriano@school.edu.ph'    },
  { name: 'Blue Angels Learning Center',                       school_code: 'SCH-005', level: 'kindergarten', division: 'Division of Masbate', email: 'blueangels@school.edu.ph'       },
  { name: 'Burias College, Inc.',                              school_code: 'SCH-006', level: 'senior',       division: 'Division of Masbate', email: 'buriasc@school.edu.ph'          },
  { name: 'Christina Rose Elementary School',                  school_code: 'SCH-007', level: 'elementary',   division: 'Division of Masbate', email: 'christinarose@school.edu.ph'    },
  { name: 'Daughters of St. Joseph Kindergarten School',       school_code: 'SCH-008', level: 'kindergarten', division: 'Division of Masbate', email: 'dsjkinder@school.edu.ph'        },
  { name: "Eden's Christian Academy",                          school_code: 'SCH-009', level: 'elementary',   division: 'Division of Masbate', email: 'edenschristian@school.edu.ph'   },
  { name: "Eden's Christian Learning Center",                  school_code: 'SCH-010', level: 'elementary',   division: 'Division of Masbate', email: 'edenslearning@school.edu.ph'    },
  { name: 'G & A Guitierrez Learning Center Inc.',             school_code: 'SCH-011', level: 'elementary',   division: 'Division of Masbate', email: 'gaguitierrez@school.edu.ph'     },
  { name: 'Green Meadows Tiny Tots Inc.',                      school_code: 'SCH-012', level: 'kindergarten', division: 'Division of Masbate', email: 'greenmeadows@school.edu.ph'     },
  { name: 'Happy Victory School Inc.',                         school_code: 'SCH-013', level: 'elementary',   division: 'Division of Masbate', email: 'happyvictory@school.edu.ph'     },
  { name: 'Holy Family Parish Learning Center',                school_code: 'SCH-014', level: 'elementary',   division: 'Division of Masbate', email: 'holyfamily@school.edu.ph'       },
  { name: 'Holy Name Academy',                                 school_code: 'SCH-015', level: 'junior',       division: 'Division of Masbate', email: 'holynameacademy@school.edu.ph'  },
  { name: 'Immaculate Conception Parish Learning Center',      school_code: 'SCH-016', level: 'elementary',   division: 'Division of Masbate', email: 'icplc@school.edu.ph'            },
  { name: 'Institute of the Orient',                           school_code: 'SCH-017', level: 'senior',       division: 'Division of Masbate', email: 'instituteorient@school.edu.ph'  },
  { name: 'Liceo de Aroroy',                                   school_code: 'SCH-018', level: 'junior',       division: 'Division of Masbate', email: 'liceodearoroy@school.edu.ph'    },
  { name: 'Liceo de Masbate Colleges Inc.',                    school_code: 'SCH-019', level: 'senior',       division: 'Division of Masbate', email: 'liceodemasbate@school.edu.ph'   },
  { name: 'Liceo de San Jacinto Foundation, Inc.',             school_code: 'SCH-020', level: 'junior',       division: 'Division of Masbate', email: 'liceosanjacinto@school.edu.ph'  },
  { name: 'Liceo de San Pedro Calungsod',                      school_code: 'SCH-021', level: 'junior',       division: 'Division of Masbate', email: 'liceosanpedro@school.edu.ph'    },
  { name: 'Mandaon Christian Academy',                         school_code: 'SCH-022', level: 'junior',       division: 'Division of Masbate', email: 'mandaonchristian@school.edu.ph' },
  { name: 'Masbate Central Technical Institute',               school_code: 'SCH-023', level: 'senior',       division: 'Division of Masbate', email: 'masbatecti@school.edu.ph'       },
  { name: 'Masbate Colleges Inc.',                             school_code: 'SCH-024', level: 'senior',       division: 'Division of Masbate', email: 'masbatecolleges@school.edu.ph'  },
  { name: 'Masbate Ikthus Christian School, Inc.',             school_code: 'SCH-025', level: 'junior',       division: 'Division of Masbate', email: 'masbateikthus@school.edu.ph'    },
  { name: 'Masbate Institute of Science and Technology, Inc.', school_code: 'SCH-026', level: 'senior',       division: 'Division of Masbate', email: 'masbateist@school.edu.ph'       },
  { name: "Masbate Learning is Fun Children's Center, Inc.",   school_code: 'SCH-027', level: 'kindergarten', division: 'Division of Masbate', email: 'masbatelearning@school.edu.ph'  },
  { name: 'Masbate Polytechnic and Development College',       school_code: 'SCH-028', level: 'senior',       division: 'Division of Masbate', email: 'masbatepoly@school.edu.ph'      },
  { name: 'Masbate Southeastern Institute, Inc.',              school_code: 'SCH-029', level: 'junior',       division: 'Division of Masbate', email: 'masbatesoutheast@school.edu.ph' },
  { name: 'Osmeña Colleges',                                   school_code: 'SCH-030', level: 'senior',       division: 'Division of Masbate', email: 'osmenacolleges@school.edu.ph'   },
  { name: 'Ovilla Technical College',                          school_code: 'SCH-031', level: 'senior',       division: 'Division of Masbate', email: 'ovillatechcollege@school.edu.ph'},
  { name: 'San Rafael SDA Multigrade School',                  school_code: 'SCH-032', level: 'elementary',   division: 'Division of Masbate', email: 'sanrafaelsda@school.edu.ph'     },
  { name: 'Southern Bicol Colleges',                           school_code: 'SCH-033', level: 'senior',       division: 'Division of Masbate', email: 'southernbicol@school.edu.ph'    },
  { name: 'St. Anthony High School Seminary',                  school_code: 'SCH-034', level: 'junior',       division: 'Division of Masbate', email: 'stanthonyseminary@school.edu.ph'},
  { name: 'St. Bernard of Clairvaux Mission School',           school_code: 'SCH-035', level: 'elementary',   division: 'Division of Masbate', email: 'stbernard@school.edu.ph'        },
  { name: 'St. Raphael the Archangel Diocesan School',         school_code: 'SCH-036', level: 'junior',       division: 'Division of Masbate', email: 'straphael@school.edu.ph'        },
  { name: 'Tunog SDA Multigrade School',                       school_code: 'SCH-037', level: 'elementary',   division: 'Division of Masbate', email: 'tunogsda@school.edu.ph'         },
  { name: 'Yadah Christian School Inc.',                       school_code: 'SCH-038', level: 'elementary',   division: 'Division of Masbate', email: 'yadahchristian@school.edu.ph'   },
];

const DEADLINES_DATA = [
  ['Enrollment Report',       '2026-2027', '2026-06-15', 'all'],
  ['Faculty Credentials',     '2026-2027', '2026-07-01', 'all'],
  ['Compliance Requirements', '2026-2027', '2026-06-30', 'all'],
  ['Financial Reports',       '2025-2026', '2026-05-31', 'all'],
];

const NOTICES_DATA = [
  ['info',    'Deadline Reminder',       'Enrollment reports for SY 2026–2027 must be submitted by June 15, 2026.'],
  ['warning', 'System Maintenance',      'The portal will be unavailable on May 10, 2026 from 12:00 AM – 4:00 AM.'],
  ['success', 'New Document Type Added', 'You can now submit TVL Strand Offerings directly through the portal.'],
];

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set.');
    process.exit(1);
  }

  const isProd      = process.env.NODE_ENV === 'production';
  const allowDemo   = process.env.ALLOW_DEMO_SEED === 'true';
  const adminUser   = process.env.SMME_ADMIN_USER          || 'admin';
  const adminPass   = process.env.SMME_ADMIN_PASSWORD;
  const demoStaffPw = process.env.SMME_DEMO_STAFF_PASSWORD || 'staff123';

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProd ? { rejectUnauthorized: false } : false,
  });

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
      const hash = await bcrypt.hash(adminPass || 'admin123', 12);
      await client.query(
        `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (username) DO NOTHING`,
        [adminUser, 'Division Administrator', 'Education Program Supervisor', 'Division of Masbate', 'admin@deped-masbate.gov.ph', hash]
      );
      console.log(`   ✅  Admin account seeded (username: ${adminUser}).`);
    } else {
      console.log('   ⚠️   Admin seed skipped in production — set SMME_ADMIN_PASSWORD to enable.');
    }

    // 3. Demo staff (dev / explicit opt-in only)
    if (!isProd || allowDemo) {
      const { rows } = await client.query(`SELECT id FROM schools WHERE school_code = 'SCH-012'`);
      if (rows.length > 0) {
        const sid  = rows[0].id;
        const hash = await bcrypt.hash(demoStaffPw, 12);
        for (const [first, last, position, email] of [
          ['Maria', 'Santos', 'School Registrar', 'maria.santos@adventist.edu.ph'],
          ['Jose',  'Reyes',  'School Principal',  'jose.reyes@adventist.edu.ph'],
        ]) {
          await client.query(
            `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
             VALUES ($1,$2,$3,$4,$5,$6,'approved') ON CONFLICT (email, school_id) DO NOTHING`,
            [sid, first, last, position, email, hash]
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
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
