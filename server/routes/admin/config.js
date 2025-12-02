/**
 * ADMIN CONFIG ROUTES
 * System configuration and admin user management (Super Admin only)
 */

const express = require('express');
const router = express.Router();
const Admin = require('../../models/Admin');
const { requireRole } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

/**
 * List all admins
 * GET /api/admin/config/admins
 */
router.get('/admins', requireRole('super_admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const admins = await Admin.find()
      .select('-passwordHash -twoFactorSecret')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Admin.countDocuments();

    res.json({
      success: true,
      data: admins.map(a => ({ ...a.toObject(), id: a._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Create new admin
 * POST /api/admin/config/admins
 */
router.post('/admins',
  requireRole('super_admin'),
  auditLogger('ADMIN_CREATE', (req, data) => ({
    type: 'admin',
    id: data.data?._id,
    name: req.body.username
  })),
  async (req, res) => {
    try {
      const { username, email, walletAddress, role, password } = req.body;

      if (!username || !role) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Username and role are required' }
        });
      }

      // Validate role-specific requirements
      if (role === 'super_admin' && (!email || !password)) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Super Admin requires email and password' }
        });
      }

      if (['game_master', 'moderator'].includes(role) && !walletAddress) {
        return res.status(400).json({
          success: false,
          error: { code: 'MISSING_FIELDS', message: 'Game Master and Moderator require wallet address' }
        });
      }

      const adminData = {
        username,
        role,
        createdBy: req.admin._id
      };

      if (email) adminData.email = email.toLowerCase();
      if (walletAddress) adminData.walletAddress = walletAddress.toLowerCase();
      if (password) adminData.passwordHash = password;

      const admin = await Admin.create(adminData);

      res.json({
        success: true,
        data: { ...admin.toJSON(), id: admin._id }
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: { code: 'DUPLICATE', message: 'Username, email, or wallet already exists' }
        });
      }
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Update admin
 * PUT /api/admin/config/admins/:adminId
 */
router.put('/admins/:adminId',
  requireRole('super_admin'),
  auditLogger('ADMIN_UPDATE', (req) => ({
    type: 'admin',
    id: req.params.adminId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const { isActive, role, customPermissions, ipWhitelist } = req.body;

      const admin = await Admin.findById(req.params.adminId);

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin not found' }
        });
      }

      // Cannot modify yourself
      if (admin._id.toString() === req.admin._id.toString()) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_MODIFY_SELF', message: 'Cannot modify your own account' }
        });
      }

      if (isActive !== undefined) admin.isActive = isActive;
      if (role) admin.role = role;
      if (customPermissions) admin.customPermissions = customPermissions;
      if (ipWhitelist) admin.ipWhitelist = ipWhitelist;

      await admin.save();

      res.json({
        success: true,
        data: { ...admin.toJSON(), id: admin._id }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Delete admin
 * DELETE /api/admin/config/admins/:adminId
 */
router.delete('/admins/:adminId',
  requireRole('super_admin'),
  auditLogger('ADMIN_DELETE', (req) => ({
    type: 'admin',
    id: req.params.adminId
  })),
  async (req, res) => {
    try {
      const admin = await Admin.findById(req.params.adminId);

      if (!admin) {
        return res.status(404).json({
          success: false,
          error: { code: 'ADMIN_NOT_FOUND', message: 'Admin not found' }
        });
      }

      // Cannot delete yourself
      if (admin._id.toString() === req.admin._id.toString()) {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DELETE_SELF', message: 'Cannot delete your own account' }
        });
      }

      // Cannot delete the last super admin
      if (admin.role === 'super_admin') {
        const superAdminCount = await Admin.countDocuments({ role: 'super_admin' });
        if (superAdminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: { code: 'LAST_SUPER_ADMIN', message: 'Cannot delete the last Super Admin' }
          });
        }
      }

      await admin.deleteOne();

      res.json({ success: true, data: { message: 'Admin deleted' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Get system configuration
 * GET /api/admin/config/system
 */
router.get('/system', requireRole('super_admin'), async (req, res) => {
  try {
    // Return system config (from env or database)
    const config = {
      environment: process.env.NODE_ENV || 'development',
      jwtExpiry: '8h',
      rateLimits: {
        auth: '10 per 15min (prod) / 100 per 15min (dev)',
        global: '100 per hour',
        attack: '20 per hour'
      },
      features: {
        maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
        registrationOpen: process.env.REGISTRATION_OPEN !== 'false'
      }
    };

    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Update system configuration
 * PUT /api/admin/config/system
 */
router.put('/system',
  requireRole('super_admin'),
  auditLogger('CONFIG_UPDATE', (req) => ({
    type: 'system',
    changes: req.body
  })),
  async (req, res) => {
    try {
      // For now, just acknowledge - in real implementation, would update database config
      const { maintenanceMode, registrationOpen } = req.body;

      // Would typically save to database or config service
      const updatedConfig = {
        maintenanceMode: maintenanceMode ?? false,
        registrationOpen: registrationOpen ?? true
      };

      res.json({
        success: true,
        data: {
          message: 'Configuration updated',
          config: updatedConfig
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

module.exports = router;
