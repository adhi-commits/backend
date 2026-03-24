const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
});

async function testQuery() {
    try {
        const connection = await pool.getConnection();
        console.log('Testing Certificate Query...');
        const userId = 2; // Tony Stark
        try {
            const [rows] = await connection.query(`
                SELECT c.*, camp.title as campaign_title, u.name as campaign_org 
                FROM certificates c
                LEFT JOIN campaigns camp ON c.campaign_id = camp.id
                LEFT JOIN users u ON camp.organizer_id = u.id
                WHERE c.user_id = ?
                ORDER BY c.issued_at DESC
            `, [userId]);
            console.log('Query success:', JSON.stringify(rows, null, 2));
        } catch (err) {
            console.error('Query failed:', err.message);
        }

        const [columns] = await connection.query('SHOW COLUMNS FROM campaigns');
        console.log('Campaign Columns:', columns.map(c => c.Field).join(', '));

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Connection Error:', error);
        process.exit(1);
    }
}

testQuery();
