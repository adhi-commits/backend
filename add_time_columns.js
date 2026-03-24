const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,

    database: process.env.DB_NAME || 'volunteer_hub'
};

async function addTimeColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Modify start_date and end_date to DATETIME
        await connection.execute(`
            ALTER TABLE campaigns 
            MODIFY start_date DATETIME NOT NULL, 
            MODIFY end_date DATETIME NOT NULL;
        `);

        console.log('Successfully modified start_date and end_date to DATETIME.');

    } catch (error) {
        console.error('Error modifying table:', error);
    } finally {
        if (connection) await connection.end();
    }
}

addTimeColumns();
