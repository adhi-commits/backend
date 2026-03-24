const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
});

async function checkDuplicates() {
    try {
        const connection = await pool.getConnection();
        console.log('Checking for duplicate phone numbers...');

        const [rows] = await connection.query(`
            SELECT phone, COUNT(*) as count
            FROM users
            WHERE phone IS NOT NULL AND phone != ''
            GROUP BY phone
            HAVING count > 1
        `);

        if (rows.length > 0) {
            console.log(`Found ${rows.length} duplicate phone numbers.`);
            const phones = rows.map(r => r.phone);
            const [users] = await connection.query(`SELECT id, name, phone, email, role FROM users WHERE phone IN (?)`, [phones]);

            fs.writeFileSync(path.join(__dirname, 'duplicates.json'), JSON.stringify(users, null, 2));
            console.log('Duplicates written to duplicates.json');
        } else {
            console.log('No duplicate phone numbers found.');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkDuplicates();
