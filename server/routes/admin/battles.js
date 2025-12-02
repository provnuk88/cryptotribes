/**
 * ADMIN BATTLES ROUTES
 * Battle logs and management for admin panel
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Battle = require('../../models/Battle');
const User = require('../../models/User');
const Territory = require('../../models/Territory');
const { roleCheck, requireRole } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

/**
 * List battles
 * GET /api/admin/battles
 */
router.get('/', roleCheck('battles:read'), async (req, res) => {
  try {
    const {
      season,
      territory,
      attacker,
      defender,
      result,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (season) query.seasonId = season;
    if (territory) query.territoryId = territory;
    if (attacker) query.attackerId = attacker;
    if (defender) query.defenderId = defender;
    if (result === 'attacker') query.attackerWon = true;
    if (result === 'defender') query.attackerWon = false;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const battles = await Battle.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('attackerId', 'username walletAddress')
      .populate('defenderId', 'username walletAddress')
      .populate('territoryId', 'name tier');

    const total = await Battle.countDocuments(query);

    res.json({
      success: true,
      data: battles.map(b => ({ ...b.toObject(), id: b._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get battle details
 * GET /api/admin/battles/:battleId
 */
router.get('/:battleId', roleCheck('battles:read'), async (req, res) => {
  try {
    const battle = await Battle.findById(req.params.battleId)
      .populate('attackerId', 'username walletAddress tribeId')
      .populate('defenderId', 'username walletAddress tribeId')
      .populate('territoryId');

    if (!battle) {
      return res.status(404).json({
        success: false,
        error: { code: 'BATTLE_NOT_FOUND', message: 'Battle not found' }
      });
    }

    res.json({
      success: true,
      data: {
        ...battle.toObject(),
        id: battle._id
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Replay battle (recalculate with same RNG seed)
 * POST /api/admin/battles/:battleId/replay
 */
router.post('/:battleId/replay',
  requireRole('super_admin'),
  auditLogger('BATTLE_REPLAY', (req) => ({
    type: 'battle',
    id: req.params.battleId
  })),
  async (req, res) => {
    try {
      const battle = await Battle.findById(req.params.battleId);

      if (!battle) {
        return res.status(404).json({
          success: false,
          error: { code: 'BATTLE_NOT_FOUND', message: 'Battle not found' }
        });
      }

      // TODO: Implement battle replay logic
      // This would re-run the battle calculation with the same RNG seed

      res.json({
        success: true,
        data: {
          message: 'Battle replay feature not yet implemented',
          originalResult: battle.attackerWon ? 'attacker' : 'defender',
          rngSeed: battle.rngSeed
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Rollback battle (Super Admin only)
 * POST /api/admin/battles/:battleId/rollback
 */
router.post('/:battleId/rollback',
  requireRole('super_admin'),
  auditLogger('BATTLE_ROLLBACK', (req) => ({
    type: 'battle',
    id: req.params.battleId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Rollback reason is required' }
        });
      }

      const battle = await Battle.findById(req.params.battleId);

      if (!battle) {
        return res.status(404).json({
          success: false,
          error: { code: 'BATTLE_NOT_FOUND', message: 'Battle not found' }
        });
      }

      if (battle.isRolledBack) {
        return res.status(400).json({
          success: false,
          error: { code: 'ALREADY_ROLLED_BACK', message: 'Battle already rolled back' }
        });
      }

      // Rollback effects
      // 1. Restore units lost
      if (battle.attackerUnitsLost) {
        await User.findByIdAndUpdate(battle.attackerId, {
          $inc: {
            'army.militia': battle.attackerUnitsLost.militia || 0,
            'army.spearman': battle.attackerUnitsLost.spearman || 0,
            'army.archer': battle.attackerUnitsLost.archer || 0,
            'army.cavalry': battle.attackerUnitsLost.cavalry || 0
          }
        });
      }

      if (battle.defenderUnitsLost) {
        await User.findByIdAndUpdate(battle.defenderId, {
          $inc: {
            'army.militia': battle.defenderUnitsLost.militia || 0,
            'army.spearman': battle.defenderUnitsLost.spearman || 0,
            'army.archer': battle.defenderUnitsLost.archer || 0,
            'army.cavalry': battle.defenderUnitsLost.cavalry || 0
          }
        });
      }

      // 2. Revert territory if ownership changed
      if (battle.attackerWon && battle.territoryId) {
        await Territory.findByIdAndUpdate(battle.territoryId, {
          $set: {
            ownerId: battle.previousOwnerId || battle.defenderId
          }
        });
      }

      // 3. Mark battle as rolled back
      battle.isRolledBack = true;
      battle.rollbackReason = reason;
      battle.rolledBackBy = req.admin._id;
      battle.rolledBackAt = new Date();
      await battle.save();

      res.json({
        success: true,
        data: { message: 'Battle rolled back successfully' }
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Get battle statistics
 * GET /api/admin/battles/stats
 */
router.get('/stats/summary', roleCheck('battles:read'), async (req, res) => {
  try {
    const { season, days = 7 } = req.query;

    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const query = { timestamp: { $gte: dateFilter } };
    if (season) query.seasonId = new mongoose.Types.ObjectId(season);

    const stats = await Battle.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          totalBattles: { $sum: 1 },
          attackerWins: { $sum: { $cond: ['$attackerWon', 1, 0] } },
          defenderWins: { $sum: { $cond: ['$attackerWon', 0, 1] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const totals = await Battle.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          attackerWins: { $sum: { $cond: ['$attackerWon', 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        daily: stats,
        totals: totals[0] || { total: 0, attackerWins: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
