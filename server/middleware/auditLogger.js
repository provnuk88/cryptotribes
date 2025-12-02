/**
 * AUDIT LOGGER MIDDLEWARE
 * Automatically logs all admin actions
 */

const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Create audit logging middleware
 * @param {string} action - Action name (e.g., 'PLAYER_BAN', 'SEASON_CREATE')
 * @param {Function|Object} getTargetInfo - Function to extract target info from request/response
 */
const auditLogger = (action, getTargetInfo) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response
    res.json = async (data) => {
      try {
        // Only log if admin is authenticated and action succeeded
        if (req.admin && data.success !== false) {
          let targetInfo = {};

          if (typeof getTargetInfo === 'function') {
            try {
              targetInfo = await getTargetInfo(req, data);
            } catch (e) {
              targetInfo = {};
            }
          } else if (getTargetInfo) {
            targetInfo = getTargetInfo;
          }

          await AdminAuditLog.create({
            adminId: req.admin._id,
            adminRole: req.admin.role,
            adminUsername: req.admin.username,
            action: action,
            target: {
              type: targetInfo.type || 'system',
              id: targetInfo.id || null,
              name: targetInfo.name || null
            },
            details: {
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
              query: req.query,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            },
            changes: targetInfo.changes || null,
            result: data.success ? 'success' : 'failure',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Audit log error:', error);
        // Don't fail the request if audit logging fails
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Remove sensitive fields from logged body
 */
const sanitizeBody = (body) => {
  if (!body) return null;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.twoFactorCode;
  delete sanitized.signature;
  delete sanitized.refreshToken;
  return sanitized;
};

/**
 * Simple audit log function for direct use
 */
const logAdminAction = async (admin, action, target, changes = null) => {
  try {
    await AdminAuditLog.create({
      adminId: admin._id,
      adminRole: admin.role,
      adminUsername: admin.username,
      action,
      target: {
        type: target.type || 'system',
        id: target.id || null,
        name: target.name || null
      },
      changes,
      result: 'success',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

module.exports = auditLogger;
module.exports.logAdminAction = logAdminAction;
