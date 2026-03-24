const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
});

async function checkCertificates() {
    try {
        const connection = await pool.getConnection();
        const [rows] = await connection.query('SELECT * FROM certificates');
        console.log('Certificates in DB:', rows);
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkCertificates();
