'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function fix() {
  try {
    // 1. Reset admin password
    const adminHash = await bcrypt.hash('Admin@1234', 12);
    const adminResult = await pool.query(
      `UPDATE admins SET password = $1 WHERE username = 'admin' RETURNING id, username`,
      [adminHash]
    );
    if (adminResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ('admin', 'Division Administrator', 'Education Program Supervisor',
                 'Division of Masbate', 'admin@deped-masbate.gov.ph', $1)`,
        [adminHash]
      );
      console.log('✅ Admin account CREATED.');
    } else {
      console.log('✅ Admin password RESET.');
    }
    console.log('   Username : admin');
    console.log('   Password : Admin@1234\n');

    // 2. Find SCH-012 actual id
    const schoolResult = await pool.query(
      `SELECT id, name, school_code FROM schools WHERE school_code = 'SCH-012'`
    );
    console.log('School lookup:', schoolResult.rows);

    if (schoolResult.rows.length === 0) {
      console.log('⚠️  SCH-012 not found in schools table!');
      // Print all schools so we can see what exists
      const allSchools = await pool.query(`SELECT id, name, school_code FROM schools ORDER BY id`);
      console.log('All schools in DB:', allSchools.rows);
      return;
    }

    const schoolId = schoolResult.rows[0].id;
    console.log('Using school_id:', schoolId);

    // 3. Reset/create staff
    const staffHash = await bcrypt.hash('Staff@1234', 12);
    for (const [firstName, lastName, position, email] of [
      ['Maria', 'Santos', 'School Registrar', 'maria.santos@adventist.edu.ph'],
      ['Jose', 'Reyes', 'School Principal', 'jose.reyes@adventist.edu.ph'],
    ]) {
      const r = await pool.query(
        `UPDATE staff SET password = $1, status = 'approved', school_id = $3
         WHERE email = $2 RETURNING id, email, school_id`,
        [staffHash, email, schoolId]
      );
      if (r.rows.length === 0) {
        await pool.query(
          `INSERT INTO staff (school_id, first_name, last_name, position, email, password, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'approved')`,
          [schoolId, firstName, lastName, position, email, staffHash]
        );
        console.log('✅ Staff CREATED: ' + email);
      } else {
        console.log('✅ Staff RESET: ' + email + ' (school_id=' + r.rows[0].school_id + ')');
      }
    }

    // 4. Verify staff in DB
    const staffCheck = await pool.query(
      `SELECT id, email, school_id, status FROM staff`
    );
    console.log('\nStaff in DB:', staffCheck.rows);
    console.log('\n   Email    : maria.santos@adventist.edu.ph');
    console.log('   Password : Staff@1234');
    console.log('   School   : Green Meadows Tiny Tots Inc. (id=' + schoolId + ')');

  } catch (err) {
    console.error('❌ Failed:', err.message);
  } finally {
    await pool.end();
  }
}

fix();