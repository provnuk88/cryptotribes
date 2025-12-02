/**
 * LEADERBOARD ROUTES
 * Rankings for tribes, players, and territories
 */

const express = require('express');
const router = express.Router();

const Tribe = require('../models/Tribe');
const User = require('../models/User');
const Territory = require('../models/Territory');
const Season = require('../models/Season');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, NotFoundError } = require('../middleware/errorHandler');

/**
 * @route   GET /api/v1/leaderboard/tribes
 * @desc    Get tribe leaderboard by VP
 * @access  Private
 */
router.get('/tribes',
  authenticate,
  asyncHandler(async (req, res) => {
    const { seasonId, page = 1, limit = 50 } = req.query;

    const query = { status: 'active' };
    if (seasonId) {
      query.seasonId = seasonId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tribes, total] = await Promise.all([
      Tribe.find(query)
        .sort({ 'victoryPoints.total': -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('name tag banner memberCount territoryCount victoryPoints createdAt')
        .lean(),
      Tribe.countDocuments(query),
    ]);

    // Add rank
    const rankedTribes = tribes.map((tribe, index) => ({
      ...tribe,
      rank: skip + index + 1,
    }));

    res.json({
      success: true,
      data: {
        leaderboard: rankedTribes,
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
 * @route   GET /api/v1/leaderboard/tribes/territories
 * @desc    Get tribe leaderboard by territory count
 * @access  Private
 */
router.get('/tribes/territories',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const tribes = await Tribe.find({ status: 'active' })
      .sort({ territoryCount: -1 })
      .limit(parseInt(limit))
      .select('name tag banner territoryCount victoryPoints.total')
      .lean();

    const rankedTribes = tribes.map((tribe, index) => ({
      ...tribe,
      rank: index + 1,
    }));

    res.json({
      success: true,
      data: rankedTribes,
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/players
 * @desc    Get player leaderboard
 * @access  Private
 */
router.get('/players',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type = 'vp', page = 1, limit = 50 } = req.query;

    let sortField;
    switch (type) {
      case 'vp':
        sortField = { 'statistics.vp.total': -1 };
        break;
      case 'battles':
        sortField = { 'statistics.battles.victories': -1 };
        break;
      case 'territories':
        sortField = { 'statistics.territories.captured': -1 };
        break;
      case 'kills':
        sortField = { 'statistics.kills.total': -1 };
        break;
      default:
        sortField = { 'statistics.vp.total': -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [players, total] = await Promise.all([
      User.find({
        status: 'active',
        'currentSeason.seasonId': { $exists: true },
      })
        .sort(sortField)
        .skip(skip)
        .limit(parseInt(limit))
        .select('profile.displayName profile.avatar statistics currentSeason.tribeId')
        .populate('currentSeason.tribeId', 'name tag')
        .lean(),
      User.countDocuments({
        status: 'active',
        'currentSeason.seasonId': { $exists: true },
      }),
    ]);

    const rankedPlayers = players.map((player, index) => ({
      rank: skip + index + 1,
      id: player._id,
      displayName: player.profile.displayName,
      avatar: player.profile.avatar,
      tribe: player.currentSeason?.tribeId,
      statistics: player.statistics,
    }));

    res.json({
      success: true,
      data: {
        leaderboard: rankedPlayers,
        type,
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
 * @route   GET /api/v1/leaderboard/players/kills
 * @desc    Get top killers leaderboard
 * @access  Private
 */
router.get('/players/kills',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;

    const players = await User.find({
      status: 'active',
      'statistics.kills.total': { $gt: 0 },
    })
      .sort({ 'statistics.kills.total': -1 })
      .limit(parseInt(limit))
      .select('profile.displayName profile.avatar statistics.kills statistics.battles')
      .lean();

    const rankedPlayers = players.map((player, index) => ({
      rank: index + 1,
      id: player._id,
      displayName: player.profile.displayName,
      avatar: player.profile.avatar,
      kills: player.statistics.kills,
      battles: player.statistics.battles,
      kd: player.statistics.kills.total /
        Math.max(1, player.statistics.kills.deaths || 1),
    }));

    res.json({
      success: true,
      data: rankedPlayers,
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/my-rank
 * @desc    Get user's rank in various categories
 * @access  Private
 */
router.get('/my-rank',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('statistics currentSeason')
      .lean();

    // Calculate VP rank
    const vpRank = await User.countDocuments({
      status: 'active',
      'statistics.vp.total': { $gt: user.statistics?.vp?.total || 0 },
    }) + 1;

    // Calculate battles rank
    const battlesRank = await User.countDocuments({
      status: 'active',
      'statistics.battles.victories': { $gt: user.statistics?.battles?.victories || 0 },
    }) + 1;

    // Calculate kills rank
    const killsRank = await User.countDocuments({
      status: 'active',
      'statistics.kills.total': { $gt: user.statistics?.kills?.total || 0 },
    }) + 1;

    // Get tribe rank if in tribe
    let tribeRank = null;
    if (user.currentSeason?.tribeId) {
      const tribe = await Tribe.findById(user.currentSeason.tribeId)
        .select('victoryPoints.total')
        .lean();

      if (tribe) {
        tribeRank = await Tribe.countDocuments({
          status: 'active',
          'victoryPoints.total': { $gt: tribe.victoryPoints.total },
        }) + 1;
      }
    }

    res.json({
      success: true,
      data: {
        vpRank,
        battlesRank,
        killsRank,
        tribeRank,
        statistics: user.statistics,
      },
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/tribe/:id/rank
 * @desc    Get specific tribe's rank
 * @access  Private
 */
router.get('/tribe/:id/rank',
  authenticate,
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id)
      .select('name victoryPoints territoryCount')
      .lean();

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    const vpRank = await Tribe.countDocuments({
      status: 'active',
      'victoryPoints.total': { $gt: tribe.victoryPoints.total },
    }) + 1;

    const territoryRank = await Tribe.countDocuments({
      status: 'active',
      territoryCount: { $gt: tribe.territoryCount },
    }) + 1;

    const totalTribes = await Tribe.countDocuments({ status: 'active' });

    res.json({
      success: true,
      data: {
        tribeName: tribe.name,
        vpRank,
        territoryRank,
        totalTribes,
        victoryPoints: tribe.victoryPoints.total,
        territoryCount: tribe.territoryCount,
      },
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/territories/contested
 * @desc    Get most contested territories
 * @access  Private
 */
router.get('/territories/contested',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const territories = await Territory.aggregate([
      {
        $project: {
          territoryId: 1,
          name: 1,
          tier: 1,
          terrain: 1,
          controlledBy: 1,
          battleCount: { $size: { $ifNull: ['$battleHistory', []] } },
        },
      },
      { $sort: { battleCount: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({
      success: true,
      data: territories,
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/territories/held
 * @desc    Get longest held territories
 * @access  Private
 */
router.get('/territories/held',
  authenticate,
  asyncHandler(async (req, res) => {
    const { limit = 10 } = req.query;

    const territories = await Territory.find({
      'controlledBy.tribeId': { $exists: true },
    })
      .sort({ 'controlledBy.since': 1 })
      .limit(parseInt(limit))
      .populate('controlledBy.tribeId', 'name tag')
      .select('territoryId name tier terrain controlledBy')
      .lean();

    const now = new Date();
    const enrichedTerritories = territories.map(t => ({
      ...t,
      heldDuration: Math.floor((now - t.controlledBy.since) / (1000 * 60 * 60)), // hours
    }));

    res.json({
      success: true,
      data: enrichedTerritories,
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/season/:id/history
 * @desc    Get historical leaderboard for a completed season
 * @access  Private
 */
router.get('/season/:id/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id)
      .select('status finalStandings name')
      .lean();

    if (!season) {
      throw new NotFoundError('Season');
    }

    if (season.status !== 'completed') {
      return res.json({
        success: true,
        data: {
          message: 'Season not yet completed',
          status: season.status,
        },
      });
    }

    res.json({
      success: true,
      data: {
        seasonName: season.name,
        standings: season.finalStandings,
      },
    });
  })
);

/**
 * @route   GET /api/v1/leaderboard/statistics
 * @desc    Get global statistics
 * @access  Private
 */
router.get('/statistics',
  authenticate,
  asyncHandler(async (req, res) => {
    const Battle = require('../models/Battle');

    const [
      totalPlayers,
      totalTribes,
      totalBattles,
      territoriesControlled,
    ] = await Promise.all([
      User.countDocuments({ status: 'active' }),
      Tribe.countDocuments({ status: 'active' }),
      Battle.countDocuments({ status: 'completed' }),
      Territory.countDocuments({ 'controlledBy.tribeId': { $exists: true } }),
    ]);

    // Get top tribe
    const topTribe = await Tribe.findOne({ status: 'active' })
      .sort({ 'victoryPoints.total': -1 })
      .select('name tag victoryPoints.total')
      .lean();

    // Get top player
    const topPlayer = await User.findOne({ status: 'active' })
      .sort({ 'statistics.vp.total': -1 })
      .select('profile.displayName statistics.vp.total')
      .lean();

    res.json({
      success: true,
      data: {
        totalPlayers,
        totalTribes,
        totalBattles,
        territoriesControlled,
        totalTerritories: 50,
        topTribe: topTribe ? {
          name: topTribe.name,
          tag: topTribe.tag,
          vp: topTribe.victoryPoints.total,
        } : null,
        topPlayer: topPlayer ? {
          displayName: topPlayer.profile.displayName,
          vp: topPlayer.statistics.vp.total,
        } : null,
      },
    });
  })
);

module.exports = router;
