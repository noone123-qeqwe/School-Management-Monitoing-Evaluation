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
        const hash = await bcrypt.hash('Admin@1234', 12);

        // Reset admin password
        const r = await pool.query(
            `UPDATE admins SET password = $1 WHERE username = 'admin' RETURNING id, username`,
            [hash]
        );

        if (r.rows.length === 0) {
            // No admin row exists — insert one
            await pool.query(
                `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ('admin', 'Division Administrator', 'Education Program Supervisor',
                 'Division of Masbate', 'admin@deped-masbate.gov.ph', $1)`,
                [hash]
            );
            console.log('✅ Admin account CREATED.');
        } else {
            console.log('✅ Admin password RESET.');
        }

        console.log('   Username : admin');
        console.log('   Password : Admin@1234');
    } catch (err) {
        console.error('❌ Failed:', err.message);
    } finally {
        await pool.end();
    }
}

fix();