const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'volunteer_hub'
};

async function testAdminFlow() {
    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected!');

        // 1. Create a dummy test organizer manually simulating the POST /register route
        console.log('\n--- Step 1: Simulating Organizer Registration ---');
        const orgEmail = `testorg_${Date.now()}@example.com`;
        const testPass = 'Password123!';
        const salt = await bcrypt.genSalt(10);
        const passHash = await bcrypt.hash(testPass, salt);

        const [insertResult] = await connection.execute(
            'INSERT INTO users (name, email, phone, password_hash, role, organizer_status, organizer_id_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ['Test Organization', orgEmail, `555-${Date.now().toString().slice(-4)}`, passHash, 'organizer', 'Pending', '/uploads/test-id.pdf']
        );
        const organizerId = insertResult.insertId;
        console.log(`Created new Organizer with ID ${organizerId} and status 'Pending'.`);

        // 2. Fetch Pending Organizers (simulating Admin route)
        console.log('\n--- Step 2: Fetching Pending Organizers ---');
        const [pendingOrgs] = await connection.execute(
            'SELECT id, name, organizer_status FROM users WHERE role = "organizer" AND organizer_status = "Pending"'
        );
        console.log(`Found ${pendingOrgs.length} pending organizer(s):`, pendingOrgs);

        // 3. Approve the organizer (simulating Admin route)
        console.log('\n--- Step 3: Approving Organizer ---');
        await connection.execute('UPDATE users SET organizer_status = "Approved" WHERE id = ?', [organizerId]);
        const [checkOrg] = await connection.execute('SELECT organizer_status FROM users WHERE id = ?', [organizerId]);
        console.log(`Organizer ${organizerId} status is now: ${checkOrg[0].organizer_status}`);

        // 4. Create mock feedback
        console.log('\n--- Step 4: Creating Mock Feedback ---');
        const [fbResult] = await connection.execute(
            'INSERT INTO feedbacks (user_id, message) VALUES (?, ?)',
            [organizerId, 'This is a test feedback message about the platform.']
        );
        const feedbackId = fbResult.insertId;
        console.log(`Created feedback with ID ${feedbackId}`);

        // 5. Fetch and update feedback (simulating Admin routes)
        console.log('\n--- Step 5: Updating Feedback Status ---');
        await connection.execute('UPDATE feedbacks SET status = "Resolved" WHERE id = ?', [feedbackId]);
        const [checkFb] = await connection.execute('SELECT status FROM feedbacks WHERE id = ?', [feedbackId]);
        console.log(`Feedback ${feedbackId} status is now: ${checkFb[0].status}`);

        console.log('\n✅ All Database flows tested successfully!');

        // Cleanup
        await connection.execute('DELETE FROM users WHERE id = ?', [organizerId]);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

testAdminFlow();
