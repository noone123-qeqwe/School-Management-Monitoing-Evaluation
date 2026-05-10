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

        // 2. Reset staff passwords
        const staffHash = await bcrypt.hash('Staff@1234', 12);

        const schoolResult = await pool.query(
            `SELECT id FROM schools WHERE school_code = 'SCH-012'`
        );

        if (schoolResult.rows.length === 0) {
            console.log('⚠️  School SCH-012 not found — inserting demo staff skipped.');
        } else {
            const schoolId = schoolResult.rows[0].id;

            for (const [firstName, lastName, position, email] of [
                ['Maria', 'Santos', 'School Registrar', 'maria.santos@adventist.edu.ph'],
                ['Jose', 'Reyes', 'School Principal', 'jose.reyes@adventist.edu.ph'],
            ]) {
                const r = await pool.query(
                    `UPDATE staff SET password = $1, status = 'approved'
           WHERE email = $2 AND school_id = $3 RETURNING id, email`,
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
                    console.log('✅ Staff password RESET: ' + email);
                }
            }

            console.log('   Password : Staff@1234');
        }

    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await pool.end();
    }
}

fix();