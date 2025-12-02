/**
 * BUILDING ROUTES
 * Building upgrades and management
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const logger = require('../utils/logger');
const { BUILDING_COSTS } = require('../config/constants');
const { authenticate, requireActiveSeason } = require('../middleware/auth');
const {
  asyncHandler,
  InsufficientResourcesError,
  GameError,
} = require('../middleware/errorHandler');
const { validate, buildingSchemas } = require('../middleware/validator');
const { trainingRateLimiter } = require('../middleware/rateLimit');
const { actionTracker } = require('../middleware/requestLogger');

/**
 * @route   GET /api/v1/buildings
 * @desc    Get user's buildings status
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('buildings gold')
      .lean();

    const buildingsStatus = {};

    for (const [buildingType, config] of Object.entries(BUILDING_COSTS)) {
      const userBuilding = user.buildings[buildingType] || { level: 1 };
      const currentLevel = userBuilding.level;
      const nextLevel = config.levels.find(l => l.level === currentLevel + 1);

      buildingsStatus[buildingType] = {
        name: config.name,
        description: config.description,
        currentLevel,
        maxLevel: config.levels.length,
        isUpgrading: userBuilding.isUpgrading || false,
        upgradeCompleteAt: userBuilding.upgradeCompleteAt,
        currentLevelStats: config.levels.find(l => l.level === currentLevel),
        nextLevelStats: nextLevel,
        upgradeCost: nextLevel?.cost || null,
        upgradeTime: nextLevel?.time || null,
        canUpgrade: !userBuilding.isUpgrading && nextLevel && user.gold >= nextLevel.cost,
      };
    }

    res.json({
      success: true,
      data: {
        buildings: buildingsStatus,
        gold: user.gold,
      },
    });
  })
);

/**
 * @route   GET /api/v1/buildings/:type
 * @desc    Get specific building details
 * @access  Private
 */
router.get('/:type',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    if (!BUILDING_COSTS[type]) {
      return res.status(404).json({
        success: false,
        error: 'Building type not found',
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const user = await User.findById(req.user.id)
      .select(`buildings.${type} gold`)
      .lean();

    const config = BUILDING_COSTS[type];
    const userBuilding = user.buildings[type] || { level: 1 };
    const currentLevel = userBuilding.level;

    res.json({
      success: true,
      data: {
        name: config.name,
        description: config.description,
        currentLevel,
        maxLevel: config.levels.length,
        isUpgrading: userBuilding.isUpgrading || false,
        upgradeCompleteAt: userBuilding.upgradeCompleteAt,
        allLevels: config.levels,
        totalCost: config.totalCost,
        totalTime: config.totalTime,
      },
    });
  })
);

/**
 * @route   POST /api/v1/buildings/:type/upgrade
 * @desc    Start building upgrade
 * @access  Private
 */
router.post('/:type/upgrade',
  authenticate,
  requireActiveSeason,
  trainingRateLimiter,
  actionTracker('building_upgrade'),
  validate(buildingSchemas.upgrade),
  asyncHandler(async (req, res) => {
    const { buildingType } = req.body;

    if (!BUILDING_COSTS[buildingType]) {
      return res.status(404).json({
        success: false,
        error: 'Building type not found',
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const user = await User.findById(req.user.id);
    const config = BUILDING_COSTS[buildingType];
    const userBuilding = user.buildings[buildingType] || { level: 1 };
    const currentLevel = userBuilding.level;

    // Check if already upgrading
    if (userBuilding.isUpgrading) {
      throw new GameError('Building is already being upgraded', 'ALREADY_UPGRADING');
    }

    // Check if max level
    if (currentLevel >= config.levels.length) {
      throw new GameError('Building is at maximum level', 'MAX_LEVEL');
    }

    // Get next level requirements
    const nextLevel = config.levels.find(l => l.level === currentLevel + 1);

    // Check gold
    if (user.gold < nextLevel.cost) {
      throw new InsufficientResourcesError('gold');
    }

    // Deduct gold and start upgrade
    user.gold -= nextLevel.cost;
    user.buildings[buildingType] = {
      level: currentLevel,
      isUpgrading: true,
      upgradeStartedAt: new Date(),
      upgradeCompleteAt: new Date(Date.now() + nextLevel.time * 1000),
      targetLevel: currentLevel + 1,
    };

    await user.save();

    logger.info('Building upgrade started', {
      userId: req.user.id,
      building: buildingType,
      fromLevel: currentLevel,
      toLevel: currentLevel + 1,
      cost: nextLevel.cost,
    });

    res.json({
      success: true,
      message: `${config.name} upgrade started`,
      data: {
        building: buildingType,
        fromLevel: currentLevel,
        toLevel: currentLevel + 1,
        cost: nextLevel.cost,
        completesAt: user.buildings[buildingType].upgradeCompleteAt,
        remainingGold: user.gold,
      },
    });
  })
);

/**
 * @route   POST /api/v1/buildings/:type/cancel
 * @desc    Cancel building upgrade (partial refund)
 * @access  Private
 */
router.post('/:type/cancel',
  authenticate,
  validate(buildingSchemas.cancelUpgrade),
  asyncHandler(async (req, res) => {
    const { buildingType } = req.body;

    if (!BUILDING_COSTS[buildingType]) {
      return res.status(404).json({
        success: false,
        error: 'Building type not found',
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const user = await User.findById(req.user.id);
    const userBuilding = user.buildings[buildingType];

    if (!userBuilding?.isUpgrading) {
      throw new GameError('No upgrade in progress', 'NO_UPGRADE');
    }

    // Calculate refund (50% of cost)
    const config = BUILDING_COSTS[buildingType];
    const targetLevel = config.levels.find(l => l.level === userBuilding.targetLevel);
    const refund = Math.floor(targetLevel.cost * 0.5);

    // Cancel upgrade and refund
    user.gold += refund;
    user.buildings[buildingType] = {
      level: userBuilding.level,
      isUpgrading: false,
    };

    await user.save();

    logger.info('Building upgrade cancelled', {
      userId: req.user.id,
      building: buildingType,
      refund,
    });

    res.json({
      success: true,
      message: `${config.name} upgrade cancelled`,
      data: {
        refund,
        remainingGold: user.gold,
      },
    });
  })
);

/**
 * @route   POST /api/v1/buildings/:type/complete
 * @desc    Complete building upgrade (called by cron or manually to claim)
 * @access  Private
 */
router.post('/:type/complete',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    if (!BUILDING_COSTS[type]) {
      return res.status(404).json({
        success: false,
        error: 'Building type not found',
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const user = await User.findById(req.user.id);
    const userBuilding = user.buildings[type];

    if (!userBuilding?.isUpgrading) {
      throw new GameError('No upgrade in progress', 'NO_UPGRADE');
    }

    // Check if upgrade is complete
    if (userBuilding.upgradeCompleteAt > new Date()) {
      const remaining = Math.ceil((userBuilding.upgradeCompleteAt - new Date()) / 1000);
      throw new GameError(`Upgrade completes in ${remaining} seconds`, 'NOT_COMPLETE');
    }

    // Complete upgrade
    const newLevel = userBuilding.targetLevel;
    user.buildings[type] = {
      level: newLevel,
      isUpgrading: false,
      lastUpgradedAt: new Date(),
    };

    await user.save();

    logger.info('Building upgrade completed', {
      userId: req.user.id,
      building: type,
      newLevel,
    });

    res.json({
      success: true,
      message: `${BUILDING_COSTS[type].name} upgraded to level ${newLevel}`,
      data: {
        building: type,
        newLevel,
        newStats: BUILDING_COSTS[type].levels.find(l => l.level === newLevel),
      },
    });
  })
);

/**
 * @route   POST /api/v1/buildings/:type/instant
 * @desc    Instantly complete upgrade with premium currency
 * @access  Private
 */
router.post('/:type/instant',
  authenticate,
  asyncHandler(async (req, res) => {
    const { type } = req.params;

    if (!BUILDING_COSTS[type]) {
      return res.status(404).json({
        success: false,
        error: 'Building type not found',
        code: 'BUILDING_NOT_FOUND',
      });
    }

    const user = await User.findById(req.user.id);
    const userBuilding = user.buildings[type];

    if (!userBuilding?.isUpgrading) {
      throw new GameError('No upgrade in progress', 'NO_UPGRADE');
    }

    // Calculate premium cost (1 gem per 60 seconds remaining)
    const remainingSeconds = Math.max(0,
      (userBuilding.upgradeCompleteAt - new Date()) / 1000
    );
    const premiumCost = Math.ceil(remainingSeconds / 60);

    if (user.premiumCurrency < premiumCost) {
      throw new InsufficientResourcesError('gems');
    }

    // Deduct gems and complete
    user.premiumCurrency -= premiumCost;
    user.buildings[type] = {
      level: userBuilding.targetLevel,
      isUpgrading: false,
      lastUpgradedAt: new Date(),
    };

    await user.save();

    logger.info('Building upgrade instant completed', {
      userId: req.user.id,
      building: type,
      gemCost: premiumCost,
    });

    res.json({
      success: true,
      message: `${BUILDING_COSTS[type].name} instantly upgraded`,
      data: {
        building: type,
        newLevel: userBuilding.targetLevel,
        gemsCost: premiumCost,
        remainingGems: user.premiumCurrency,
      },
    });
  })
);

module.exports = router;
