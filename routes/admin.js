const express = require('express');
const router = express.Router();
const db = require('../config/db');

// --- Organizers ---

// Get all organizers who are 'Pending'
router.get('/organizers/pending', async (req, res) => {
    try {
        const [rows] = await db.execute(
            'SELECT id, name, email, phone, organizer_id_url, created_at FROM users WHERE role = "organizer" AND organizer_status = "Pending"'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching pending organizers:', error);
        res.status(500).json({ error: 'Failed to fetch pending organizers' });
    }
});

// Approve an organizer
router.post('/organizers/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE users SET organizer_status = "Approved" WHERE id = ? AND role = "organizer"', [id]);
        res.json({ message: 'Organizer approved successfully' });
    } catch (error) {
        console.error('Error approving organizer:', error);
        res.status(500).json({ error: 'Failed to approve organizer' });
    }
});

// Reject an organizer
router.post('/organizers/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE users SET organizer_status = "Rejected" WHERE id = ? AND role = "organizer"', [id]);
        res.json({ message: 'Organizer rejected successfully' });
    } catch (error) {
        console.error('Error rejecting organizer:', error);
        res.status(500).json({ error: 'Failed to reject organizer' });
    }
});

// Disable an existing organizer
router.post('/organizers/:id/disable', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('UPDATE users SET organizer_status = "Rejected" WHERE id = ? AND role = "organizer"', [id]);
        res.json({ message: 'Organizer disabled successfully' });
    } catch (error) {
        console.error('Error disabling organizer:', error);
        res.status(500).json({ error: 'Failed to disable organizer' });
    }
});

// Get all approved organizers and their campaigns
router.get('/organizers/approved', async (req, res) => {
    try {
        const [organizers] = await db.execute(
            'SELECT id, name, email, phone, organizer_id_url, created_at, organizer_status FROM users WHERE role = "organizer" AND organizer_status = "Approved"'
        );

        const [campaigns] = await db.execute('SELECT id, title, start_date, end_date, created_at, organizer_id, status FROM campaigns');

        const organizersWithCampaigns = organizers.map(org => {
            return {
                ...org,
                campaigns: campaigns.filter(c => c.organizer_id === org.id)
            };
        });

        res.json(organizersWithCampaigns);
    } catch (error) {
        console.error('Error fetching approved organizers:', error);
        res.status(500).json({ error: 'Failed to fetch approved organizers' });
    }
});

// Get all campaigns on the platform with organizer details
router.get('/campaigns/all', async (req, res) => {
    try {
        const query = `
            SELECT c.*, u.name as organizer_name, u.email as organizer_email 
            FROM campaigns c 
            JOIN users u ON c.organizer_id = u.id 
            ORDER BY c.created_at DESC
        `;
        const [campaigns] = await db.execute(query);
        res.json(campaigns);
    } catch (error) {
        console.error('Error fetching all campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch all campaigns' });
    }
});

// --- Feedback ---

// Get all feedback (optionally filter by status)
router.get('/feedback', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT f.id, f.message, f.status, f.created_at, u.name as user_name, u.email as user_email
            FROM feedbacks f
            JOIN users u ON f.user_id = u.id
            ORDER BY f.created_at DESC
        `;
        let params = [];
        
        if (status) {
            query = `
                SELECT f.id, f.message, f.status, f.created_at, u.name as user_name, u.email as user_email
                FROM feedbacks f
                JOIN users u ON f.user_id = u.id
                WHERE f.status = ?
                ORDER BY f.created_at DESC
            `;
            params.push(status);
        }

        const [rows] = await db.execute(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching feedback:', error);
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// Update feedback status
router.post('/feedback/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'New', 'Reviewed', 'Resolved'
        
        if (!['New', 'Reviewed', 'Resolved'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        await db.execute('UPDATE feedbacks SET status = ? WHERE id = ?', [status, id]);
        res.json({ message: 'Feedback status updated successfully' });
    } catch (error) {
        console.error('Error updating feedback status:', error);
        res.status(500).json({ error: 'Failed to update feedback status' });
    }
});

// --- Settings/Stats ---

// Get basic stats for Admin dashboard
router.get('/stats', async (req, res) => {
    try {
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        const [organizerCount] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "organizer"');
        const [campaignCount] = await db.execute('SELECT COUNT(*) as count FROM campaigns');
        const [feedbackCount] = await db.execute('SELECT COUNT(*) as count FROM feedbacks WHERE status = "New"');

        res.json({
            totalUsers: userCount[0].count,
            totalOrganizers: organizerCount[0].count,
            totalCampaigns: campaignCount[0].count,
            unreadFeedback: feedbackCount[0].count
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;
