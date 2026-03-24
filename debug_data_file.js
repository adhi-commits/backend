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

async function debugData() {
    try {
        const connection = await pool.getConnection();

        let output = '';

        output += '--- USERS ---\n';
        const [users] = await connection.query('SELECT id, name, email, role FROM users');
        output += JSON.stringify(users, null, 2) + '\n\n';

        output += '--- REGISTRATIONS ---\n';
        const [regs] = await connection.query('SELECT * FROM registrations');
        output += JSON.stringify(regs, null, 2) + '\n\n';

        output += '--- CERTIFICATES ---\n';
        const [certs] = await connection.query('SELECT * FROM certificates');
        output += JSON.stringify(certs, null, 2) + '\n';

        fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), output);
        console.log('Debug data written to debug_output.txt');

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

debugData();
