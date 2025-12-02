/**
 * UNIT ROUTES
 * Unit training, queue management
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const logger = require('../utils/logger');
const { UNIT_STATS, BUILDING_COSTS, SUPPLY_CAP } = require('../config/constants');
const { authenticate, requireActiveSeason } = require('../middleware/auth');
const {
  asyncHandler,
  InsufficientResourcesError,
  GameError,
} = require('../middleware/errorHandler');
const { validate, unitSchemas } = require('../middleware/validator');
const { trainingRateLimiter } = require('../middleware/rateLimit');
const { actionTracker } = require('../middleware/requestLogger');

/**
 * Calculate user's supply cap based on building levels
 */
function calculateSupplyCap(buildings) {
  let totalBuildingLevels = 0;
  for (const building of Object.values(buildings)) {
    totalBuildingLevels += building.level || 1;
  }
  return SUPPLY_CAP.base + (totalBuildingLevels * SUPPLY_CAP.perBuildingLevel);
}

/**
 * Calculate current army size
 */
function calculateArmySize(army) {
  return (army.militia || 0) +
    (army.spearman || 0) +
    (army.archer || 0) +
    (army.cavalry || 0);
}

/**
 * Calculate training time based on barracks level
 */
function getTrainingTime(unitType, barracksLevel) {
  const unit = UNIT_STATS[unitType];
  const baseTime = unit.trainingTime.barracksLv1;
  const minTime = unit.trainingTime.barracksLv10;

  // Linear interpolation between base and min time
  const reduction = (baseTime - minTime) * (barracksLevel - 1) / 9;
  return Math.max(minTime, baseTime - reduction);
}

/**
 * @route   GET /api/v1/units
 * @desc    Get user's army and unit info
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('army buildings trainingQueue gold')
      .lean();

    const barracksLevel = user.buildings?.barracks?.level || 1;
    const supplyCap = calculateSupplyCap(user.buildings);
    const currentSupply = calculateArmySize(user.army);

    // Build unit info with availability
    const units = {};
    for (const [unitType, stats] of Object.entries(UNIT_STATS)) {
      const isUnlocked = !stats.unlockLevel || barracksLevel >= stats.unlockLevel;
      units[unitType] = {
        ...stats,
        isUnlocked,
        unlockRequirement: stats.unlockLevel ? `Barracks Level ${stats.unlockLevel}` : null,
        trainingTime: getTrainingTime(unitType, barracksLevel),
        count: user.army[unitType] || 0,
      };
    }

    res.json({
      success: true,
      data: {
        army: user.army,
        units,
        supplyCap,
        currentSupply,
        availableSupply: supplyCap - currentSupply,
        gold: user.gold,
        barracksLevel,
        trainingQueue: user.trainingQueue || [],
      },
    });
  })
);

/**
 * @route   GET /api/v1/units/queue
 * @desc    Get training queue status
 * @access  Private
 */
router.get('/queue',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('trainingQueue buildings')
      .lean();

    const barracksLevel = user.buildings?.barracks?.level || 1;
    const barracksConfig = BUILDING_COSTS.barracks.levels.find(l => l.level === barracksLevel);
    const queueSize = barracksConfig?.queueSize || 10;

    res.json({
      success: true,
      data: {
        queue: user.trainingQueue || [],
        queueSize,
        currentQueueCount: (user.trainingQueue || []).reduce((sum, item) => sum + item.quantity, 0),
        barracksLevel,
      },
    });
  })
);

/**
 * @route   POST /api/v1/units/train
 * @desc    Add units to training queue
 * @access  Private
 */
router.post('/train',
  authenticate,
  requireActiveSeason,
  trainingRateLimiter,
  actionTracker('train_units'),
  validate(unitSchemas.train),
  asyncHandler(async (req, res) => {
    const { unitType, quantity } = req.body;

    const unitStats = UNIT_STATS[unitType];
    if (!unitStats) {
      throw new GameError('Invalid unit type', 'INVALID_UNIT');
    }

    const user = await User.findById(req.user.id);
    const barracksLevel = user.buildings?.barracks?.level || 1;

    // Check if unit is unlocked
    if (unitStats.unlockLevel && barracksLevel < unitStats.unlockLevel) {
      throw new GameError(
        `Requires Barracks Level ${unitStats.unlockLevel}`,
        'UNIT_LOCKED'
      );
    }

    // Check supply cap
    const supplyCap = calculateSupplyCap(user.buildings);
    const currentSupply = calculateArmySize(user.army);
    const queuedSupply = (user.trainingQueue || []).reduce((sum, item) => sum + item.quantity, 0);

    if (currentSupply + queuedSupply + quantity > supplyCap) {
      throw new GameError(
        `Would exceed supply cap (${supplyCap}). Available: ${supplyCap - currentSupply - queuedSupply}`,
        'SUPPLY_CAP_EXCEEDED'
      );
    }

    // Check queue size
    const barracksConfig = BUILDING_COSTS.barracks.levels.find(l => l.level === barracksLevel);
    const maxQueueSize = barracksConfig?.queueSize || 10;
    const currentQueueCount = (user.trainingQueue || []).reduce((sum, item) => sum + item.quantity, 0);

    if (currentQueueCount + quantity > maxQueueSize) {
      throw new GameError(
        `Queue full. Max: ${maxQueueSize}, Current: ${currentQueueCount}`,
        'QUEUE_FULL'
      );
    }

    // Check gold
    const totalCost = unitStats.cost * quantity;
    if (user.gold < totalCost) {
      throw new InsufficientResourcesError('gold');
    }

    // Calculate training time
    const trainingTimePerUnit = getTrainingTime(unitType, barracksLevel);
    const totalTrainingTime = trainingTimePerUnit * quantity;

    // Find queue completion time
    let startTime = new Date();
    if (user.trainingQueue && user.trainingQueue.length > 0) {
      const lastItem = user.trainingQueue[user.trainingQueue.length - 1];
      startTime = new Date(lastItem.completesAt);
    }

    const completesAt = new Date(startTime.getTime() + totalTrainingTime * 1000);

    // Deduct gold and add to queue
    user.gold -= totalCost;

    if (!user.trainingQueue) {
      user.trainingQueue = [];
    }

    user.trainingQueue.push({
      unitType,
      quantity,
      costPerUnit: unitStats.cost,
      totalCost,
      trainingTimePerUnit,
      startedAt: startTime,
      completesAt,
    });

    await user.save();

    logger.info('Units queued for training', {
      userId: req.user.id,
      unitType,
      quantity,
      cost: totalCost,
      completesAt,
    });

    res.json({
      success: true,
      message: `${quantity} ${unitStats.name} queued for training`,
      data: {
        unitType,
        quantity,
        cost: totalCost,
        completesAt,
        remainingGold: user.gold,
        queuePosition: user.trainingQueue.length,
      },
    });
  })
);

/**
 * @route   DELETE /api/v1/units/queue/:index
 * @desc    Cancel training queue item (partial refund)
 * @access  Private
 */
router.delete('/queue/:index',
  authenticate,
  validate(unitSchemas.cancelTraining),
  asyncHandler(async (req, res) => {
    const queueIndex = parseInt(req.params.index);

    const user = await User.findById(req.user.id);

    if (!user.trainingQueue || queueIndex >= user.trainingQueue.length) {
      throw new GameError('Invalid queue index', 'INVALID_INDEX');
    }

    const item = user.trainingQueue[queueIndex];

    // Calculate refund based on progress
    let refund = item.totalCost;

    // If currently training (first in queue), partial refund based on progress
    if (queueIndex === 0) {
      const now = new Date();
      const elapsed = now - item.startedAt;
      const total = item.completesAt - item.startedAt;
      const progress = Math.min(1, elapsed / total);

      // Refund for unfinished portion (50% rate)
      const unfinishedPortion = 1 - progress;
      refund = Math.floor(item.totalCost * unfinishedPortion * 0.5);
    } else {
      // Full refund at 50% for queued items
      refund = Math.floor(item.totalCost * 0.5);
    }

    // Remove from queue
    user.trainingQueue.splice(queueIndex, 1);

    // Recalculate queue times for remaining items
    if (queueIndex === 0 && user.trainingQueue.length > 0) {
      let startTime = new Date();
      for (let i = 0; i < user.trainingQueue.length; i++) {
        const qItem = user.trainingQueue[i];
        qItem.startedAt = startTime;
        qItem.completesAt = new Date(
          startTime.getTime() + qItem.trainingTimePerUnit * qItem.quantity * 1000
        );
        startTime = qItem.completesAt;
      }
    }

    // Add refund
    user.gold += refund;

    await user.save();

    logger.info('Training cancelled', {
      userId: req.user.id,
      unitType: item.unitType,
      quantity: item.quantity,
      refund,
    });

    res.json({
      success: true,
      message: 'Training cancelled',
      data: {
        refund,
        remainingGold: user.gold,
        remainingQueue: user.trainingQueue,
      },
    });
  })
);

/**
 * @route   POST /api/v1/units/collect
 * @desc    Collect trained units from queue
 * @access  Private
 */
router.post('/collect',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user.trainingQueue || user.trainingQueue.length === 0) {
      return res.json({
        success: true,
        message: 'No units to collect',
        data: { collected: {} },
      });
    }

    const now = new Date();
    const collected = {};
    const remaining = [];

    for (const item of user.trainingQueue) {
      if (item.completesAt <= now) {
        // Training complete - add to army
        user.army[item.unitType] = (user.army[item.unitType] || 0) + item.quantity;
        collected[item.unitType] = (collected[item.unitType] || 0) + item.quantity;
      } else {
        remaining.push(item);
      }
    }

    user.trainingQueue = remaining;
    await user.save();

    const totalCollected = Object.values(collected).reduce((a, b) => a + b, 0);

    if (totalCollected > 0) {
      logger.info('Units collected', {
        userId: req.user.id,
        collected,
      });
    }

    res.json({
      success: true,
      message: totalCollected > 0 ? `Collected ${totalCollected} units` : 'No units ready',
      data: {
        collected,
        army: user.army,
        remainingQueue: user.trainingQueue,
      },
    });
  })
);

/**
 * @route   POST /api/v1/units/instant-train
 * @desc    Instantly complete training with premium currency
 * @access  Private
 */
router.post('/instant-train',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user.trainingQueue || user.trainingQueue.length === 0) {
      throw new GameError('No training in progress', 'NO_TRAINING');
    }

    // Calculate total remaining time
    const now = new Date();
    let totalRemainingSeconds = 0;

    for (const item of user.trainingQueue) {
      if (item.completesAt > now) {
        totalRemainingSeconds += (item.completesAt - now) / 1000;
      }
    }

    // 1 gem per 60 seconds
    const gemCost = Math.ceil(totalRemainingSeconds / 60);

    if (user.premiumCurrency < gemCost) {
      throw new InsufficientResourcesError('gems');
    }

    // Deduct gems and complete all training
    user.premiumCurrency -= gemCost;

    const collected = {};
    for (const item of user.trainingQueue) {
      user.army[item.unitType] = (user.army[item.unitType] || 0) + item.quantity;
      collected[item.unitType] = (collected[item.unitType] || 0) + item.quantity;
    }

    user.trainingQueue = [];
    await user.save();

    logger.info('Training instantly completed', {
      userId: req.user.id,
      gemCost,
      collected,
    });

    res.json({
      success: true,
      message: 'All training instantly completed',
      data: {
        collected,
        gemsCost: gemCost,
        remainingGems: user.premiumCurrency,
        army: user.army,
      },
    });
  })
);

module.exports = router;
