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
const Organization = require('../models/Organization');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ── Standard auth ──────────────────────────────────────────────────────────
router.post('/register', registerUser);
router.post('/register-organization', registerOrganizationAdmin);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.post('/join-organization', protect, joinOrganization);

// ── Set role: student / teacher (called after Google OAuth) ───────────────
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

// ── Setup organization: for Google users who choose "Create Organization" ──
router.post('/setup-organization', protect, async (req, res) => {
    try {
        const { organizationName, organizationType } = req.body;

        if (!organizationName || !organizationName.trim()) {
            return res.status(400).json({ message: 'Organization name is required' });
        }

        // Check org name not already taken
        const existing = await Organization.findOne({
            nameNormalized: organizationName.trim().toLowerCase(),
        });
        if (existing) {
            return res.status(400).json({ message: 'An organization with this name already exists' });
        }

        // Generate unique org code
        let orgCode = '';
        let codeExists = true;
        while (codeExists) {
            const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
            orgCode = `ORG-${rand}`;
            codeExists = !!(await Organization.findOne({ organizationCode: orgCode }));
        }

        // Create organization
        const organization = await Organization.create({
            name: organizationName.trim(),
            organizationCode: orgCode,
            organizationType: organizationType || 'other',
            admin: req.user._id,
        });

        // Update user: set role=admin, link org
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { role: 'admin', organizationId: organization._id },
            { new: true }
        );

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: organization._id,
            organizationCode: organization.organizationCode,
            organizationName: organization.name,
            token: generateToken(user._id),
        });
    } catch (err) {
        console.error('setup-organization error:', err.message);
        res.status(500).json({ message: 'Failed to create organization' });
    }
});

// ── Google OAuth ───────────────────────────────────────────────────────────
// Why session: false?
// Passport's default state-check stores a random nonce in the Express session
// and expects the session cookie to round-trip through Google's redirect.
// In local development (frontend :3000 → backend :5000 → Google → :5000),
// browsers block the session cookie as cross-origin, so the nonce is never
// found and Passport throws "Bad Request".
// session:false skips state verification AND session persistence entirely;
// req.user is still populated for the duration of the callback handler.

// Step 1: redirect to Google
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// Step 2: Google redirects back here
router.get(
    '/google/callback',
    passport.authenticate('google', {
        failureRedirect: `${FRONTEND_URL}/login?error=google_failed`,
        session: false,
    }),
    (req, res) => {
        if (!req.user) {
            return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
        }

        const { user, isNew } = req.user;
        const token = generateToken(user._id);

        const params = new URLSearchParams({
            token,
            name:  user.name,
            email: user.email,
            role:  user.role,
            id:    user._id.toString(),
            new:   isNew ? '1' : '0',
            ...(user.organizationId ? { orgId: user.organizationId.toString() } : {}),
        });

        res.redirect(`${FRONTEND_URL}/auth/callback?${params.toString()}`);
    }
);

module.exports = router;
