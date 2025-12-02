/**
 * AUTHENTICATION MIDDLEWARE
 * JWT verification, role-based access control, and session validation
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Custom error for authentication failures
 */
class AuthError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Verify JWT token and attach user to request
 * Required for all protected routes
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Extract token from Authorization header or cookies
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw new AuthError('Access token required');
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthError('Token expired');
      }
      if (err.name === 'JsonWebTokenError') {
        throw new AuthError('Invalid token');
      }
      throw new AuthError('Token verification failed');
    }

    // Find user and check if still active
    const user = await User.findById(decoded.userId)
      .select('+passwordHash +sessionVersion')
      .lean();

    if (!user) {
      throw new AuthError('User not found');
    }

    // Check if user is banned
    if (user.status === 'banned') {
      throw new AuthError('Account is banned', 403);
    }

    // Check if user is suspended
    if (user.status === 'suspended' && user.suspendedUntil > new Date()) {
      throw new AuthError(`Account suspended until ${user.suspendedUntil.toISOString()}`, 403);
    }

    // Validate session version (for forced logout)
    if (decoded.sessionVersion !== user.sessionVersion) {
      throw new AuthError('Session invalidated. Please login again.');
    }

    // Check if season is active (for gameplay routes)
    // Skip this check for non-gameplay routes
    const gameplayRoutes = ['/battles', '/territories', '/units', '/buildings', '/tribes'];
    const isGameplayRoute = gameplayRoutes.some(route => req.baseUrl.includes(route));

    if (isGameplayRoute && user.currentSeason) {
      // Season validation can be added here
    }

    // Attach user to request (without sensitive fields)
    req.user = {
      id: user._id,
      odooUserId: user.odooUserId,
      walletAddress: user.walletAddress,
      displayName: user.profile?.displayName,
      role: user.role,
      tribeId: user.currentSeason?.tribeId,
      seasonId: user.currentSeason?.seasonId,
      isAdmin: user.role === 'admin' || user.role === 'super_admin',
      isModerator: user.role === 'moderator',
    };

    // Track last activity
    User.updateOne(
      { _id: user._id },
      { 'activity.lastActive': new Date() }
    ).exec(); // Fire and forget

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: 'AUTH_ERROR',
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_INTERNAL_ERROR',
    });
  }
};

/**
 * Optional authentication - attaches user if token present, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return next(); // Continue without user
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).lean();

    if (user && user.status === 'active') {
      req.user = {
        id: user._id,
        displayName: user.profile?.displayName,
        role: user.role,
        tribeId: user.currentSeason?.tribeId,
      };
    }

    next();
  } catch (error) {
    // Token invalid or expired - continue without user
    next();
  }
};

/**
 * Require specific role(s)
 * @param {...string} allowedRoles - Roles that can access the route
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Role access denied`, {
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
};

/**
 * Require admin role (admin or super_admin)
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!req.user.isAdmin) {
    logger.warn(`Admin access denied`, {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * Require super_admin role (highest level)
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (req.user.role !== 'super_admin') {
    logger.warn(`Super admin access denied`, {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
    });

    return res.status(403).json({
      success: false,
      error: 'Super admin access required',
      code: 'SUPER_ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * Require tribe membership
 */
const requireTribe = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!req.user.tribeId) {
    return res.status(403).json({
      success: false,
      error: 'You must be a member of a tribe to perform this action',
      code: 'TRIBE_REQUIRED',
    });
  }

  next();
};

/**
 * Require tribe leadership role (chieftain or captain)
 */
const requireTribeLeader = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!req.user.tribeId) {
    return res.status(403).json({
      success: false,
      error: 'Tribe membership required',
      code: 'TRIBE_REQUIRED',
    });
  }

  try {
    const Tribe = require('../models/Tribe');
    const tribe = await Tribe.findById(req.user.tribeId);

    if (!tribe) {
      return res.status(404).json({
        success: false,
        error: 'Tribe not found',
        code: 'TRIBE_NOT_FOUND',
      });
    }

    const isChieftain = tribe.chieftain.userId.equals(req.user.id);
    const isCaptain = tribe.captains.some(c => c.userId.equals(req.user.id));

    if (!isChieftain && !isCaptain) {
      return res.status(403).json({
        success: false,
        error: 'Tribe leadership required',
        code: 'LEADERSHIP_REQUIRED',
      });
    }

    req.tribe = tribe;
    req.isChieftain = isChieftain;
    req.isCaptain = isCaptain;

    next();
  } catch (error) {
    logger.error('Error checking tribe leadership:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify tribe leadership',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Require active season participation
 */
const requireActiveSeason = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!req.user.seasonId) {
    return res.status(403).json({
      success: false,
      error: 'You must be participating in an active season',
      code: 'SEASON_REQUIRED',
    });
  }

  try {
    const Season = require('../models/Season');
    const season = await Season.findById(req.user.seasonId);

    if (!season) {
      return res.status(404).json({
        success: false,
        error: 'Season not found',
        code: 'SEASON_NOT_FOUND',
      });
    }

    if (season.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: `Season is ${season.status}. Gameplay not available.`,
        code: 'SEASON_NOT_ACTIVE',
      });
    }

    req.season = season;
    next();
  } catch (error) {
    logger.error('Error checking active season:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify season',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Generate access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      sessionVersion: user.sessionVersion || 0,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      type: 'refresh',
      sessionVersion: user.sessionVersion || 0,
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      throw new AuthError('Invalid token type');
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.status !== 'active') {
      throw new AuthError('User not found or inactive');
    }

    if (decoded.sessionVersion !== user.sessionVersion) {
      throw new AuthError('Session invalidated');
    }

    return user;
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    throw new AuthError('Invalid refresh token');
  }
};

module.exports = {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireTribe,
  requireTribeLeader,
  requireActiveSeason,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthError,
};
