const asyncHandler = require('express-async-handler');
const Organization = require('../models/Organization');
const User = require('../models/User');

// @desc    Create a new organization
// @route   POST /api/organizations
// @access  Private/Superadmin
const createOrganization = asyncHandler(async (req, res) => {
    const { name, domain, adminEmail } = req.body;

    const orgExists = await Organization.findOne({ name });
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
    const organizations = await Organization.find({}).populate('admin', 'name email');
    res.json(organizations);
});

// @desc    Get organization members
// @route   GET /api/organizations/:id/members
// @access  Private/Admin
const getOrgMembers = asyncHandler(async (req, res) => {
    const users = await User.find({ organizationId: req.params.id }).select('-password');
    res.json(users);
});

// @desc    Add user to organization
// @route   POST /api/organizations/:id/members
// @access  Private/Admin
const addUserToOrg = asyncHandler(async (req, res) => {
    const { email, role } = req.body;
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

module.exports = {
    createOrganization,
    getOrganizations,
    getOrgMembers,
    addUserToOrg,
};
