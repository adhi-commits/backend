const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub',
});

async function applyConstraint() {
    try {
        const connection = await pool.getConnection();
        console.log('Resolving duplicates...');

        // Specially handle known duplicate: Set User 3's phone to NULL
        await connection.query('UPDATE users SET phone = NULL WHERE id = 3');
        console.log('Updated user 3 phone to NULL');

        console.log('Applying UNIQUE constraint to phone column...');
        try {
            await connection.query('ALTER TABLE users ADD CONSTRAINT unique_phone UNIQUE (phone)');
            console.log('Constraint applied successfully.');
        } catch (err) {
            if (err.code === 'ER_DUP_KEY' || err.code === 'ER_DUP_ENTRY') {
                console.error('Failed to apply constraint: Duplicate entries still exist.');
            } else if (err.code === 'ER_DUP_KEYNAME') {
                console.log('Constraint already exists.');
            } else {
                console.error('Error applying constraint:', err);
            }
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

applyConstraint();
