/**
 * ADMIN AUTH MIDDLEWARE
 * JWT authentication for admin panel
 */

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Authentication required' }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ADMIN', message: 'Admin access required' }
      });
    }

    const admin = await Admin.findById(decoded.adminId);

    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ADMIN_INACTIVE', message: 'Admin account inactive' }
      });
    }

    // Check IP whitelist for Super Admin
    if (admin.role === 'super_admin' && admin.ipWhitelist?.length > 0) {
      const clientIP = req.ip || req.connection?.remoteAddress;
      const normalizedIP = clientIP?.replace('::ffff:', '');
      if (!admin.ipWhitelist.some(ip => ip === normalizedIP || ip === clientIP)) {
        return res.status(403).json({
          success: false,
          error: { code: 'IP_NOT_ALLOWED', message: 'IP not in whitelist' }
        });
      }
    }

    req.admin = admin;
    req.adminId = admin._id;
    req.adminRole = admin.role;

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
      });
    }
    return res.status(500).json({
      success: false,
      error: { code: 'AUTH_ERROR', message: error.message }
    });
  }
};

module.exports = adminAuth;
