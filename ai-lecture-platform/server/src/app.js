const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/lectures', require('./routes/lectureRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));

// Basic Routes
app.get('/', (req, res) => {
    res.send('AI Lecture Platform API is running...');
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('SERVER ERROR:', err.message);
    console.error(err.stack);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

module.exports = app;
