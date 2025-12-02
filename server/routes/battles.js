/**
 * BATTLE ROUTES
 * Battle history, results, and statistics
 */

const express = require('express');
const router = express.Router();

const Battle = require('../models/Battle');
const Territory = require('../models/Territory');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');
const { validate, battleSchemas, idParamSchema } = require('../middleware/validator');

/**
 * @route   GET /api/v1/battles
 * @desc    Get battle history with filters
 * @access  Private
 */
router.get('/',
  authenticate,
  validate(battleSchemas.list, 'query'),
  asyncHandler(async (req, res) => {
    const {
      territoryId,
      tribeId,
      userId,
      result,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {};

    if (territoryId) {
      query.territoryId = parseInt(territoryId);
    }

    if (tribeId) {
      query.$or = [
        { 'attacker.tribeId': tribeId },
        { 'defender.tribeId': tribeId },
      ];
    }

    if (userId) {
      query.$or = [
        { 'attacker.userId': userId },
        { 'defender.userId': userId },
      ];
    }

    if (result) {
      query.result = result;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [battles, total] = await Promise.all([
      Battle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('attacker.userId', 'profile.displayName')
        .populate('attacker.tribeId', 'name tag')
        .populate('defender.userId', 'profile.displayName')
        .populate('defender.tribeId', 'name tag')
        .lean(),
      Battle.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        battles,
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
 * @route   GET /api/v1/battles/my
 * @desc    Get user's battle history
 * @access  Private
 */
router.get('/my',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [
        { 'attacker.userId': req.user.id },
        { 'defender.userId': req.user.id },
      ],
    };

    if (type === 'attacking') {
      query.$or = [{ 'attacker.userId': req.user.id }];
    } else if (type === 'defending') {
      query.$or = [{ 'defender.userId': req.user.id }];
    }

    const [battles, total] = await Promise.all([
      Battle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('attacker.tribeId', 'name tag')
        .populate('defender.tribeId', 'name tag')
        .lean(),
      Battle.countDocuments(query),
    ]);

    // Add user's role and outcome to each battle
    const enhancedBattles = battles.map(battle => {
      const isAttacker = battle.attacker.userId?.equals(req.user.id);
      const isDefender = battle.defender.userId?.equals(req.user.id);

      let userRole = 'spectator';
      let userOutcome = null;

      if (isAttacker) {
        userRole = 'attacker';
        userOutcome = battle.result === 'attacker_victory' ? 'victory' :
          battle.result === 'defender_victory' ? 'defeat' : 'draw';
      } else if (isDefender) {
        userRole = 'defender';
        userOutcome = battle.result === 'defender_victory' ? 'victory' :
          battle.result === 'attacker_victory' ? 'defeat' : 'draw';
      }

      return {
        ...battle,
        userRole,
        userOutcome,
      };
    });

    res.json({
      success: true,
      data: {
        battles: enhancedBattles,
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
 * @route   GET /api/v1/battles/tribe
 * @desc    Get tribe's battle history
 * @access  Private
 */
router.get('/tribe',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.tribeId) {
      return res.json({
        success: true,
        data: { battles: [], pagination: { total: 0 } },
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      $or: [
        { 'attacker.tribeId': req.user.tribeId },
        { 'defender.tribeId': req.user.tribeId },
      ],
    };

    const [battles, total] = await Promise.all([
      Battle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('attacker.userId', 'profile.displayName')
        .populate('attacker.tribeId', 'name tag')
        .populate('defender.userId', 'profile.displayName')
        .populate('defender.tribeId', 'name tag')
        .lean(),
      Battle.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        battles,
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
 * @route   GET /api/v1/battles/:id
 * @desc    Get battle details
 * @access  Private
 */
router.get('/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const battle = await Battle.findById(req.params.id)
      .populate('attacker.userId', 'profile.displayName profile.avatar')
      .populate('attacker.tribeId', 'name tag banner')
      .populate('defender.userId', 'profile.displayName profile.avatar')
      .populate('defender.tribeId', 'name tag banner')
      .lean();

    if (!battle) {
      throw new NotFoundError('Battle');
    }

    // Get territory info
    const territory = await Territory.findOne({ territoryId: battle.territoryId })
      .select('name tier terrain')
      .lean();

    res.json({
      success: true,
      data: {
        ...battle,
        territory,
      },
    });
  })
);

/**
 * @route   GET /api/v1/battles/:id/replay
 * @desc    Get battle replay data (combat log)
 * @access  Private
 */
router.get('/:id/replay',
  authenticate,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const battle = await Battle.findById(req.params.id)
      .select('combatLog combatPhases result status')
      .lean();

    if (!battle) {
      throw new NotFoundError('Battle');
    }

    if (battle.status !== 'completed') {
      return res.json({
        success: true,
        data: {
          status: battle.status,
          message: 'Battle not yet completed',
        },
      });
    }

    res.json({
      success: true,
      data: {
        phases: battle.combatPhases,
        log: battle.combatLog,
        result: battle.result,
      },
    });
  })
);

/**
 * @route   GET /api/v1/battles/stats/overview
 * @desc    Get user's battle statistics
 * @access  Private
 */
router.get('/stats/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    const [attackingStats, defendingStats] = await Promise.all([
      Battle.aggregate([
        { $match: { 'attacker.userId': req.user.id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            victories: {
              $sum: { $cond: [{ $eq: ['$result', 'attacker_victory'] }, 1, 0] },
            },
            defeats: {
              $sum: { $cond: [{ $eq: ['$result', 'defender_victory'] }, 1, 0] },
            },
            unitsLost: { $sum: '$attacker.casualties.total' },
            unitsKilled: { $sum: '$defender.casualties.total' },
            goldLooted: { $sum: '$rewards.goldLooted' },
            vpEarned: { $sum: '$rewards.vpGained' },
          },
        },
      ]),
      Battle.aggregate([
        { $match: { 'defender.userId': req.user.id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            victories: {
              $sum: { $cond: [{ $eq: ['$result', 'defender_victory'] }, 1, 0] },
            },
            defeats: {
              $sum: { $cond: [{ $eq: ['$result', 'attacker_victory'] }, 1, 0] },
            },
            unitsLost: { $sum: '$defender.casualties.total' },
            unitsKilled: { $sum: '$attacker.casualties.total' },
          },
        },
      ]),
    ]);

    const attacking = attackingStats[0] || {
      total: 0, victories: 0, defeats: 0, unitsLost: 0, unitsKilled: 0, goldLooted: 0, vpEarned: 0,
    };
    const defending = defendingStats[0] || {
      total: 0, victories: 0, defeats: 0, unitsLost: 0, unitsKilled: 0,
    };

    res.json({
      success: true,
      data: {
        attacking: {
          total: attacking.total,
          victories: attacking.victories,
          defeats: attacking.defeats,
          winRate: attacking.total > 0 ?
            ((attacking.victories / attacking.total) * 100).toFixed(1) : 0,
          unitsLost: attacking.unitsLost,
          unitsKilled: attacking.unitsKilled,
          goldLooted: attacking.goldLooted,
          vpEarned: attacking.vpEarned,
        },
        defending: {
          total: defending.total,
          victories: defending.victories,
          defeats: defending.defeats,
          winRate: defending.total > 0 ?
            ((defending.victories / defending.total) * 100).toFixed(1) : 0,
          unitsLost: defending.unitsLost,
          unitsKilled: defending.unitsKilled,
        },
        overall: {
          total: attacking.total + defending.total,
          victories: attacking.victories + defending.victories,
          defeats: attacking.defeats + defending.defeats,
          unitsLost: attacking.unitsLost + defending.unitsLost,
          unitsKilled: attacking.unitsKilled + defending.unitsKilled,
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/battles/live
 * @desc    Get currently processing battles
 * @access  Private
 */
router.get('/live',
  authenticate,
  asyncHandler(async (req, res) => {
    const liveBattles = await Battle.find({
      status: { $in: ['queued', 'processing'] },
      $or: [
        { 'attacker.userId': req.user.id },
        { 'attacker.tribeId': req.user.tribeId },
        { 'defender.tribeId': req.user.tribeId },
      ],
    })
      .populate('attacker.tribeId', 'name tag')
      .populate('defender.tribeId', 'name tag')
      .lean();

    res.json({
      success: true,
      data: liveBattles,
    });
  })
);

/**
 * @route   GET /api/v1/battles/recent
 * @desc    Get recent global battles
 * @access  Private
 */
router.get('/recent',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const battles = await Battle.find({ status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(parseInt(limit))
      .populate('attacker.tribeId', 'name tag')
      .populate('defender.tribeId', 'name tag')
      .select('territoryId type result attacker.tribeId defender.tribeId createdAt')
      .lean();

    res.json({
      success: true,
      data: battles,
    });
  })
);

module.exports = router;
