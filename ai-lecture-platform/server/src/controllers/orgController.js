const asyncHandler = require('express-async-handler');
const Organization = require('../models/Organization');
const User = require('../models/User');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private/Superadmin
const createOrganization = asyncHandler(async (req, res) => {
    const { name, domain, adminEmail, organizationType } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Organization name is required');
    }

    const orgExists = await Organization.findOne({
        nameNormalized: name.trim().toLowerCase(),
    });
    if (orgExists) {
        res.status(400);
        throw new Error('Organization already exists');
    }

    // Find the user who will be the admin
    const adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
        res.status(404);
        throw new Error('Admin user not found');
    }

    const organization = await Organization.create({
        name,
        organizationCode: `ORG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        organizationType: organizationType || 'other',
        domain,
        admin: adminUser._id,
    });

    // Update user role to admin and bind to org
    adminUser.role = 'admin';
    adminUser.organizationId = organization._id;
    await adminUser.save();

    res.status(201).json(organization);
});

// @desc    Get all organizations
// @route   GET /api/organizations
// @access  Private/Superadmin
const getOrganizations = asyncHandler(async (req, res) => {
    let organizations = [];

    if (req.user.role === 'superadmin') {
        organizations = await Organization.find({}).populate('admin', 'name email');
    } else {
        organizations = await Organization.find({
            _id: req.user.organizationId,
        }).populate('admin', 'name email');
    }

    res.json(organizations);
});

// @desc    Get organization members
// @route   GET /api/organizations/:id/members
// @access  Private/Admin
const getOrgMembers = asyncHandler(async (req, res) => {
    if (
        req.user.role === 'admin' &&
        req.user.organizationId?.toString() !== req.params.id
    ) {
        res.status(403);
        throw new Error('Admin can only view members of their own organization');
    }

    const users = await User.find({ organizationId: req.params.id }).select('-password');
    res.json(users);
});

// @desc    Add user to organization
// @route   POST /api/organizations/:id/members
// @access  Private/Admin
const addUserToOrg = asyncHandler(async (req, res) => {
    const { email, role } = req.body;
    if (
        req.user.role === 'admin' &&
        req.user.organizationId?.toString() !== req.params.id
    ) {
        res.status(403);
        throw new Error('Admin can only manage members of their own organization');
    }

    const user = await User.findOne({ email });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    user.organizationId = req.params.id;
    if (role) user.role = role;
    await user.save();

    res.json({ message: 'User added to organization', user });
});

// @desc    Get current organization details with members
// @route   GET /api/organizations/me/details
// @access  Private/Admin
const getMyOrganizationDetails = asyncHandler(async (req, res) => {
    if (!req.user.organizationId) {
        res.status(404);
        throw new Error('No organization is linked to this user');
    }

    const organization = await Organization.findById(req.user.organizationId).populate(
        'admin',
        'name email'
    );

    if (!organization) {
        res.status(404);
        throw new Error('Organization not found');
    }

    const members = await User.find({ organizationId: req.user.organizationId }).select(
        '-password'
    );

    res.json({
        organization,
        members,
    });
});

module.exports = {
    createOrganization,
    getOrganizations,
    getOrgMembers,
    addUserToOrg,
    getMyOrganizationDetails,
};
