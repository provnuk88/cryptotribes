/**
 * ADMIN ROUTES INDEX
 * Mounts all admin routes
 */

const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');

// Public routes (no auth)
router.use('/auth', require('./auth'));

// Protected routes (require admin auth)
router.use(adminAuth);

router.use('/seasons', require('./seasons'));
router.use('/players', require('./players'));
router.use('/tribes', require('./tribes'));
router.use('/battles', require('./battles'));
router.use('/moderation', require('./moderation'));
router.use('/analytics', require('./analytics'));
router.use('/config', require('./config'));
router.use('/audit-logs', require('./auditLogs'));

module.exports = router;
