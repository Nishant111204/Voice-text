const express = require('express');
const cors    = require('cors');
const morgan  = require('morgan');
const passport = require('./config/passport');
const path    = require('path');

const app = express();

// ── Core middleware ────────────────────────────────────────────────────────
app.use(cors({
    // Allow requests from the frontend and from Google OAuth redirect (no Origin header)
    origin: (origin, cb) => {
        const allowed = [
            process.env.FRONTEND_URL || 'http://localhost:3000',
        ];
        // Allow requests with no origin (Google redirect, server-to-server, Postman)
        if (!origin || allowed.includes(origin)) return cb(null, true);
        cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Passport (session: false on OAuth routes — no express-session needed) ─
app.use(passport.initialize());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/authRoutes'));
app.use('/api/lectures',      require('./routes/lectureRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));

app.get('/', (_req, res) => res.send('AI Lecture Platform API is running...'));

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
