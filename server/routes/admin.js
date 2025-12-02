/**
 * ADMIN ROUTES
 * Administrative functions and moderation
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const Battle = require('../models/Battle');
const Season = require('../models/Season');
const Payment = require('../models/Payment');
const AdminAuditLog = require('../models/AdminAuditLog');
const BehavioralFlag = require('../models/BehavioralFlag');
const logger = require('../utils/logger');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { adminRateLimiter } = require('../middleware/rateLimit');
const {
  asyncHandler,
  NotFoundError,
  AppError,
} = require('../middleware/errorHandler');
const { validate, adminSchemas } = require('../middleware/validator');
const { withTransaction } = require('../config/database');

// Apply admin rate limiter
router.use(authenticate);
router.use(requireAdmin);
router.use(adminRateLimiter);

// ===========================================
// DASHBOARD
// ===========================================

/**
 * @route   GET /api/v1/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Admin
 */
router.get('/dashboard',
  asyncHandler(async (req, res) => {
    const [
      totalUsers,
      activeUsers,
      totalTribes,
      totalBattles,
      pendingFlags,
      pendingPayments,
      activeSeason,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ 'activity.lastActive': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      Tribe.countDocuments({ status: 'active' }),
      Battle.countDocuments({ status: 'completed' }),
      BehavioralFlag.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: 'pending' }),
      Season.findOne({ status: 'active' }).select('name players.current prizePool').lean(),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          activeToday: activeUsers,
        },
        tribes: totalTribes,
        battles: totalBattles,
        pendingFlags,
        pendingPayments,
        activeSeason,
      },
    });
  })
);

// ===========================================
// USER MANAGEMENT
// ===========================================

/**
 * @route   GET /api/v1/admin/users
 * @desc    List users with filters
 * @access  Admin
 */
router.get('/users',
  asyncHandler(async (req, res) => {
    const {
      search,
      status,
      role,
      page = 1,
      limit = 50,
      sort = '-createdAt',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { 'profile.displayName': { $regex: search, $options: 'i' } },
        { walletAddress: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (role) query.role = role;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .select('walletAddress profile.displayName role status gold createdAt activity.lastLogin')
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/admin/users/:id
 * @desc    Get user details
 * @access  Admin
 */
router.get('/users/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .populate('currentSeason.tribeId', 'name')
      .lean();

    if (!user) {
      throw new NotFoundError('User');
    }

    // Get related data
    const [battleCount, flags, payments] = await Promise.all([
      Battle.countDocuments({
        $or: [
          { 'attacker.userId': user._id },
          { 'defender.userId': user._id },
        ],
      }),
      BehavioralFlag.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10).lean(),
      Payment.find({ odooPartnerId: user.odooPartnerId }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.json({
      success: true,
      data: {
        user,
        battleCount,
        flags,
        payments,
      },
    });
  })
);

/**
 * @route   POST /api/v1/admin/users/:id/ban
 * @desc    Ban a user
 * @access  Admin
 */
router.post('/users/:id/ban',
  validate(adminSchemas.banUser),
  asyncHandler(async (req, res) => {
    const { reason, duration, evidence } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Prevent banning admins (unless super_admin)
    if (user.role === 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('Cannot ban admin users', 403, 'FORBIDDEN');
    }

    if (user.role === 'super_admin') {
      throw new AppError('Cannot ban super admin', 403, 'FORBIDDEN');
    }

    const banDuration = duration === 0 ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

    user.status = duration === 0 ? 'banned' : 'suspended';
    user.suspendedUntil = banDuration;
    user.sessionVersion += 1; // Invalidate all sessions
    await user.save();

    // Log action
    await AdminAuditLog.logAction(
      req.user.id,
      'user_ban',
      'User',
      user._id,
      {
        reason,
        duration: duration === 0 ? 'permanent' : `${duration} days`,
        evidence,
      },
      req
    );

    logger.info('User banned', {
      userId: user._id,
      bannedBy: req.user.id,
      reason,
      duration,
    });

    res.json({
      success: true,
      message: `User ${duration === 0 ? 'permanently banned' : `suspended for ${duration} days`}`,
    });
  })
);

/**
 * @route   POST /api/v1/admin/users/:id/unban
 * @desc    Unban a user
 * @access  Admin
 */
router.post('/users/:id/unban',
  validate(adminSchemas.unbanUser),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User');
    }

    user.status = 'active';
    user.suspendedUntil = null;
    await user.save();

    await AdminAuditLog.logAction(
      req.user.id,
      'user_unban',
      'User',
      user._id,
      { reason },
      req
    );

    logger.info('User unbanned', {
      userId: user._id,
      unbannedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'User unbanned',
    });
  })
);

/**
 * @route   POST /api/v1/admin/users/:id/adjust-gold
 * @desc    Adjust user's gold balance
 * @access  Admin
 */
router.post('/users/:id/adjust-gold',
  validate(adminSchemas.adjustGold),
  asyncHandler(async (req, res) => {
    const { amount, reason } = req.body;

    await withTransaction(async (session) => {
      const user = await User.findById(req.params.id).session(session);
      if (!user) {
        throw new NotFoundError('User');
      }

      const oldBalance = user.gold;
      user.gold += amount;

      if (user.gold < 0) {
        throw new AppError('Cannot set negative gold balance', 400, 'INVALID_AMOUNT');
      }

      user.transactions.push({
        type: 'admin_adjustment',
        amount,
        balance: user.gold,
        description: `Admin adjustment: ${reason}`,
        metadata: { adminId: req.user.id, reason },
        timestamp: new Date(),
      });

      await user.save({ session });

      await AdminAuditLog.logAction(
        req.user.id,
        'gold_adjustment',
        'User',
        user._id,
        {
          amount,
          oldBalance,
          newBalance: user.gold,
          reason,
        },
        req,
        session
      );
    });

    logger.info('Gold adjusted', {
      userId: req.params.id,
      amount,
      adjustedBy: req.user.id,
    });

    res.json({
      success: true,
      message: `Gold adjusted by ${amount}`,
    });
  })
);

// ===========================================
// BEHAVIORAL FLAGS
// ===========================================

/**
 * @route   GET /api/v1/admin/flags
 * @desc    Get behavioral flags
 * @access  Admin
 */
router.get('/flags',
  asyncHandler(async (req, res) => {
    const { status = 'pending', severity, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [flags, total] = await Promise.all([
      BehavioralFlag.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('userId', 'profile.displayName walletAddress')
        .lean(),
      BehavioralFlag.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        flags,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   POST /api/v1/admin/flags/:id/resolve
 * @desc    Resolve a behavioral flag
 * @access  Admin
 */
router.post('/flags/:id/resolve',
  validate(adminSchemas.resolveBehavioralFlag),
  asyncHandler(async (req, res) => {
    const { verdict, action, notes, suspensionDays } = req.body;

    const flag = await BehavioralFlag.findById(req.params.id);
    if (!flag) {
      throw new NotFoundError('Flag');
    }

    flag.status = 'resolved';
    flag.review = {
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
      verdict,
      action,
      notes,
    };

    // Apply action if confirmed
    if (verdict === 'confirmed' && action !== 'none') {
      const user = await User.findById(flag.userId);

      if (action === 'warning') {
        // Add warning to user record
        if (!user.warnings) user.warnings = [];
        user.warnings.push({
          reason: flag.reason,
          flagId: flag._id,
          issuedAt: new Date(),
          issuedBy: req.user.id,
        });
      } else if (action === 'suspension') {
        user.status = 'suspended';
        user.suspendedUntil = new Date(Date.now() + suspensionDays * 24 * 60 * 60 * 1000);
        user.sessionVersion += 1;
      } else if (action === 'ban') {
        user.status = 'banned';
        user.sessionVersion += 1;
      }

      await user.save();
    }

    await flag.save();

    await AdminAuditLog.logAction(
      req.user.id,
      'flag_resolved',
      'BehavioralFlag',
      flag._id,
      { verdict, action, notes },
      req
    );

    logger.info('Flag resolved', {
      flagId: flag._id,
      verdict,
      action,
      resolvedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Flag resolved',
    });
  })
);

// ===========================================
// PAYMENTS
// ===========================================

/**
 * @route   GET /api/v1/admin/payments
 * @desc    Get all payments
 * @access  Admin
 */
router.get('/payments',
  asyncHandler(async (req, res) => {
    const { status, type, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   POST /api/v1/admin/payments/:id/verify
 * @desc    Manually verify crypto payment
 * @access  Admin
 */
router.post('/payments/:id/verify',
  asyncHandler(async (req, res) => {
    const { verified, notes } = req.body;

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (verified) {
      payment.status = 'completed';
      payment.completedAt = new Date();

      // Add to season prize pool if applicable
      if (payment.seasonId) {
        const season = await Season.findById(payment.seasonId);
        if (season) {
          await season.addToprizePool(payment.amount.value);
        }
      }
    } else {
      payment.status = 'failed';
      payment.error = { message: notes || 'Verification failed' };
    }

    payment.metadata.verifiedBy = req.user.id;
    payment.metadata.verificationNotes = notes;
    await payment.save();

    await AdminAuditLog.logAction(
      req.user.id,
      verified ? 'payment_verified' : 'payment_rejected',
      'Payment',
      payment._id,
      { verified, notes },
      req
    );

    res.json({
      success: true,
      message: verified ? 'Payment verified' : 'Payment rejected',
    });
  })
);

// ===========================================
// AUDIT LOGS
// ===========================================

/**
 * @route   GET /api/v1/admin/audit-logs
 * @desc    Get admin audit logs
 * @access  Admin
 */
router.get('/audit-logs',
  asyncHandler(async (req, res) => {
    const { adminId, action, page = 1, limit = 50 } = req.query;

    const query = {};
    if (adminId) query.adminId = adminId;
    if (action) query.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('adminId', 'profile.displayName')
        .lean(),
      AdminAuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

// ===========================================
// ANNOUNCEMENTS
// ===========================================

/**
 * @route   POST /api/v1/admin/announcements
 * @desc    Create global announcement
 * @access  Admin
 */
router.post('/announcements',
  validate(adminSchemas.createAnnouncement),
  asyncHandler(async (req, res) => {
    const { title, content, type, expiresAt, isGlobal } = req.body;

    // Store in database or broadcast via WebSocket
    const announcement = {
      id: Date.now().toString(),
      title,
      content,
      type,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isGlobal,
      createdBy: req.user.id,
      createdAt: new Date(),
    };

    // TODO: Broadcast via WebSocket and/or store in database

    await AdminAuditLog.logAction(
      req.user.id,
      'announcement_created',
      'Announcement',
      announcement.id,
      { title, type },
      req
    );

    res.status(201).json({
      success: true,
      data: announcement,
    });
  })
);

// ===========================================
// SYSTEM
// ===========================================

/**
 * @route   GET /api/v1/admin/system/stats
 * @desc    Get system statistics
 * @access  Super Admin
 */
router.get('/system/stats',
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const { isDatabaseConnected, getDatabaseStats } = require('../config/database');

    const dbStats = await getDatabaseStats();

    res.json({
      success: true,
      data: {
        database: {
          connected: isDatabaseConnected(),
          ...dbStats,
        },
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          nodeVersion: process.version,
          environment: process.env.NODE_ENV,
        },
      },
    });
  })
);

module.exports = router;
