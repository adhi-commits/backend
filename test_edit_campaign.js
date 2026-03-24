const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub'
};

async function testEditCampaign() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        console.log('\n--- Step 1: Using the default Admin user ---');
        const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', ['admin@volunteerhub.com']);
        if (users.length === 0) {
            console.log("Admin user doesn't exist, run create_admin.js first!");
            return;
        }
        const adminId = users[0].id;
        console.log(`Using Admin ID: ${adminId}`);

        console.log('\n--- Step 2: Creating a test Campaign ---');
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 86400000); // 1 day later
        
        const [insertResult] = await connection.execute(
            'INSERT INTO campaigns (title, description, category, location, start_date, end_date, volunteers_target, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            ['Initial Title', 'Initial Desc', 'Education', 'Test City', startDate, endDate, 10, adminId]
        );
        const campaignId = insertResult.insertId;
        console.log(`Created test campaign with ID: ${campaignId}`);

        console.log('\n--- Step 3: Editing the test Campaign via script logic ---');
        const [updateResult] = await connection.execute(
            `UPDATE campaigns 
             SET title = ?, description = ?, volunteers_target = ? 
             WHERE id = ? AND organizer_id = ?`,
            ['Updated Title', 'Updated Desc', 50, campaignId, adminId]
        );
        console.log(`Update affected rows: ${updateResult.affectedRows}`);

        const [verifyResult] = await connection.execute('SELECT title, description, volunteers_target FROM campaigns WHERE id = ?', [campaignId]);
        console.log('Post-update Campaign details:', verifyResult[0]);

        if (verifyResult[0].title === 'Updated Title' && verifyResult[0].volunteers_target === 50) {
            console.log('\n✅ Verification passed! Campaign successfully details updated by owner.');
        } else {
             console.log('\n❌ Verification failed.');
        }

        // Cleanup
        await connection.execute('DELETE FROM campaigns WHERE id = ?', [campaignId]);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testEditCampaign();
