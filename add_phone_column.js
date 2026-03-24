const db = require('./config/db');

async function addPhoneColumn() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database.');

        // Check if column exists
        const [columns] = await connection.query("SHOW COLUMNS FROM users LIKE 'phone'");

        if (columns.length === 0) {
            console.log('Adding phone column...');
            await connection.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) AFTER email");
            console.log('Phone column added successfully.');
        } else {
            console.log('Phone column already exists.');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error updating schema:', error);
        process.exit(1);
    }
}

addPhoneColumn();
