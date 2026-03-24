const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function recreateCertificatesTable() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to database.');

        console.log('Dropping certificates table...');
        await connection.query('DROP TABLE IF EXISTS certificates');

        console.log('Creating certificates table...');
        const createTableQuery = `
            CREATE TABLE certificates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                campaign_id INT,
                image_url VARCHAR(255) NOT NULL,
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
            )
        `;

        await connection.query(createTableQuery);
        console.log('Certificates table recreated successfully with image_url column.');

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error recreating table:', error);
        process.exit(1);
    }
}

recreateCertificatesTable();
