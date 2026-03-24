const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('DB Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    hasPassword: !!process.env.DB_PASSWORD
});

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function addCertificatesTable() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database.');

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS certificates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT,
                image_url VARCHAR(255) NOT NULL,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
            );
        `;

        await connection.query(createTableQuery);
        console.log('Certificates table created or already exists.');

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error creating table:', error);
        process.exit(1);
    }
}

addCertificatesTable();
