const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/certificates');
        // Ensure directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Unique filename: timestamp-random-original
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and PDFs are allowed!'));
    }
});

// GET /api/certificates/user/:userId
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await pool.query(`
            SELECT c.*, camp.title as campaign_title, u.name as campaign_org 
            FROM certificates c
            LEFT JOIN campaigns camp ON c.campaign_id = camp.id
            LEFT JOIN users u ON camp.organizer_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.issued_at DESC
        `, [userId]);

        // Map rows to include full URL
        const protocol = req.protocol;
        const host = req.get('host');
        const certificates = rows.map(cert => ({
            ...cert,
            full_image_url: `${protocol}://${host}/uploads/certificates/${cert.image_url}`
        }));

        res.json(certificates);
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /api/certificates/issues
router.post('/issue', upload.single('certificate'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { user_id, campaign_id } = req.body;

        if (!user_id) {
            // Clean up uploaded file if validation fails
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ message: 'User ID is required' });
        }

        const imageUrl = req.file.filename;

        const [result] = await pool.query(
            'INSERT INTO certificates (user_id, campaign_id, image_url) VALUES (?, ?, ?)',
            [user_id, campaign_id || null, imageUrl]
        );

        res.status(201).json({
            message: 'Certificate issued successfully',
            certificateId: result.insertId,
            imageUrl: imageUrl
        });
    } catch (error) {
        console.error('Error issuing certificate:', error);
        // Clean up file if error
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
