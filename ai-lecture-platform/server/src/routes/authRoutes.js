const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const {
    registerUser,
    registerOrganizationAdmin,
    loginUser,
    getMe,
    joinOrganization,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Standard auth ──────────────────────────────────────────────────────────
router.post('/register', registerUser);
router.post('/register-organization', registerOrganizationAdmin);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/join-organization', protect, joinOrganization);

// ── Set role (called after Google OAuth for new users) ─────────────────────
router.post('/set-role', protect, async (req, res) => {
    const { role } = req.body;
    if (!['student', 'teacher'].includes(role)) {
        return res.status(400).json({ message: 'Role must be student or teacher' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { role }, { new: true });
    res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId || null,
        token: generateToken(user._id),
    });
});

// ── Google OAuth ───────────────────────────────────────────────────────────
// Step 1: redirect to Google
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: true })
);

// Step 2: Google redirects back here
router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/login?error=google_failed`, session: true }),
    (req, res) => {
        const { user, isNew } = req.user;          // set by Passport strategy
        const token = generateToken(user._id);

        // Redirect to frontend callback page with token + metadata
        const params = new URLSearchParams({
            token,
            name: user.name,
            email: user.email,
            role: user.role,
            id: user._id.toString(),
            new: isNew ? '1' : '0',
            ...(user.organizationId ? { orgId: user.organizationId.toString() } : {}),
        });

        res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
    }
);

module.exports = router;
