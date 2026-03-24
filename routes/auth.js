const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Make sure 'uploads/' directory exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });


// Register
router.post('/register', upload.single('organizer_id'), async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, role, skills } = req.body;

        // Construct full name
        const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Anonymous';

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (role === 'admin') {
            return res.status(403).json({ error: 'Admin registration is not allowed via the public portal' });
        }

        if (role === 'volunteer' && (!skills || !Array.isArray(skills) || skills.length === 0)) {
            return res.status(400).json({ error: 'At least one skill is required for volunteers' });
        }

        let organizer_id_url = null;
        let organizer_status = 'Approved'; // Default for volunteers/admins

        if (role === 'organizer') {
            if (!req.file) {
                 return res.status(400).json({ error: 'Organizer ID document is required' });
            }
            organizer_id_url = `/uploads/${req.file.filename}`;
            organizer_status = 'Pending';
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const skillsJson = JSON.stringify(skills || []);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, phone, password_hash, role, skills, organizer_status, organizer_id_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, phone, passwordHash, role, skillsJson, organizer_status, organizer_id_url]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('email')) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            if (error.message.includes('phone')) {
                return res.status(400).json({ error: 'Phone number already exists' });
            }
        }
        res.status(500).json({ error: 'Registration failed: ' + error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid password' });
        }

        // Restrict pending or rejected organizers
        if (user.role === 'organizer') {
            if (user.organizer_status === 'Pending') {
                return res.status(403).json({ error: 'Your organizer account is still under review.' });
            }
            if (user.organizer_status === 'Rejected') {
                return res.status(403).json({ error: 'Your organizer account was rejected.' });
            }
        }

        // Remove password hash before sending
        delete user.password_hash;
        user.skills = JSON.parse(user.skills || '[]');

        res.json({
            message: 'Login successful',
            user: user
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

module.exports = router;
