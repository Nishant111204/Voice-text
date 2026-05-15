const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

const generateOrganizationCode = async () => {
    let codeExists = true;
    let code = '';

    while (codeExists) {
        const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
        code = `ORG-${randomPart}`;
        const existing = await Organization.findOne({ organizationCode: code });
        codeExists = !!existing;
    }

    return code;
};

const escapeRegExp = (value) => {
    // Escape regex special chars for safe "exact (case-insensitive)" matching
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, organizationName, organizationId, organizationCode } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const safeRole = role || 'student';
    if (!['student', 'teacher'].includes(safeRole)) {
        res.status(400);
        throw new Error('Only student or teacher can use this signup route');
    }

    let organization = null;
    if (organizationId) {
        organization = await Organization.findById(organizationId);
        if (!organization) {
            res.status(404);
            throw new Error('Organization not found');
        }
    } else if (organizationCode && organizationCode.trim()) {
        organization = await Organization.findOne({
            organizationCode: organizationCode.trim().toUpperCase(),
        });
        if (!organization) {
            res.status(404);
            throw new Error('Organization code not found. Check the code and try again.');
        }
    } else if (organizationName && organizationName.trim()) {
        organization = await Organization.findOne({
            nameNormalized: organizationName.trim().toLowerCase(),
        });
        if (!organization) {
            res.status(404);
            throw new Error('Organization not found. Leave the fields blank to create a personal account.');
        }
    }
    // No org fields provided → personal account (no org linked)

    const user = await User.create({
        name,
        email,
        password,
        role: safeRole,
        organizationId: organization ? organization._id : undefined,
    });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: organization ? organization._id : null,
            organizationCode: organization ? organization.organizationCode : null,
            organizationName: organization ? organization.name : null,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data');
    }
});

// @desc    Register organization admin and create organization
// @route   POST /api/auth/register-organization
// @access  Public
const registerOrganizationAdmin = asyncHandler(async (req, res) => {
    const { adminName, email, password, organizationName, organizationType, domain } = req.body;

    if (!adminName || !email || !password || !organizationName) {
        res.status(400);
        throw new Error('Please provide admin name, email, password and organization name');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    const organizationExists = await Organization.findOne({
        nameNormalized: organizationName.trim().toLowerCase(),
    });
    if (organizationExists) {
        res.status(400);
        throw new Error('Organization already exists');
    }

    const organizationCode = await generateOrganizationCode();

    const adminUser = await User.create({
        name: adminName,
        email,
        password,
        role: 'admin',
    });

    try {
        const organization = await Organization.create({
            name: organizationName,
            organizationCode,
            organizationType: organizationType || 'other',
            domain,
            admin: adminUser._id,
        });

        adminUser.organizationId = organization._id;
        await adminUser.save();

        res.status(201).json({
            _id: adminUser._id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
            organizationId: organization._id,
            organizationCode: organization.organizationCode,
            organizationName: organization.name,
            token: generateToken(adminUser._id),
        });
    } catch (error) {
        await User.deleteOne({ _id: adminUser._id });
        throw error;
    }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').populate('organizationId');

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizationId: user.organizationId?._id || null,
            organizationCode: user.organizationId?.organizationCode || null,
            organizationName: user.organizationId?.name || null,
            token: generateToken(user._id),
        });
    } else {
        res.status(401);
        throw new Error('Invalid email or password');
    }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    const organization = req.user.organizationId
        ? await Organization.findById(req.user.organizationId)
        : null;

    const user = {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organizationId: req.user.organizationId,
        organizationCode: organization?.organizationCode || null,
        organizationName: organization?.name || null,
    };
    res.status(200).json(user);
});

// @desc    Join an existing organization (for accounts that may not have org linked yet)
// @route   POST /api/auth/join-organization
// @access  Private (student/teacher)
const joinOrganization = asyncHandler(async (req, res) => {
    const { organizationName, organizationCode } = req.body;
    if (!organizationName && !organizationCode) {
        res.status(400);
        throw new Error('Organization name or code is required');
    }

    const safeRole = req.user.role;
    if (!['student', 'teacher'].includes(safeRole)) {
        res.status(403);
        throw new Error('Only student/teacher can join organizations');
    }

    // Look up by code first (most reliable), then by name
    let organization = null;
    if (organizationCode && organizationCode.trim()) {
        organization = await Organization.findOne({
            organizationCode: organizationCode.trim().toUpperCase(),
        });
    }
    if (!organization && organizationName && organizationName.trim()) {
        const norm = organizationName.trim().toLowerCase();
        organization =
            (await Organization.findOne({ nameNormalized: norm })) ||
            (await Organization.findOne({
                name: { $regex: new RegExp(`^${escapeRegExp(organizationName.trim())}$`, 'i') },
            }));
    }

    if (!organization) {
        res.status(404);
        throw new Error('Organization not found');
    }

    // If already linked, just return current profile
    if (req.user.organizationId && req.user.organizationId.toString() === organization._id.toString()) {
        return res.json({
            ...req.user.toObject(),
            token: generateToken(req.user._id),
            organizationId: organization._id,
            organizationCode: organization.organizationCode,
            organizationName: organization.name,
        });
    }

    await User.findByIdAndUpdate(req.user._id, { organizationId: organization._id });

    const updatedOrganization = await Organization.findById(organization._id);

    res.status(200).json({
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        organizationId: updatedOrganization._id,
        organizationCode: updatedOrganization.organizationCode,
        organizationName: updatedOrganization.name,
        token: generateToken(req.user._id),
    });
});

module.exports = {
    registerUser,
    registerOrganizationAdmin,
    loginUser,
    getMe,
    joinOrganization,
};
