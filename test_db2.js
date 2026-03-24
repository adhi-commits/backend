require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'volunteer_hub'
  });
  
  const [counts] = await db.query('SELECT COUNT(*) FROM campaigns');
  console.log('Campaigns Count:', counts);
  
  const query = `
    SELECT c.*, u.name as organizer_name, u.email as organizer_email 
    FROM campaigns c 
    JOIN users u ON c.organizer_id = u.id 
    ORDER BY c.created_at DESC
  `;
  const [joined] = await db.query(query);
  console.log('Joined Campaigns:', joined);
  
  await db.end();
}
run();
