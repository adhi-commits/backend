const express = require('express');
const router = express.Router();
const db = require('../config/db');

// List campaigns (with optional organizer_id or user_id for joined)
router.get('/', async (req, res) => {
    try {
        const { organizer_id, user_id } = req.query;
        let query;
        let params = [];

        if (organizer_id) {
            query = `
                SELECT c.*, 
                       COALESCE(COUNT(DISTINCT r.id), 0) as volunteers_current
                FROM campaigns c
                LEFT JOIN registrations r ON c.id = r.campaign_id
                WHERE c.organizer_id = ?
                GROUP BY c.id
            `;
            params.push(organizer_id);
        } else if (user_id) {
            query = `
                SELECT c.*, 
                       r.status as registration_status,
                       COALESCE(COUNT(DISTINCT r2.id), 0) as volunteers_current
                FROM campaigns c 
                JOIN registrations r ON c.id = r.campaign_id 
                LEFT JOIN registrations r2 ON c.id = r2.campaign_id
                WHERE r.user_id = ?
                GROUP BY c.id, r.status
            `;
            params.push(user_id);
        } else {
            // Default: List all campaigns with volunteer counts
            query = `
                SELECT c.*, 
                       COALESCE(COUNT(DISTINCT r.id), 0) as volunteers_current
                FROM campaigns c
                LEFT JOIN registrations r ON c.id = r.campaign_id
                GROUP BY c.id
            `;
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

        if (!title || !description || !category || !location || !start_date || !end_date || !volunteers_target || !organizer_id) {
            return res.status(400).json({ error: 'All fields are required' });
        }

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

// Update a campaign
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, location, start_date, end_date, volunteers_target, organizer_id } = req.body;

        if (!organizer_id) {
            return res.status(401).json({ error: 'Unauthorized: Missing organizer ID' });
        }

        // Optional: verify that the user actually owns this campaign before editing
        const [existing] = await db.execute('SELECT organizer_id FROM campaigns WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }
        
        console.log('Comparing organizer_id:', {
            existing: existing[0].organizer_id,
            existingType: typeof existing[0].organizer_id,
            provided: organizer_id,
            providedType: typeof organizer_id,
            matches: String(existing[0].organizer_id) === String(organizer_id)
        });

        if (String(existing[0].organizer_id) !== String(organizer_id)) {
            return res.status(403).json({ error: 'Forbidden: You can only edit your own campaigns' });
        }

        const [result] = await db.execute(
            `UPDATE campaigns 
             SET title = ?, description = ?, category = ?, location = ?, start_date = ?, end_date = ?, volunteers_target = ? 
             WHERE id = ? AND organizer_id = ?`,
            [title, description, category, location, start_date, end_date, volunteers_target, id, organizer_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Campaign not found or no changes made' });
        }

        res.json({ message: 'Campaign updated successfully' });
    } catch (error) {
        console.error('Error updating campaign:', error);
        res.status(500).json({ error: 'Failed to update campaign' });
    }
});

// Get single campaign details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT c.*, 
                   COALESCE(COUNT(DISTINCT r.id), 0) as volunteers_current
            FROM campaigns c
            LEFT JOIN registrations r ON c.id = r.campaign_id
            WHERE c.id = ?
            GROUP BY c.id
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch campaign details' });
    }
});

// Get volunteers for a campaign (Organizer only)
router.get('/:id/volunteers', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT r.id as registration_id, r.status, r.registered_at,
                   u.id as user_id, u.name, u.email, u.phone, u.skills
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.campaign_id = ?
            ORDER BY r.registered_at DESC
        `;
        const [rows] = await db.execute(query, [id]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch volunteers' });
    }
});

// Update registration status (Organizer only)
router.post('/registrations/:regId/status', async (req, res) => {
    try {
        const { regId } = req.params;
        const { status } = req.body; // 'Pending', 'Approved', 'Rejected'

        if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.execute(
            'UPDATE registrations SET status = ? WHERE id = ?',
            [status, regId]
        );

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

router.post('/join', async (req, res) => {
    const { user_id, campaign_id, phone, skills } = req.body;

    // 1. Basic Validation
    if (!user_id || !campaign_id) {
        return res.status(400).json({ error: 'Missing user ID or campaign ID' });
    }

    try {
        const connection = await db.getConnection(); // Get connection for transaction/locking
        await connection.beginTransaction();

        try {
            // 2. Check if user is already registered for this campaign
            const [existing] = await connection.execute(
                'SELECT id FROM registrations WHERE user_id = ? AND campaign_id = ?',
                [user_id, campaign_id]
            );

            if (existing.length > 0) {
                await connection.rollback();
                connection.release();
                return res.status(409).json({ error: 'You have already joined this campaign!' });
            }

            // 3. Get target campaign details (target, current count, start_date, end_date)
            const [campaignRows] = await connection.execute(
                `SELECT c.volunteers_target, c.title, c.start_date, c.end_date, COUNT(r.id) as current_count 
                 FROM campaigns c 
                 LEFT JOIN registrations r ON c.id = r.campaign_id 
                 WHERE c.id = ? 
                 GROUP BY c.id FOR UPDATE`,
                [campaign_id]
            );

            if (campaignRows.length === 0) {
                await connection.rollback();
                connection.release();
                return res.status(404).json({ error: 'Campaign not found' });
            }

            const { volunteers_target, current_count, start_date, end_date } = campaignRows[0];

            // 4. Check for time overlap with existing registrations
            const [overlapping] = await connection.execute(
                `SELECT c.title 
                 FROM registrations r
                 JOIN campaigns c ON r.campaign_id = c.id
                 WHERE r.user_id = ? 
                   AND c.start_date < ? 
                   AND c.end_date > ?`,
                [user_id, end_date, start_date]
            );

            if (overlapping.length > 0) {
                await connection.rollback();
                connection.release();
                const overlappingTitle = overlapping[0].title;
                return res.status(409).json({ error: `Time conflict: You are already registered for an overlapping event: '${overlappingTitle}'.` });
            }

            if (current_count >= volunteers_target) {
                await connection.rollback();
                connection.release();
                return res.status(400).json({ error: 'Campaign is full. No slots available.' });
            }

            // 5. Update user's phone and skills if provided
            if (phone || skills) {
                const skillsJson = skills ? JSON.stringify(skills) : null;
                await connection.execute(
                    'UPDATE users SET phone = COALESCE(?, phone), skills = COALESCE(?, skills) WHERE id = ?',
                    [phone || null, skillsJson, user_id]
                );
            }

            // 6. Insert the registration
            await connection.execute(
                'INSERT INTO registrations (user_id, campaign_id, registered_at) VALUES (?, ?, NOW())',
                [user_id, campaign_id]
            );

            await connection.commit();
            connection.release();

            return res.status(200).json({ message: 'Successfully joined the campaign' });

        } catch (error) {
            await connection.rollback();
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Cancel a registration
router.post('/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
        return res.status(400).json({ error: 'Missing user ID' });
    }

    try {
        const [result] = await db.execute(
            'DELETE FROM registrations WHERE campaign_id = ? AND user_id = ?',
            [id, user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        res.json({ message: 'Successfully cancelled registration' });
    } catch (error) {
        console.error('Error cancelling registration:', error);
        res.status(500).json({ error: 'Failed to cancel registration' });
    }
});

module.exports = router;
