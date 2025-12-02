/**
 * USER ROUTES
 * User profile management and statistics
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler, NotFoundError, AppError } = require('../middleware/errorHandler');
const { validate, userSchemas, idParamSchema } = require('../middleware/validator');

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user profile by ID
 * @access  Public (limited data) / Private (full data if own profile)
 */
router.get('/:id',
  optionalAuth,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .populate('currentSeason.tribeId', 'name tag banner')
      .lean();

    if (!user) {
      throw new NotFoundError('User');
    }

    // Check if viewing own profile
    const isOwnProfile = req.user && req.user.id.toString() === user._id.toString();

    // Build response based on privacy settings
    const showStats = user.settings?.privacy?.showStats !== false;
    const showProfile = user.settings?.privacy?.showProfile !== false;

    const response = {
      id: user._id,
      displayName: user.profile.displayName,
      avatar: user.profile.avatar,
      role: user.role,
      createdAt: user.createdAt,
    };

    // Add public profile data
    if (showProfile || isOwnProfile) {
      response.bio = user.profile.bio;
      response.tribe = user.currentSeason?.tribeId;
    }

    // Add statistics
    if (showStats || isOwnProfile) {
      response.statistics = {
        battlesTotal: user.statistics?.battles?.total || 0,
        victoriesTotal: user.statistics?.battles?.victories || 0,
        territoriesHeld: user.statistics?.territories?.currentlyHeld || 0,
        highestVPRank: user.statistics?.vp?.highestRank || null,
      };
    }

    // Add private data for own profile
    if (isOwnProfile) {
      response.walletAddress = user.walletAddress;
      response.gold = user.gold;
      response.premiumCurrency = user.premiumCurrency;
      response.army = user.army;
      response.buildings = user.buildings;
      response.settings = user.settings;
      response.email = user.contact?.email;
    }

    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * @route   PATCH /api/v1/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.patch('/profile',
  authenticate,
  validate(userSchemas.updateProfile),
  asyncHandler(async (req, res) => {
    const { displayName, bio, avatar, settings } = req.body;

    // Check displayName uniqueness if being changed
    if (displayName) {
      const nameExists = await User.findOne({
        'profile.displayName': displayName,
        _id: { $ne: req.user.id },
      });

      if (nameExists) {
        throw new AppError('Display name already taken', 409, 'NAME_TAKEN');
      }
    }

    const updateFields = {};

    if (displayName) updateFields['profile.displayName'] = displayName;
    if (bio !== undefined) updateFields['profile.bio'] = bio;
    if (avatar) updateFields['profile.avatar'] = avatar;

    if (settings) {
      if (settings.notifications) {
        Object.keys(settings.notifications).forEach(key => {
          updateFields[`settings.notifications.${key}`] = settings.notifications[key];
        });
      }
      if (settings.privacy) {
        Object.keys(settings.privacy).forEach(key => {
          updateFields[`settings.privacy.${key}`] = settings.privacy[key];
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    logger.info('User profile updated', { userId: req.user.id });

    res.json({
      success: true,
      data: {
        displayName: user.profile.displayName,
        bio: user.profile.bio,
        avatar: user.profile.avatar,
        settings: user.settings,
      },
    });
  })
);

/**
 * @route   GET /api/v1/users/:id/statistics
 * @desc    Get detailed user statistics
 * @access  Public (respects privacy settings)
 */
router.get('/:id/statistics',
  optionalAuth,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select('statistics settings.privacy')
      .lean();

    if (!user) {
      throw new NotFoundError('User');
    }

    const isOwnProfile = req.user && req.user.id.toString() === user._id.toString();
    const showStats = user.settings?.privacy?.showStats !== false;

    if (!showStats && !isOwnProfile) {
      return res.json({
        success: true,
        data: { private: true },
      });
    }

    res.json({
      success: true,
      data: user.statistics,
    });
  })
);

/**
 * @route   GET /api/v1/users/:id/battles
 * @desc    Get user battle history
 * @access  Public
 */
router.get('/:id/battles',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const Battle = require('../models/Battle');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const battles = await Battle.find({
      $or: [
        { 'attacker.userId': req.params.id },
        { 'defender.userId': req.params.id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('attacker.userId', 'profile.displayName')
      .populate('defender.userId', 'profile.displayName')
      .lean();

    const total = await Battle.countDocuments({
      $or: [
        { 'attacker.userId': req.params.id },
        { 'defender.userId': req.params.id },
      ],
    });

    res.json({
      success: true,
      data: {
        battles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/users/:id/territories
 * @desc    Get territories where user has garrison
 * @access  Public
 */
router.get('/:id/territories',
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const Territory = require('../models/Territory');

    const territories = await Territory.find({
      'garrison.contributors.userId': req.params.id,
    })
      .select('territoryId name tier terrain controlledBy garrison.total')
      .lean();

    res.json({
      success: true,
      data: territories,
    });
  })
);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users by display name
 * @access  Private
 */
router.get('/search',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const users = await User.find({
      'profile.displayName': { $regex: q, $options: 'i' },
      status: 'active',
    })
      .select('profile.displayName profile.avatar')
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: users.map(u => ({
        id: u._id,
        displayName: u.profile.displayName,
        avatar: u.profile.avatar,
      })),
    });
  })
);

/**
 * @route   GET /api/v1/users/me/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/me/notifications',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('notifications')
      .lean();

    const { unreadOnly, limit = 50 } = req.query;

    let notifications = user.notifications || [];

    if (unreadOnly === 'true') {
      notifications = notifications.filter(n => !n.read);
    }

    notifications = notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount: notifications.filter(n => !n.read).length,
      },
    });
  })
);

/**
 * @route   POST /api/v1/users/me/notifications/read
 * @desc    Mark notifications as read
 * @access  Private
 */
router.post('/me/notifications/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const { notificationIds, all } = req.body;

    if (all) {
      await User.updateOne(
        { _id: req.user.id },
        { $set: { 'notifications.$[].read': true } }
      );
    } else if (notificationIds && notificationIds.length > 0) {
      await User.updateOne(
        { _id: req.user.id },
        { $set: { 'notifications.$[elem].read': true } },
        { arrayFilters: [{ 'elem._id': { $in: notificationIds } }] }
      );
    }

    res.json({
      success: true,
      message: 'Notifications marked as read',
    });
  })
);

/**
 * @route   GET /api/v1/users/me/referrals
 * @desc    Get user referral info and list
 * @access  Private
 */
router.get('/me/referrals',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .populate('referrals', 'profile.displayName createdAt')
      .select('referralCode referrals referralRewards')
      .lean();

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        referralLink: `${process.env.FRONTEND_URL}/register?ref=${user.referralCode}`,
        referrals: user.referrals.map(r => ({
          id: r._id,
          displayName: r.profile.displayName,
          joinedAt: r.createdAt,
        })),
        totalReferrals: user.referrals.length,
        totalRewards: user.referralRewards || 0,
      },
    });
  })
);

module.exports = router;
