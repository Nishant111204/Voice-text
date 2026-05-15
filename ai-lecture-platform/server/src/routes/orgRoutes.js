const express = require('express');
const router = express.Router();
const {
    createOrganization,
    getOrganizations,
    getOrgMembers,
    addUserToOrg,
    getMyOrganizationDetails,
} = require('../controllers/orgController');
const { protect, authorize } = require('../middleware/authMiddleware');

router
    .route('/')
    .get(protect, authorize('admin', 'superadmin'), getOrganizations)
    .post(protect, authorize('superadmin'), createOrganization);

router
    .route('/me/details')
    .get(protect, authorize('admin', 'superadmin'), getMyOrganizationDetails);

router
    .route('/:id/members')
    .get(protect, authorize('admin', 'superadmin'), getOrgMembers)
    .post(protect, authorize('admin', 'superadmin'), addUserToOrg);

module.exports = router;
