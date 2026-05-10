
'use strict';
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

(async () => {
    try {
        const newPassword = process.env.SMME_ADMIN_PASSWORD || 'Admin@1234';
        const hash = await bcrypt.hash(newPassword, 12);

        const result = await pool.query(
            `UPDATE admins SET password=$1 WHERE username='admin' RETURNING id, username`,
            [hash]
        );

        if (result.rows.length === 0) {
            console.log('⚠️  No admin row found. Inserting one now...');
            await pool.query(
                `INSERT INTO admins (username, full_name, position, division, email, password)
         VALUES ('admin','Division Administrator','Education Program Supervisor',
                 'Division of Masbate','admin@deped-masbate.gov.ph',$1)`,
                [hash]
            );
            console.log('✅  Admin account created.');
        } else {
            console.log(`✅  Password reset for: ${result.rows[0].username}`);
        }

        console.log(`   Username : admin`);
        console.log(`   Password : ${newPassword}`);
    } catch (err) {
        console.error('❌  Reset failed:', err.message);
    } finally {
        await pool.end();
    }
})();