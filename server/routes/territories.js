/**
 * TERRITORY ROUTES
 * Territory viewing, attacking, reinforcing, and management
 */

const express = require('express');
const router = express.Router();

const Territory = require('../models/Territory');
const User = require('../models/User');
const Battle = require('../models/Battle');
const logger = require('../utils/logger');
const {
  TERRITORY_TIERS,
  TERRAIN_MODIFIERS,
  SHIELD_SETTINGS,
} = require('../config/constants');
const {
  authenticate,
  requireTribe,
  requireActiveSeason,
} = require('../middleware/auth');
const {
  asyncHandler,
  NotFoundError,
  ForbiddenError,
  InsufficientResourcesError,
  GameError,
} = require('../middleware/errorHandler');
const { validate, territorySchemas } = require('../middleware/validator');
const { attackRateLimiter } = require('../middleware/rateLimit');
const { actionTracker } = require('../middleware/requestLogger');
const { addBattleToQueue } = require('../services/battleQueue');

/**
 * @route   GET /api/v1/territories
 * @desc    Get all territories (map data)
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const territories = await Territory.find()
      .populate('controlledBy.tribeId', 'name tag banner')
      .select('territoryId name tier terrain controlledBy.tribeId generation shield.active')
      .lean();

    res.json({
      success: true,
      data: territories,
    });
  })
);

/**
 * @route   GET /api/v1/territories/:id
 * @desc    Get territory details
 * @access  Private
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);

    const territory = await Territory.findOne({ territoryId })
      .populate('controlledBy.tribeId', 'name tag banner')
      .populate('garrison.contributors.userId', 'profile.displayName')
      .lean();

    if (!territory) {
      throw new NotFoundError('Territory');
    }

    // Check if user's tribe controls this territory
    const userTribeControls = req.user.tribeId &&
      territory.controlledBy?.tribeId?._id?.equals(req.user.tribeId);

    // Build response
    const response = {
      territoryId: territory.territoryId,
      name: territory.name,
      tier: territory.tier,
      terrain: territory.terrain,
      terrainModifiers: TERRAIN_MODIFIERS[territory.terrain],
      controlledBy: territory.controlledBy?.tribeId,
      controlledSince: territory.controlledBy?.since,
      generation: territory.generation,
      shield: {
        active: territory.shield?.active || false,
        expiresAt: territory.shield?.expiresAt,
      },
      recentBattles: territory.battleHistory?.slice(-5),
    };

    // Show garrison details only for controlling tribe
    if (userTribeControls) {
      response.garrison = {
        total: territory.garrison?.total,
        contributors: territory.garrison?.contributors?.map(c => ({
          userId: c.userId._id,
          displayName: c.userId.profile.displayName,
          units: c.units,
          percentage: c.percentage,
        })),
      };
    } else {
      // Only show total garrison strength
      response.garrison = {
        estimatedStrength: territory.garrison?.total ?
          estimateStrength(territory.garrison.total) : 'Unknown',
      };
    }

    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * Estimate garrison strength without revealing exact numbers
 */
function estimateStrength(garrison) {
  const total = (garrison.militia || 0) +
    (garrison.spearman || 0) +
    (garrison.archer || 0) +
    (garrison.cavalry || 0);

  if (total === 0) return 'Undefended';
  if (total < 20) return 'Weak';
  if (total < 50) return 'Moderate';
  if (total < 100) return 'Strong';
  if (total < 200) return 'Fortified';
  return 'Heavily Fortified';
}

/**
 * @route   POST /api/v1/territories/:id/attack
 * @desc    Attack a territory
 * @access  Private
 */
router.post('/:id/attack',
  authenticate,
  requireTribe,
  requireActiveSeason,
  attackRateLimiter,
  actionTracker('attack'),
  validate(territorySchemas.attack),
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);
    const { units, formation } = req.body;

    const territory = await Territory.findOne({ territoryId });
    if (!territory) {
      throw new NotFoundError('Territory');
    }

    // Check if attacking own territory
    if (territory.controlledBy?.tribeId?.equals(req.user.tribeId)) {
      throw new GameError('Cannot attack your own territory', 'CANNOT_ATTACK_OWN');
    }

    // Check if territory is shielded
    if (territory.shield?.active && territory.shield.expiresAt > new Date()) {
      throw new GameError('Territory is protected by a shield', 'TERRITORY_SHIELDED');
    }

    // Check if user has enough units
    const user = await User.findById(req.user.id);
    const userArmy = user.army;

    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0 && (userArmy[unitType] || 0) < count) {
        throw new InsufficientResourcesError(`${unitType} units`);
      }
    }

    // Calculate total units being sent
    const totalUnits = units.militia + units.spearman + units.archer + units.cavalry;
    if (totalUnits === 0) {
      throw new GameError('Must send at least one unit', 'NO_UNITS');
    }

    // Deduct units from user's army
    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0) {
        userArmy[unitType] -= count;
      }
    }
    await user.save();

    // Create battle record
    const battle = await Battle.create({
      seasonId: req.user.seasonId,
      territoryId,
      type: territory.controlledBy?.tribeId ? 'pvp' : 'pve',
      attacker: {
        tribeId: req.user.tribeId,
        userId: req.user.id,
        units: {
          initial: units,
          formation,
        },
      },
      defender: {
        tribeId: territory.controlledBy?.tribeId,
        userId: null, // Garrison defense
        units: {
          initial: territory.garrison?.total || { militia: 0, spearman: 0, archer: 0, cavalry: 0 },
        },
      },
      terrain: territory.terrain,
      status: 'queued',
    });

    // Add to battle queue
    await addBattleToQueue(battle._id);

    logger.info('Battle initiated', {
      battleId: battle._id,
      attacker: req.user.id,
      territory: territoryId,
      units: totalUnits,
    });

    res.status(202).json({
      success: true,
      message: 'Attack launched! Battle is being processed.',
      data: {
        battleId: battle._id,
        status: 'queued',
        estimatedTime: '5-10 seconds',
      },
    });
  })
);

/**
 * @route   POST /api/v1/territories/:id/reinforce
 * @desc    Send units to reinforce a territory
 * @access  Private
 */
router.post('/:id/reinforce',
  authenticate,
  requireTribe,
  actionTracker('reinforce'),
  validate(territorySchemas.reinforce),
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);
    const { units } = req.body;

    const territory = await Territory.findOne({ territoryId });
    if (!territory) {
      throw new NotFoundError('Territory');
    }

    // Check if tribe controls this territory
    if (!territory.controlledBy?.tribeId?.equals(req.user.tribeId)) {
      throw new ForbiddenError('Can only reinforce territories your tribe controls');
    }

    // Check if user has enough units
    const user = await User.findById(req.user.id);
    const userArmy = user.army;

    const totalSending = units.militia + units.spearman + units.archer + units.cavalry;
    if (totalSending === 0) {
      throw new GameError('Must send at least one unit', 'NO_UNITS');
    }

    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0 && (userArmy[unitType] || 0) < count) {
        throw new InsufficientResourcesError(`${unitType} units`);
      }
    }

    // Deduct from user's army
    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0) {
        userArmy[unitType] -= count;
      }
    }
    await user.save();

    // Add to territory garrison
    if (!territory.garrison) {
      territory.garrison = { total: {}, contributors: [] };
    }

    // Update total garrison
    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0) {
        territory.garrison.total[unitType] = (territory.garrison.total[unitType] || 0) + count;
      }
    }

    // Update contributor record
    const contributorIndex = territory.garrison.contributors.findIndex(
      c => c.userId.equals(req.user.id)
    );

    if (contributorIndex >= 0) {
      for (const [unitType, count] of Object.entries(units)) {
        if (count > 0) {
          territory.garrison.contributors[contributorIndex].units[unitType] =
            (territory.garrison.contributors[contributorIndex].units[unitType] || 0) + count;
        }
      }
    } else {
      territory.garrison.contributors.push({
        userId: req.user.id,
        units,
        sentAt: new Date(),
      });
    }

    // Recalculate percentages
    const totalGarrison = Object.values(territory.garrison.total).reduce((a, b) => a + b, 0);
    territory.garrison.contributors.forEach(c => {
      const contributorTotal = Object.values(c.units).reduce((a, b) => a + b, 0);
      c.percentage = (contributorTotal / totalGarrison) * 100;
    });

    await territory.save();

    logger.info('Territory reinforced', {
      territoryId,
      userId: req.user.id,
      units: totalSending,
    });

    res.json({
      success: true,
      message: 'Reinforcements sent',
      data: {
        totalGarrison: territory.garrison.total,
        yourContribution: territory.garrison.contributors.find(
          c => c.userId.equals(req.user.id)
        ),
      },
    });
  })
);

/**
 * @route   POST /api/v1/territories/:id/withdraw
 * @desc    Withdraw units from a territory
 * @access  Private
 */
router.post('/:id/withdraw',
  authenticate,
  requireTribe,
  validate(territorySchemas.withdraw),
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);
    const { units, withdrawAll } = req.body;

    const territory = await Territory.findOne({ territoryId });
    if (!territory) {
      throw new NotFoundError('Territory');
    }

    // Check if tribe controls this territory
    if (!territory.controlledBy?.tribeId?.equals(req.user.tribeId)) {
      throw new ForbiddenError('Can only withdraw from territories your tribe controls');
    }

    // Find contributor record
    const contributorIndex = territory.garrison.contributors.findIndex(
      c => c.userId.equals(req.user.id)
    );

    if (contributorIndex === -1) {
      throw new GameError('You have no units in this territory', 'NO_UNITS_HERE');
    }

    const contributor = territory.garrison.contributors[contributorIndex];
    const user = await User.findById(req.user.id);

    let unitsToWithdraw = {};

    if (withdrawAll) {
      unitsToWithdraw = { ...contributor.units };
    } else {
      // Validate withdrawal amount
      for (const [unitType, count] of Object.entries(units || {})) {
        if (count > 0) {
          if ((contributor.units[unitType] || 0) < count) {
            throw new GameError(`Not enough ${unitType} to withdraw`, 'INSUFFICIENT_UNITS');
          }
          unitsToWithdraw[unitType] = count;
        }
      }
    }

    // Transfer units back to user
    for (const [unitType, count] of Object.entries(unitsToWithdraw)) {
      if (count > 0) {
        user.army[unitType] = (user.army[unitType] || 0) + count;
        contributor.units[unitType] -= count;
        territory.garrison.total[unitType] -= count;
      }
    }

    // Remove contributor if no units left
    const remainingUnits = Object.values(contributor.units).reduce((a, b) => a + b, 0);
    if (remainingUnits === 0) {
      territory.garrison.contributors.splice(contributorIndex, 1);
    }

    // Recalculate percentages
    const totalGarrison = Object.values(territory.garrison.total).reduce((a, b) => a + b, 0);
    if (totalGarrison > 0) {
      territory.garrison.contributors.forEach(c => {
        const contributorTotal = Object.values(c.units).reduce((a, b) => a + b, 0);
        c.percentage = (contributorTotal / totalGarrison) * 100;
      });
    }

    await Promise.all([user.save(), territory.save()]);

    logger.info('Units withdrawn', {
      territoryId,
      userId: req.user.id,
      units: unitsToWithdraw,
    });

    res.json({
      success: true,
      message: 'Units withdrawn',
      data: {
        withdrawn: unitsToWithdraw,
        yourArmy: user.army,
      },
    });
  })
);

/**
 * @route   POST /api/v1/territories/:id/shield
 * @desc    Activate personal shield on territory
 * @access  Private
 */
router.post('/:id/shield',
  authenticate,
  requireTribe,
  validate(territorySchemas.shield),
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);

    const territory = await Territory.findOne({ territoryId });
    if (!territory) {
      throw new NotFoundError('Territory');
    }

    // Check if tribe controls this territory
    if (!territory.controlledBy?.tribeId?.equals(req.user.tribeId)) {
      throw new ForbiddenError('Can only shield territories your tribe controls');
    }

    // Check if territory already shielded
    if (territory.shield?.active && territory.shield.expiresAt > new Date()) {
      throw new GameError('Territory is already shielded', 'ALREADY_SHIELDED');
    }

    // Check user's shield cooldown
    const user = await User.findById(req.user.id);
    if (user.shieldCooldown && user.shieldCooldown > new Date()) {
      const remainingTime = Math.ceil((user.shieldCooldown - new Date()) / 1000 / 60);
      throw new GameError(
        `Shield on cooldown. Available in ${remainingTime} minutes`,
        'SHIELD_COOLDOWN'
      );
    }

    // Activate shield
    territory.shield = {
      active: true,
      type: 'personal',
      activatedBy: req.user.id,
      activatedAt: new Date(),
      expiresAt: new Date(Date.now() + SHIELD_SETTINGS.personal.duration * 1000),
    };
    await territory.save();

    // Set cooldown for user
    user.shieldCooldown = new Date(Date.now() + SHIELD_SETTINGS.personal.cooldown * 1000);
    await user.save();

    logger.info('Shield activated', {
      territoryId,
      userId: req.user.id,
      expiresAt: territory.shield.expiresAt,
    });

    res.json({
      success: true,
      message: 'Shield activated',
      data: {
        expiresAt: territory.shield.expiresAt,
        cooldownEndsAt: user.shieldCooldown,
      },
    });
  })
);

/**
 * @route   GET /api/v1/territories/:id/battles
 * @desc    Get territory battle history
 * @access  Private
 */
router.get('/:id/battles',
  authenticate,
  asyncHandler(async (req, res) => {
    const territoryId = parseInt(req.params.id);
    const { page = 1, limit = 20 } = req.query;

    const battles = await Battle.find({ territoryId })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .populate('attacker.userId', 'profile.displayName')
      .populate('attacker.tribeId', 'name tag')
      .populate('defender.tribeId', 'name tag')
      .lean();

    const total = await Battle.countDocuments({ territoryId });

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
 * @route   GET /api/v1/territories/my-garrison
 * @desc    Get all territories where user has units
 * @access  Private
 */
router.get('/my-garrison',
  authenticate,
  asyncHandler(async (req, res) => {
    const territories = await Territory.find({
      'garrison.contributors.userId': req.user.id,
    })
      .select('territoryId name tier terrain controlledBy garrison.contributors')
      .populate('controlledBy.tribeId', 'name tag')
      .lean();

    const myTerritories = territories.map(t => {
      const myContribution = t.garrison.contributors.find(
        c => c.userId.equals(req.user.id)
      );
      return {
        territoryId: t.territoryId,
        name: t.name,
        tier: t.tier,
        terrain: t.terrain,
        controlledBy: t.controlledBy?.tribeId,
        myUnits: myContribution?.units,
        myPercentage: myContribution?.percentage,
      };
    });

    res.json({
      success: true,
      data: myTerritories,
    });
  })
);

module.exports = router;
