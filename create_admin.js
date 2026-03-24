const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub'
};

async function createDefaultAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        
        const adminEmail = 'admin@volunteerhub.com';
        const adminPassword = 'AdminPassword123!';
        
        // Check if admin already exists
        const [existing] = await connection.execute('SELECT * FROM users WHERE email = ?', [adminEmail]);
        if (existing.length > 0) {
            console.log('Default admin user already exists.');
            console.log(`Email: ${adminEmail}`);
            return;
        }

        // Create admin user
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        await connection.execute(
            'INSERT INTO users (name, email, phone, password_hash, role, organizer_status) VALUES (?, ?, ?, ?, ?, ?)',
            ['Hub Admin', adminEmail, '0000000000', passwordHash, 'admin', 'Approved']
        );
        
        console.log('=== Default Admin User Created Successfully! ===');
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
        console.log("================================================");

    } catch (error) {
        console.error('Failed to create admin:', error);
    } finally {
        if (connection) await connection.end();
    }
}

createDefaultAdmin();
