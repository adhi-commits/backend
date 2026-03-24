const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Submit Feedback (Volunteer -> Admin)
router.post('/', async (req, res) => {
    try {
        const { user_id, message } = req.body;

        if (!user_id || !message) {
            return res.status(400).json({ error: 'User ID and message are required' });
        }

        const [result] = await db.execute(
            'INSERT INTO feedbacks (user_id, message) VALUES (?, ?)',
            [user_id, message]
        );

        res.status(201).json({ message: 'Feedback submitted successfully', id: result.insertId });
    } catch (error) {
        console.error('Error submitting feedback:', error);
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

module.exports = router;
