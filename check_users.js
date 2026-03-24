const db = require('./config/db');

async function checkUsers() {
    try {
        const [rows] = await db.execute('SELECT id, name, email, phone FROM users');
        console.log('Current Users Data:');
        console.table(rows);
        process.exit(0);
    } catch (error) {
        console.error('Error fetching users:', error);
        process.exit(1);
    }
}

checkUsers();
