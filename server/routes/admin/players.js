/**
 * ADMIN PLAYERS ROUTES
 * Player management for admin panel
 */

const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Battle = require('../../models/Battle');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { roleCheck } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

/**
 * List/Search players
 * GET /api/admin/players
 */
router.get('/', roleCheck('players:read'), async (req, res) => {
  try {
    const { q, season, status, flagged, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { walletAddress: new RegExp(q, 'i') },
        { username: new RegExp(q, 'i') }
      ];
    }
    if (season) query.seasonId = season;
    if (status) query.status = status;
    if (flagged === 'true') query['flags.isUnderReview'] = true;

    const players = await User.find(query)
      .select('walletAddress username tribeId gold victoryPoints status createdAt moderation flags')
      .populate('tribeId', 'name tag')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: players.map(p => ({ ...p.toObject(), id: p._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get player details
 * GET /api/admin/players/:playerId
 */
router.get('/:playerId', roleCheck('players:read'), async (req, res) => {
  try {
    const player = await User.findById(req.params.playerId)
      .populate('tribeId');

    if (!player) {
      return res.status(404).json({
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
      });
    }

    // Get additional stats
    const battleCount = await Battle.countDocuments({
      $or: [{ attackerId: player._id }, { defenderId: player._id }]
    });

    const moderationHistory = await AdminAuditLog.find({
      'target.id': player._id,
      action: { $in: ['PLAYER_FLAG', 'PLAYER_WARN', 'PLAYER_BAN', 'PLAYER_KICK', 'PLAYER_COMPENSATE'] }
    }).sort({ timestamp: -1 }).limit(20);

    res.json({
      success: true,
      data: {
        ...player.toObject(),
        id: player._id,
        stats: { battleCount },
        moderationHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Flag player for review
 * POST /api/admin/players/:playerId/flag
 */
router.post('/:playerId/flag',
  roleCheck('players:flag'),
  auditLogger('PLAYER_FLAG', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason, priority = 'medium' } = req.body;

      const player = await User.findByIdAndUpdate(req.params.playerId, {
        $set: { 'flags.isUnderReview': true, 'flags.priority': priority },
        $push: {
          'flags.history': {
            type: 'flagged',
            reason,
            by: req.admin._id,
            at: new Date()
          }
        }
      }, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({ success: true, data: { message: 'Player flagged for review' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Issue warning
 * POST /api/admin/players/:playerId/warn
 */
router.post('/:playerId/warn',
  roleCheck('players:warn'),
  auditLogger('PLAYER_WARN', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Warning reason is required' }
        });
      }

      const player = await User.findByIdAndUpdate(req.params.playerId, {
        $inc: { 'moderation.warningCount': 1 },
        $push: {
          'moderation.warnings': {
            reason,
            issuedBy: req.admin._id,
            issuedAt: new Date()
          }
        }
      }, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({ success: true, data: { message: 'Warning issued' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Ban player
 * POST /api/admin/players/:playerId/ban
 */
router.post('/:playerId/ban',
  roleCheck('players:ban_short'),
  auditLogger('PLAYER_BAN', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { duration: req.body.duration, reason: req.body.reason, permanent: req.body.permanent }
  })),
  async (req, res) => {
    try {
      const { duration, reason, permanent = false } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Ban reason is required' }
        });
      }

      // Check permissions for long/permanent bans
      if (duration > 7 && req.admin.role === 'moderator') {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Cannot ban for more than 7 days' }
        });
      }

      if (permanent && req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only Super Admin can permanently ban' }
        });
      }

      const banUntil = permanent ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000);

      const player = await User.findByIdAndUpdate(req.params.playerId, {
        $set: {
          'moderation.isBanned': true,
          'moderation.banUntil': banUntil,
          'moderation.banReason': reason,
          'moderation.bannedBy': req.admin._id,
          'moderation.bannedAt': new Date(),
          'moderation.isPermanentBan': permanent
        }
      }, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({
        success: true,
        data: {
          message: permanent ? 'Player permanently banned' : `Player banned for ${duration} days`,
          banUntil
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Unban player
 * POST /api/admin/players/:playerId/unban
 */
router.post('/:playerId/unban',
  roleCheck('players:unban'),
  auditLogger('PLAYER_UNBAN', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;

      const player = await User.findByIdAndUpdate(req.params.playerId, {
        $set: {
          'moderation.isBanned': false,
          'moderation.banUntil': null,
          'moderation.isPermanentBan': false
        },
        $push: {
          'moderation.history': {
            action: 'unbanned',
            reason,
            by: req.admin._id,
            at: new Date()
          }
        }
      }, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({ success: true, data: { message: 'Player unbanned' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Kick from season
 * POST /api/admin/players/:playerId/kick
 */
router.post('/:playerId/kick',
  roleCheck('players:kick'),
  auditLogger('PLAYER_KICK', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;

      // Remove from current season, keep account active
      const player = await User.findByIdAndUpdate(req.params.playerId, {
        $set: {
          'currentSeason.isActive': false,
          'currentSeason.kickedAt': new Date(),
          'currentSeason.kickReason': reason
        }
      }, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({ success: true, data: { message: 'Player kicked from season' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Compensate player (Super Admin only)
 * POST /api/admin/players/:playerId/compensate
 */
router.post('/:playerId/compensate',
  roleCheck('players:compensate'),
  auditLogger('PLAYER_COMPENSATE', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const { gold = 0, units = {}, reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Compensation reason is required' }
        });
      }

      const update = { $inc: {} };
      if (gold !== 0) update.$inc.gold = gold;

      // Add units if specified
      if (Object.keys(units).length > 0) {
        for (const [unitType, count] of Object.entries(units)) {
          if (count !== 0) {
            update.$inc[`army.${unitType}`] = count;
          }
        }
      }

      const player = await User.findByIdAndUpdate(req.params.playerId, update, { new: true });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
        });
      }

      res.json({
        success: true,
        data: {
          message: 'Compensation applied',
          gold,
          units,
          reason
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Get player battles
 * GET /api/admin/players/:playerId/battles
 */
router.get('/:playerId/battles', roleCheck('players:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const battles = await Battle.find({
      $or: [
        { attackerId: req.params.playerId },
        { defenderId: req.params.playerId }
      ]
    })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('territoryId', 'name tier');

    const total = await Battle.countDocuments({
      $or: [
        { attackerId: req.params.playerId },
        { defenderId: req.params.playerId }
      ]
    });

    res.json({
      success: true,
      data: battles.map(b => ({ ...b.toObject(), id: b._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
