const db = require('./config/db');

async function test() {
    console.log("Starting tests...");
    try {
        const [overlapping] = await db.execute(
            `SELECT c.title 
             FROM registrations r
             JOIN campaigns c ON r.campaign_id = c.id
             WHERE r.user_id = ? 
               AND c.start_date < ? 
               AND c.end_date > ?`,
            [1, new Date('2026-03-18T12:00:00'), new Date('2026-03-18T10:00:00')]
        );
        console.log("Overlap query executed successfully. Overlaps found:", overlapping.length);
        
        const [result] = await db.execute(
            'DELETE FROM registrations WHERE campaign_id = ? AND user_id = ?',
            [999, 1]
        );
        console.log("Delete query executed successfully. Rows affected:", result.affectedRows);
        
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        process.exit();
    }
}
test();
