const mysql = require('mysql2/promise');
require('dotenv').config();

const schema = `
CREATE DATABASE IF NOT EXISTS volunteer_hub;
USE volunteer_hub;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('volunteer', 'organizer') NOT NULL,
    skills TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    location VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    volunteers_target INT NOT NULL,
    organizer_id INT NOT NULL,
    status ENUM('Active', 'Completed', 'Upcoming') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    campaign_id INT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_registration (user_id, campaign_id)
);
`;

async function setupDatabase() {
    try {
        // Connect without database selected to create it
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS
        });

        console.log('Connected to MySQL server.');

        // Split schema by commands (simple split by semicolon might be fragile but works for this simple schema)
        // Better: execute statement by statement manually or just run the CREATE DATABASE first

        await connection.query('CREATE DATABASE IF NOT EXISTS volunteer_hub');
        console.log('Database volunteer_hub checked/created.');

        await connection.end();

        // Now connect to the database to create tables
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        // Remove the CREATE DATABASE part and USE part effectively by just creating tables
        const tableSchema = schema.replace(/CREATE DATABASE[\s\S]*?USE volunteer_hub;/i, '');

        // Execute the rest of the schema
        await db.query(tableSchema);
        console.log('Tables created successfully.');

        await db.end();
        console.log('Database setup complete.');

    } catch (err) {
        console.error('Database setup failed:', err);
    }
}

setupDatabase();
