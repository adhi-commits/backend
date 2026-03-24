const db = require('./config/db');

async function testQuery() {
    try {
        console.log('Testing DB connection...');
        await db.query('SELECT 1');
        console.log('Connection successful.');

        console.log('Testing campaigns query...');
        const [rows] = await db.execute('SELECT * FROM campaigns');
        console.log('Campaigns query successful, rows:', rows.length);

        console.log('Testing organizer query...');
        // Mock organizer_id
        await db.execute('SELECT * FROM campaigns WHERE organizer_id = ?', [1]);
        console.log('Organizer query successful.');

        const userQuery = `
            SELECT c.*, r.status as registration_status 
            FROM campaigns c 
            JOIN registrations r ON c.id = r.campaign_id 
            WHERE r.user_id = ?
        `;
        await db.execute(userQuery, [1]);
        console.log('User join query successful.');

        console.log('Testing create with undefined param...');
        try {
            await db.execute(
                'INSERT INTO campaigns (title, description, category, location, start_date, end_date, volunteers_target, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                ['T', 'D', 'C', 'L', '2023-01-01', '2023-01-02', 10, undefined]
            );
        } catch (e) {
            console.log('Caught expected error for undefined param:');
            console.log(e);
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        db.end();
    }
}

testQuery();
