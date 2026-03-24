const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const feedbackRoutes = require('./routes/feedback');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/certificates', require('./routes/certificates'));
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
    res.send('Volunteer Hub API is running...');
});



app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    try {
        const connection = await pool.getConnection();
        console.log('Database connected successfully');
        connection.release();
    } catch (err) {
        console.error('Database connection failed:', err);
    }
});
