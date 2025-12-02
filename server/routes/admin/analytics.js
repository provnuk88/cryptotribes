/**
 * ADMIN ANALYTICS ROUTES
 * Dashboard and analytics data for admin panel
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../../models/User');
const Tribe = require('../../models/Tribe');
const Battle = require('../../models/Battle');
const Season = require('../../models/Season');
const Report = require('../../models/Report');
const Territory = require('../../models/Territory');
const { roleCheck } = require('../../middleware/roleCheck');

/**
 * Dashboard overview
 * GET /api/admin/analytics/dashboard
 */
router.get('/dashboard', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;

    // Current/active season
    const currentSeason = seasonId
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'active' });

    if (!currentSeason) {
      return res.json({
        success: true,
        data: { noActiveSeason: true }
      });
    }

    const sId = currentSeason._id;

    const [
      playerCount,
      tribeCount,
      battleCountToday,
      battleCountTotal,
      topTribes,
      recentBattles,
      alerts
    ] = await Promise.all([
      User.countDocuments({ seasonId: sId }),
      Tribe.countDocuments({ seasonId: sId }),
      Battle.countDocuments({
        seasonId: sId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Battle.countDocuments({ seasonId: sId }),
      Tribe.find({ seasonId: sId })
        .sort({ victoryPoints: -1 })
        .limit(5)
        .select('name tag victoryPoints memberCount'),
      Battle.find({ seasonId: sId })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('attackerId', 'username')
        .populate('defenderId', 'username'),
      generateAlerts(sId)
    ]);

    // Calculate season progress
    const now = new Date();
    const start = currentSeason.timeline?.seasonStart || currentSeason.createdAt;
    const end = currentSeason.timeline?.seasonEnd || new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    const totalDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
    const elapsedDays = Math.max(0, (now - start) / (24 * 60 * 60 * 1000));
    const dayNumber = Math.min(Math.ceil(elapsedDays), totalDays);

    res.json({
      success: true,
      data: {
        season: {
          id: currentSeason._id,
          name: currentSeason.name,
          status: currentSeason.status,
          dayNumber,
          totalDays,
          prizePool: currentSeason.prizePool || 0
        },
        stats: {
          playerCount,
          tribeCount,
          battleCountToday,
          battleCountTotal
        },
        topTribes: topTribes.map(t => ({ ...t.toObject(), id: t._id })),
        recentBattles: recentBattles.map(b => ({ ...b.toObject(), id: b._id })),
        alerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Generate alerts
 */
async function generateAlerts(seasonId) {
  const alerts = [];

  try {
    // Check for flagged players
    const flaggedPlayers = await User.countDocuments({
      seasonId,
      'flags.isUnderReview': true
    });
    if (flaggedPlayers > 0) {
      alerts.push({
        type: 'warning',
        message: `${flaggedPlayers} players flagged for review`,
        action: '/admin/players?filter=flagged'
      });
    }

    // Check for pending reports
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    if (pendingReports > 0) {
      alerts.push({
        type: 'info',
        message: `${pendingReports} reports pending moderation`,
        action: '/admin/moderation/reports'
      });
    }

    // Check for snowball (top tribe too far ahead)
    const topTribes = await Tribe.find({ seasonId })
      .sort({ victoryPoints: -1 })
      .limit(2)
      .select('victoryPoints');

    if (topTribes.length >= 2 && topTribes[1].victoryPoints > 0) {
      const vpGap = topTribes[0].victoryPoints / topTribes[1].victoryPoints;
      if (vpGap > 1.5) {
        alerts.push({
          type: 'warning',
          message: `Top tribe ${Math.round((vpGap - 1) * 100)}% ahead (snowball risk)`,
          action: '/admin/analytics/balance'
        });
      }
    }
  } catch (e) {
    console.error('Alert generation error:', e);
  }

  return alerts;
}

/**
 * Economy analytics
 * GET /api/admin/analytics/economy
 */
router.get('/economy', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;

    if (!seasonId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SEASON_REQUIRED', message: 'Season ID required' }
      });
    }

    const economyData = await User.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $group: {
          _id: null,
          totalGoldInCirculation: { $sum: '$gold' },
          averageGold: { $avg: '$gold' },
          maxGold: { $max: '$gold' },
          minGold: { $min: '$gold' },
          totalUnits: {
            $sum: {
              $add: [
                { $ifNull: ['$army.militia', 0] },
                { $ifNull: ['$army.spearman', 0] },
                { $ifNull: ['$army.archer', 0] },
                { $ifNull: ['$army.cavalry', 0] }
              ]
            }
          },
          avgUnitsPerPlayer: {
            $avg: {
              $add: [
                { $ifNull: ['$army.militia', 0] },
                { $ifNull: ['$army.spearman', 0] },
                { $ifNull: ['$army.archer', 0] },
                { $ifNull: ['$army.cavalry', 0] }
              ]
            }
          }
        }
      }
    ]);

    // Gold distribution (buckets)
    const goldDistribution = await User.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $bucket: {
          groupBy: '$gold',
          boundaries: [0, 500, 1000, 2500, 5000, 10000, 50000],
          default: '50000+',
          output: { count: { $sum: 1 } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: economyData[0] || {},
        goldDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Balance analytics (for snowball detection)
 * GET /api/admin/analytics/balance
 */
router.get('/balance', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;

    if (!seasonId) {
      return res.status(400).json({
        success: false,
        error: { code: 'SEASON_REQUIRED', message: 'Season ID required' }
      });
    }

    // VP distribution by tribe
    const vpByTribe = await Tribe.find({ seasonId })
      .sort({ victoryPoints: -1 })
      .select('name tag victoryPoints memberCount territoriesControlled');

    // Territory control
    const territoryControl = await Territory.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $group: {
          _id: '$ownerId',
          count: { $sum: 1 },
          tiers: { $push: '$tier' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        vpByTribe: vpByTribe.map(t => ({ ...t.toObject(), id: t._id })),
        territoryControl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Player activity over time
 * GET /api/admin/analytics/activity
 */
router.get('/activity', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId, days = 7 } = req.query;

    const dateFilter = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const query = { timestamp: { $gte: dateFilter } };
    if (seasonId) query.seasonId = new mongoose.Types.ObjectId(seasonId);

    // Battles per day
    const battlesPerDay = await Battle.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // New players per day
    const newPlayersPerDay = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: dateFilter },
          ...(seasonId ? { seasonId: new mongoose.Types.ObjectId(seasonId) } : {})
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        battlesPerDay,
        newPlayersPerDay
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
