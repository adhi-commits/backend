const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
});

async function debugData() {
    try {
        const connection = await pool.getConnection();

        console.log('--- USERS ---');
        const [users] = await connection.query('SELECT id, name, email, role FROM users');
        console.log(JSON.stringify(users, null, 2));

        console.log('\n--- REGISTRATIONS ---');
        const [regs] = await connection.query('SELECT * FROM registrations');
        console.log(JSON.stringify(regs, null, 2));

        console.log('\n--- CERTIFICATES ---');
        const [certs] = await connection.query('SELECT * FROM certificates');
        console.log(JSON.stringify(certs, null, 2));

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugData();
