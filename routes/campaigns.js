const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List campaigns (with optional organizer_id or user_id for joined)
router.get('/', async (req, res) => {
    try {
        const { organizer_id, user_id } = req.query;
        let query = 'SELECT * FROM campaigns';
        let params = [];

        if (organizer_id) {
            query += ' WHERE organizer_id = ?';
            params.push(organizer_id);
        } else if (user_id) {
            query = `
                SELECT c.*, r.status as registration_status 
                FROM campaigns c 
                JOIN registrations r ON c.id = r.campaign_id 
                WHERE r.user_id = ?
            `;
            params.push(user_id);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});

// Create campaign
router.post('/create', async (req, res) => {
    try {
        const { title, description, category, location, start_date, end_date, volunteers_target, organizer_id } = req.body;

        const [result] = await db.execute(
            'INSERT INTO campaigns (title, description, category, location, start_date, end_date, volunteers_target, organizer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description, category, location, start_date, end_date, volunteers_target, organizer_id]
        );

        res.status(201).json({ message: 'Campaign created successfully', campaignId: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create campaign' });
    }
});

// Join campaign
router.post('/join', async (req, res) => {
    try {
        const { user_id, campaign_id } = req.body;

        await db.execute(
            'INSERT INTO registrations (user_id, campaign_id) VALUES (?, ?)',
            [user_id, campaign_id]
        );

        res.status(201).json({ message: 'Joined campaign successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to join campaign' });
    }
});

module.exports = router;
