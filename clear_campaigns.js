const db = require('./config/db');

async function clearCampaigns() {
    try {
        const connection = await db.getConnection();
        console.log('Connected to database.');

        // Disable foreign key checks to allow truncation if there are dependencies (like registrations)
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        console.log('Truncating campaigns table...');
        await connection.query('TRUNCATE TABLE campaigns');

        // Also clear registrations since they depend on campaigns
        console.log('Truncating registrations table...');
        await connection.query('TRUNCATE TABLE registrations');

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Campaigns and registrations cleared successfully.');
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('Error clearing campaigns:', error);
        process.exit(1);
    }
}

clearCampaigns();
