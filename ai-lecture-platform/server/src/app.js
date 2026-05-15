const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,          // needed so cookies/session work across origins
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Session (only used during the Google OAuth dance, not for ongoing auth) ─
app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'echobrain-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 5-min lifespan — enough for OAuth flow
}));

// ── Passport ───────────────────────────────────────────────────────────────
app.use(passport.initialize());
app.use(passport.session());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/lectures', require('./routes/lectureRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));

app.get('/', (req, res) => res.send('AI Lecture Platform API is running...'));

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('SERVER ERROR:', err.message);
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

module.exports = app;
