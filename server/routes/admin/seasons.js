/**
 * ADMIN SEASONS ROUTES
 * Season CRUD and management for admin panel
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Season = require('../../models/Season');
const User = require('../../models/User');
const Tribe = require('../../models/Tribe');
const Battle = require('../../models/Battle');
const { roleCheck, requireRole } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

/**
 * List all seasons
 * GET /api/admin/seasons
 */
router.get('/', roleCheck('seasons:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const query = {};
    if (status) query.status = status;

    const seasons = await Season.find(query)
      .sort({ seasonNumber: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Season.countDocuments(query);

    res.json({
      success: true,
      data: seasons,
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get season details
 * GET /api/admin/seasons/:seasonId
 */
router.get('/:seasonId', roleCheck('seasons:read'), async (req, res) => {
  try {
    const season = await Season.findById(req.params.seasonId);

    if (!season) {
      return res.status(404).json({
        success: false,
        error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
      });
    }

    // Get stats
    const playerCount = await User.countDocuments({ seasonId: season._id });
    const tribeCount = await Tribe.countDocuments({ seasonId: season._id });
    const battleCount = await Battle.countDocuments({ seasonId: season._id });

    res.json({
      success: true,
      data: {
        ...season.toObject(),
        id: season._id,
        stats: { playerCount, tribeCount, battleCount }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Create new season
 * POST /api/admin/seasons
 */
router.post('/',
  roleCheck('seasons:create'),
  auditLogger('SEASON_CREATE', (req, data) => ({
    type: 'season',
    id: data.data?.season?._id || data.data?._id,
    name: req.body.name
  })),
  async (req, res) => {
    try {
      const {
        name,
        registrationStart,
        registrationEnd,
        seasonStart,
        seasonEnd,
        entryFee = 25,
        ringConfig
      } = req.body;

      // Get next season number
      const lastSeason = await Season.findOne().sort({ seasonNumber: -1 });
      const seasonNumber = (lastSeason?.seasonNumber || 0) + 1;

      const season = await Season.create({
        name,
        seasonNumber,
        status: 'upcoming',
        timeline: {
          registrationStart: new Date(registrationStart),
          registrationEnd: new Date(registrationEnd),
          seasonStart: new Date(seasonStart),
          seasonEnd: new Date(seasonEnd)
        },
        entryFee,
        ringConfig: ringConfig || {
          preset: 'competitive',
          ringCount: 4,
          centerTerritories: 5,
          innerRingBase: 15,
          outerRingBase: 30
        },
        createdBy: req.admin._id
      });

      res.json({ success: true, data: { ...season.toObject(), id: season._id } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Update season
 * PUT /api/admin/seasons/:seasonId
 */
router.put('/:seasonId',
  roleCheck('seasons:update'),
  auditLogger('SEASON_UPDATE', (req) => ({
    type: 'season',
    id: req.params.seasonId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const season = await Season.findById(req.params.seasonId);

      if (!season) {
        return res.status(404).json({
          success: false,
          error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
        });
      }

      // Cannot edit active season (except Super Admin for emergencies)
      if (season.status === 'active' && req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'SEASON_ACTIVE', message: 'Cannot edit active season' }
        });
      }

      // Update allowed fields
      const allowedFields = ['name', 'entryFee', 'timeline', 'ringConfig', 'prizePool'];
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          season[field] = req.body[field];
        }
      }

      await season.save();

      res.json({ success: true, data: { ...season.toObject(), id: season._id } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Start season (Super Admin only)
 * POST /api/admin/seasons/:seasonId/start
 */
router.post('/:seasonId/start',
  requireRole('super_admin'),
  auditLogger('SEASON_START', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findByIdAndUpdate(
        req.params.seasonId,
        {
          status: 'active',
          'timeline.actualStart': new Date()
        },
        { new: true }
      );

      if (!season) {
        return res.status(404).json({
          success: false,
          error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
        });
      }

      res.json({ success: true, data: { ...season.toObject(), id: season._id, message: 'Season started!' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * End season (Super Admin only)
 * POST /api/admin/seasons/:seasonId/end
 */
router.post('/:seasonId/end',
  requireRole('super_admin'),
  auditLogger('SEASON_END', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findByIdAndUpdate(
        req.params.seasonId,
        {
          status: 'completed',
          'timeline.actualEnd': new Date()
        },
        { new: true }
      );

      if (!season) {
        return res.status(404).json({
          success: false,
          error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
        });
      }

      // TODO: Trigger prize distribution

      res.json({ success: true, data: { ...season.toObject(), id: season._id, message: 'Season ended!' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Delete season (Super Admin only, only if upcoming)
 * DELETE /api/admin/seasons/:seasonId
 */
router.delete('/:seasonId',
  requireRole('super_admin'),
  auditLogger('SEASON_DELETE', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findById(req.params.seasonId);

      if (!season) {
        return res.status(404).json({
          success: false,
          error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
        });
      }

      if (season.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DELETE', message: 'Can only delete upcoming seasons' }
        });
      }

      await season.deleteOne();

      res.json({ success: true, data: { message: 'Season deleted' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Get season analytics
 * GET /api/admin/seasons/:seasonId/analytics
 */
router.get('/:seasonId/analytics', roleCheck('analytics:read'), async (req, res) => {
  try {
    const seasonId = req.params.seasonId;

    const [playerStats, tribeStats, battleStats] = await Promise.all([
      // Player stats
      User.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        {
          $group: {
            _id: null,
            totalPlayers: { $sum: 1 },
            totalGold: { $sum: '$gold' },
            totalVP: { $sum: '$victoryPoints' },
            avgGold: { $avg: '$gold' }
          }
        }
      ]),

      // Tribe stats
      Tribe.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        {
          $group: {
            _id: null,
            totalTribes: { $sum: 1 },
            avgMembers: { $avg: { $size: { $ifNull: ['$members', []] } } }
          }
        }
      ]),

      // Battle stats
      Battle.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        {
          $group: {
            _id: null,
            totalBattles: { $sum: 1 },
            attackerWins: { $sum: { $cond: ['$attackerWon', 1, 0] } }
          }
        }
      ])
    ]);

    res.json({
      success: true,
      data: {
        players: playerStats[0] || {},
        tribes: tribeStats[0] || {},
        battles: battleStats[0] || {}
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
