const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all recent conversations for a user
router.get('/conversations/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Find all unique users this user has messaged or received messages from
        const query = `
            SELECT u.id, u.name, u.role, u.email,
                   MAX(m.created_at) as last_message,
                   SUM(CASE WHEN m.receiver_id = ? AND m.is_read = FALSE THEN 1 ELSE 0 END) as unread_count
            FROM users u
            JOIN messages m ON (u.id = m.sender_id AND m.receiver_id = ?) 
                            OR (u.id = m.receiver_id AND m.sender_id = ?)
            WHERE u.id != ?
            GROUP BY u.id
            ORDER BY last_message DESC
        `;
        const [rows] = await db.execute(query, [userId, userId, userId, userId]);
        
        // Also fetch all admins and organizers just in case the user wants to start a new chat
        const [allPossibleUsers] = await db.execute('SELECT id, name, role, email FROM users WHERE role IN ("admin", "organizer") AND id != ?', [userId]);

        res.json({ existing_chats: rows, possible_contacts: allPossibleUsers });
    } catch (error) {
        console.error('Error fetching conversations:', error);
        res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

// Get message history between two users
router.get('/:userId/:otherUserId', async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        
        // Mark messages as read
        await db.execute(
            'UPDATE messages SET is_read = TRUE WHERE receiver_id = ? AND sender_id = ? AND is_read = FALSE',
            [userId, otherUserId]
        );

        const query = `
            SELECT id, sender_id, receiver_id, content, created_at, is_read
            FROM messages
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC
        `;
        const [rows] = await db.execute(query, [userId, otherUserId, otherUserId, userId]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a new message
router.post('/', async (req, res) => {
    try {
        const { sender_id, receiver_id, content } = req.body;
        
        if (!sender_id || !receiver_id || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [result] = await db.execute(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [sender_id, receiver_id, content]
        );

        const [newMessage] = await db.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);

        res.json({ message: 'Message sent successfully', data: newMessage[0] });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get unread message count for a user
router.get('/unread/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute(
            'SELECT COUNT(*) as unread_count FROM messages WHERE receiver_id = ? AND is_read = FALSE',
            [userId]
        );
        res.json({ unread_count: rows[0].unread_count });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed' });
    }
});

module.exports = router;
