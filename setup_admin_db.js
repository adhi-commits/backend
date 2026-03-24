const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub'
};

async function setupAdminFeatures() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Update users table role ENUM
        console.log('Updating users table role ENUM...');
        await connection.execute(`
            ALTER TABLE users 
            MODIFY COLUMN role ENUM('volunteer', 'organizer', 'admin') NOT NULL;
        `);

        // 2. Add organizer_status and organizer_id_url columns
        console.log('Adding organizer_status and organizer_id_url to users table...');
        
        // We'll use a standard try-catch per alter in case they already exist
        try {
            await connection.execute(`
                ALTER TABLE users 
                ADD COLUMN organizer_status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending' AFTER role,
                ADD COLUMN organizer_id_url VARCHAR(255) AFTER organizer_status;
            `);
            console.log('Columns added successfully.');
        } catch (colErr) {
             if (colErr.code === 'ER_DUP_FIELDNAME') {
                 console.log('Columns already exist, skipping...');
             } else {
                 throw colErr;
             }
        }
        
        // Ensure all existing organizers are approved by default
        await connection.execute(`
            UPDATE users SET organizer_status = 'Approved' WHERE role = 'organizer' AND organizer_status = 'Pending';
        `);

        // 3. Create feedbacks table
        console.log('Creating feedbacks table...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS feedbacks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                message TEXT NOT NULL,
                status ENUM('New', 'Reviewed', 'Resolved') DEFAULT 'New',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('Feedbacks table created successfully.');

        console.log('Admin Panel Database modifications complete.');

    } catch (error) {
        console.error('Error modifying database:', error);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

setupAdminFeatures();
