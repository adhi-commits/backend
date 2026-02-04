const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

// Register
router.post('/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, skills } = req.body;

        // Construct full name
        const name = `${firstName || ''} ${lastName || ''}`.trim() || 'Anonymous';

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const skillsJson = JSON.stringify(skills || []);

        const [result] = await db.execute(
            'INSERT INTO users (name, email, password_hash, role, skills) VALUES (?, ?, ?, ?, ?)',
            [name, email, passwordHash, role, skillsJson]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error(error);
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
