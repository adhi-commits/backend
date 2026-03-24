const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub'
};

async function testDateTime() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Insert a test campaign with specific time
        const [result] = await connection.execute(
            'INSERT INTO campaigns (title, description, category, location, start_date, end_date, volunteers_target, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Test DateTime Campaign', 'Testing datetime storage', 'Education', 'Test City', '2023-10-25 14:30:00', '2023-10-25 16:30:00', 10, 1] // Assuming organizer_id 1 exists from previous data
        );

        console.log('Inserted campaign ID:', result.insertId);

        // Retrieve and check format
        const [rows] = await connection.execute('SELECT start_date, end_date FROM campaigns WHERE id = ?', [result.insertId]);
        const campaign = rows[0];

        console.log('Retrieved Start Date:', campaign.start_date);
        console.log('Retrieved End Date:', campaign.end_date);

        // Clean up
        await connection.execute('DELETE FROM campaigns WHERE id = ?', [result.insertId]);
        console.log('Cleaned up test campaign.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testDateTime();
