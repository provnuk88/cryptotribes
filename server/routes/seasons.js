/**
 * SEASON ROUTES
 * Season management, participation, and rewards
 */

const express = require('express');
const router = express.Router();

const Season = require('../models/Season');
const User = require('../models/User');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');
const { SEASON_SETTINGS } = require('../config/constants');
const { authenticate, requireAdmin } = require('../middleware/auth');
const {
  asyncHandler,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  AppError,
} = require('../middleware/errorHandler');
const { validate, seasonSchemas } = require('../middleware/validator');

/**
 * @route   GET /api/v1/seasons
 * @desc    Get all seasons
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [seasons, total] = await Promise.all([
      Season.find(query)
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Season.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        seasons,
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
 * @route   GET /api/v1/seasons/current
 * @desc    Get current active season
 * @access  Private
 */
router.get('/current',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findOne({ status: 'active' }).lean();

    if (!season) {
      return res.json({
        success: true,
        data: null,
        message: 'No active season',
      });
    }

    // Check if user is participating
    const user = await User.findById(req.user.id).select('currentSeason').lean();
    const isParticipating = user.currentSeason?.seasonId?.equals(season._id);

    res.json({
      success: true,
      data: {
        ...season,
        isParticipating,
        daysRemaining: Math.ceil((season.endDate - new Date()) / (24 * 60 * 60 * 1000)),
      },
    });
  })
);

/**
 * @route   GET /api/v1/seasons/upcoming
 * @desc    Get upcoming season
 * @access  Private
 */
router.get('/upcoming',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findOne({
      status: 'scheduled',
      startDate: { $gt: new Date() },
    })
      .sort({ startDate: 1 })
      .lean();

    res.json({
      success: true,
      data: season,
    });
  })
);

/**
 * @route   GET /api/v1/seasons/:id
 * @desc    Get season details
 * @access  Private
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id).lean();

    if (!season) {
      throw new NotFoundError('Season');
    }

    res.json({
      success: true,
      data: season,
    });
  })
);

/**
 * @route   POST /api/v1/seasons/:id/join
 * @desc    Join a season (after payment)
 * @access  Private
 */
router.post('/:id/join',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);

    if (!season) {
      throw new NotFoundError('Season');
    }

    // Check season status
    if (season.status !== 'scheduled' && season.status !== 'active') {
      throw new ForbiddenError('Cannot join this season');
    }

    // Check if already participating
    const user = await User.findById(req.user.id);
    if (user.currentSeason?.seasonId?.equals(season._id)) {
      throw new ConflictError('Already participating in this season');
    }

    // Check if player limit reached
    if (season.players.current >= season.players.max) {
      throw new AppError('Season is full', 400, 'SEASON_FULL');
    }

    // Check if payment completed
    const payment = await Payment.findOne({
      userId: req.user.id,
      seasonId: season._id,
      type: 'season_entry',
      status: 'completed',
    });

    if (!payment) {
      return res.status(402).json({
        success: false,
        error: 'Payment required to join season',
        code: 'PAYMENT_REQUIRED',
        data: {
          entryFee: season.entryFee,
          paymentUrl: `/api/v1/payments/season/${season._id}`,
        },
      });
    }

    // Add player to season
    season.players.current += 1;
    season.players.list.push({
      odooUserId: user.odooUserId,
      odooPartnerId: user.odooPartnerId,
      joinedAt: new Date(),
    });
    await season.save();

    // Update user's current season
    user.currentSeason = {
      seasonId: season._id,
      joinedAt: new Date(),
    };

    // Reset season-specific data
    user.gold = 500; // Starting gold
    user.army = { militia: 10, spearman: 0, archer: 0, cavalry: 0 };
    user.buildings = {
      barracks: { level: 1 },
      warehouse: { level: 1 },
      workshop: { level: 1 },
    };
    user.trainingQueue = [];

    await user.save();

    logger.info('User joined season', {
      userId: req.user.id,
      seasonId: season._id,
    });

    res.json({
      success: true,
      message: `Welcome to ${season.name}!`,
      data: {
        seasonId: season._id,
        startingGold: user.gold,
        startingArmy: user.army,
      },
    });
  })
);

/**
 * @route   GET /api/v1/seasons/:id/events
 * @desc    Get season events
 * @access  Private
 */
router.get('/:id/events',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id)
      .select('events')
      .lean();

    if (!season) {
      throw new NotFoundError('Season');
    }

    res.json({
      success: true,
      data: {
        events: season.events || SEASON_SETTINGS.events,
      },
    });
  })
);

/**
 * @route   GET /api/v1/seasons/:id/prizes
 * @desc    Get season prize distribution
 * @access  Private
 */
router.get('/:id/prizes',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id)
      .select('prizePool rewards')
      .lean();

    if (!season) {
      throw new NotFoundError('Season');
    }

    res.json({
      success: true,
      data: {
        prizePool: season.prizePool,
        distribution: season.rewards?.distribution || {
          1: 25,
          2: 15,
          3: 10,
          '4-10': 5,
          '11-25': 2,
          '26-50': 1,
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/seasons/:id/my-status
 * @desc    Get user's season status
 * @access  Private
 */
router.get('/:id/my-status',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('currentSeason gold army buildings statistics')
      .populate('currentSeason.tribeId', 'name tag victoryPoints')
      .lean();

    if (!user.currentSeason?.seasonId?.equals(req.params.id)) {
      return res.json({
        success: true,
        data: {
          isParticipating: false,
        },
      });
    }

    res.json({
      success: true,
      data: {
        isParticipating: true,
        joinedAt: user.currentSeason.joinedAt,
        tribe: user.currentSeason.tribeId,
        role: user.currentSeason.tribeRole,
        gold: user.gold,
        army: user.army,
        buildings: user.buildings,
        statistics: user.statistics,
      },
    });
  })
);

/**
 * @route   GET /api/v1/seasons/:id/final-standings
 * @desc    Get final standings (completed seasons only)
 * @access  Private
 */
router.get('/:id/final-standings',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id)
      .select('status finalStandings rewards')
      .lean();

    if (!season) {
      throw new NotFoundError('Season');
    }

    if (season.status !== 'completed') {
      throw new AppError('Season not yet completed', 400, 'SEASON_NOT_COMPLETE');
    }

    res.json({
      success: true,
      data: {
        standings: season.finalStandings,
        rewards: season.rewards,
      },
    });
  })
);

// ===========================================
// ADMIN ROUTES
// ===========================================

/**
 * @route   POST /api/v1/seasons
 * @desc    Create new season (Admin)
 * @access  Private (Admin)
 */
router.post('/',
  authenticate,
  requireAdmin,
  validate(seasonSchemas.create),
  asyncHandler(async (req, res) => {
    const { name, startDate, endDate, entryFee, maxPlayers, prizePoolPercentage } = req.body;

    // Check for overlapping seasons
    const overlapping = await Season.findOne({
      $or: [
        { startDate: { $lte: endDate, $gte: startDate } },
        { endDate: { $lte: endDate, $gte: startDate } },
      ],
      status: { $in: ['scheduled', 'active'] },
    });

    if (overlapping) {
      throw new ConflictError('Season dates overlap with existing season');
    }

    const season = await Season.create({
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: 'scheduled',
      entryFee,
      players: {
        max: maxPlayers,
        current: 0,
        list: [],
      },
      prizePool: {
        percentage: prizePoolPercentage,
      },
    });

    logger.info('Season created', {
      seasonId: season._id,
      name,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: season,
    });
  })
);

/**
 * @route   POST /api/v1/seasons/:id/start
 * @desc    Start a season (Admin)
 * @access  Private (Admin)
 */
router.post('/:id/start',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);

    if (!season) {
      throw new NotFoundError('Season');
    }

    if (season.status !== 'scheduled') {
      throw new AppError('Season cannot be started', 400, 'INVALID_STATUS');
    }

    season.status = 'active';
    season.actualStartDate = new Date();
    await season.save();

    logger.info('Season started', {
      seasonId: season._id,
      startedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Season started',
      data: season,
    });
  })
);

/**
 * @route   POST /api/v1/seasons/:id/end
 * @desc    End a season (Admin)
 * @access  Private (Admin)
 */
router.post('/:id/end',
  authenticate,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);

    if (!season) {
      throw new NotFoundError('Season');
    }

    if (season.status !== 'active') {
      throw new AppError('Season is not active', 400, 'INVALID_STATUS');
    }

    // Calculate final standings
    const Tribe = require('../models/Tribe');
    const tribes = await Tribe.find({ seasonId: season._id })
      .sort({ 'victoryPoints.total': -1 })
      .select('name victoryPoints memberCount')
      .lean();

    season.status = 'completed';
    season.actualEndDate = new Date();
    season.finalStandings = tribes.map((t, index) => ({
      rank: index + 1,
      tribeId: t._id,
      tribeName: t.name,
      victoryPoints: t.victoryPoints.total,
      memberCount: t.memberCount,
    }));

    await season.save();

    logger.info('Season ended', {
      seasonId: season._id,
      endedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Season ended',
      data: {
        finalStandings: season.finalStandings,
      },
    });
  })
);

module.exports = router;
