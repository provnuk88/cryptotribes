/**
 * ROLE CHECK MIDDLEWARE
 * Permission-based access control for admin routes
 */

// Permission definitions
const PERMISSIONS = {
  // System
  'admins:manage': ['super_admin'],
  'audit:read_all': ['super_admin'],
  'config:edit': ['super_admin'],

  // Seasons
  'seasons:read': ['super_admin', 'game_master', 'moderator'],
  'seasons:create': ['super_admin', 'game_master'],
  'seasons:update': ['super_admin', 'game_master'],
  'seasons:delete': ['super_admin'],
  'seasons:start': ['super_admin'],
  'seasons:end': ['super_admin'],

  // Players
  'players:read': ['super_admin', 'game_master', 'moderator'],
  'players:flag': ['super_admin', 'game_master', 'moderator'],
  'players:warn': ['super_admin', 'game_master', 'moderator'],
  'players:ban_short': ['super_admin', 'game_master', 'moderator'],
  'players:ban_long': ['super_admin', 'game_master'],
  'players:ban_permanent': ['super_admin'],
  'players:kick': ['super_admin', 'game_master'],
  'players:compensate': ['super_admin'],
  'players:unban': ['super_admin', 'game_master'],

  // Tribes
  'tribes:read': ['super_admin', 'game_master', 'moderator'],
  'tribes:flag': ['super_admin', 'game_master', 'moderator'],
  'tribes:treasury_logs': ['super_admin', 'game_master'],
  'tribes:chat_logs': ['super_admin', 'game_master'],
  'tribes:propose_disqualify': ['super_admin', 'game_master'],
  'tribes:approve_disqualify': ['super_admin'],

  // Battles
  'battles:read': ['super_admin', 'game_master'],
  'battles:replay': ['super_admin'],
  'battles:rollback': ['super_admin'],

  // Moderation
  'moderation:read': ['super_admin', 'game_master', 'moderator'],
  'moderation:resolve': ['super_admin', 'game_master', 'moderator'],
  'appeals:read': ['super_admin', 'game_master'],
  'appeals:decide': ['super_admin', 'game_master'],

  // Analytics
  'analytics:read': ['super_admin', 'game_master']
};

/**
 * Check if admin has permission
 */
const roleCheck = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' }
      });
    }

    const allowedRoles = PERMISSIONS[permission] || [];

    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check role-based permission
    if (allowedRoles.includes(req.admin.role)) {
      return next();
    }

    // Check custom permissions
    if (req.admin.hasPermission && req.admin.hasPermission(permission)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Permission '${permission}' required`,
        yourRole: req.admin.role
      }
    });
  };
};

/**
 * Middleware to require specific roles
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' }
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_REQUIRED',
          message: `One of these roles required: ${roles.join(', ')}`,
          yourRole: req.admin.role
        }
      });
    }

    next();
  };
};

module.exports = { roleCheck, requireRole, PERMISSIONS };
