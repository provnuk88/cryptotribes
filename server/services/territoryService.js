/**
 * TERRITORY SERVICE
 * Territory management, control, and garrison operations
 */

const Territory = require('../models/Territory');
const Tribe = require('../models/Tribe');
const User = require('../models/User');
const logger = require('../utils/logger');
const {
  TERRITORY_TIERS,
  TERRAIN_MODIFIERS,
  NPC_GARRISONS,
  SHIELD_SETTINGS,
} = require('../config/constants');

/**
 * Generate hex-grid-like positions for territories
 * @param {number} territoryId - Territory ID (1-50)
 * @returns {Object} { x, y } coordinates
 */
function generatePosition(territoryId) {
  // Center territories (1-5): cluster in center
  if (territoryId <= 5) {
    const centerPositions = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ];
    return centerPositions[territoryId - 1];
  }

  // Ring territories (6-20): middle ring
  if (territoryId <= 20) {
    const ringId = territoryId - 6; // 0-14
    const angle = (ringId / 15) * 2 * Math.PI;
    const radius = 3;
    return {
      x: Math.round(radius * Math.cos(angle)),
      y: Math.round(radius * Math.sin(angle)),
    };
  }

  // Edge territories (21-50): outer ring
  const edgeId = territoryId - 21; // 0-29
  const angle = (edgeId / 30) * 2 * Math.PI;
  const radius = 6;
  return {
    x: Math.round(radius * Math.cos(angle)),
    y: Math.round(radius * Math.sin(angle)),
  };
}

/**
 * Initialize all 50 territories for a new season
 * @param {string} seasonId - Season ID
 * @returns {Promise<Array>} Created territories
 */
async function initializeSeasonTerritories(seasonId) {
  const territories = [];

  // Define territory distribution
  const distribution = [
    // Center (1-5): Castle terrain
    ...Array.from({ length: 5 }, (_, i) => ({
      territoryId: i + 1,
      tier: 'center',
      terrain: 'castle',
    })),

    // Ring (6-20): Mixed terrain
    ...Array.from({ length: 15 }, (_, i) => {
      const id = i + 6;
      let terrain;
      if (id <= 8) terrain = 'plains';
      else if (id <= 11) terrain = 'plains';
      else if (id <= 15) terrain = 'forest';
      else if (id <= 18) terrain = 'hills';
      else terrain = 'plains';
      return { territoryId: id, tier: 'ring', terrain };
    }),

    // Edge (21-50): Mostly plains
    ...Array.from({ length: 30 }, (_, i) => {
      const id = i + 21;
      let terrain;
      if (id <= 37) terrain = 'plains';
      else if (id <= 45) terrain = 'forest';
      else terrain = 'hills';
      return { territoryId: id, tier: 'edge', terrain };
    }),
  ];

  for (const config of distribution) {
    const tierConfig = TERRITORY_TIERS[config.tier];
    const npcConfig = NPC_GARRISONS[config.tier];
    const position = generatePosition(config.territoryId);

    const territory = await Territory.create({
      territoryId: config.territoryId,
      seasonId,
      name: `Territory ${config.territoryId}`,
      tier: config.tier,
      terrain: config.terrain,
      ownerId: null, // NPC controlled initially

      // Required fields from model
      goldPerHour: tierConfig.goldPerHour,
      vpPerHour: tierConfig.vpPerHour,

      // Position (required)
      position: {
        x: position.x,
        y: position.y,
      },

      // NPC garrison
      npcGarrison: {
        difficulty: npcConfig.difficulty,
        units: {
          militia: randomInRange(npcConfig.units.militia.min, npcConfig.units.militia.max),
          spearman: randomInRange(npcConfig.units.spearman.min, npcConfig.units.spearman.max),
          archer: randomInRange(npcConfig.units.archer.min, npcConfig.units.archer.max),
          cavalry: randomInRange(npcConfig.units.cavalry.min, npcConfig.units.cavalry.max),
        },
        active: true,
      },

      // Player garrison (empty initially)
      garrison: {
        tribeId: null,
        units: { militia: 0, spearman: 0, archer: 0, cavalry: 0 },
        formation: 'balanced',
        lastUpdated: new Date(),
      },
      garrisonContributors: [],
    });

    territories.push(territory);
  }

  logger.info(`Initialized ${territories.length} territories for season ${seasonId}`);
  return territories;
}

/**
 * Generate random number in range
 */
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get all territories for a season
 * @param {string} seasonId - Season ID
 * @returns {Promise<Array>} Territories
 */
async function getAllTerritories(seasonId) {
  return Territory.find({ seasonId })
    .populate('ownerId', 'name tag')
    .sort({ territoryId: 1 })
    .lean();
}

/**
 * Get territory by ID
 * @param {number} territoryId - Territory ID
 * @param {string} seasonId - Season ID
 * @returns {Promise<Object>} Territory
 */
async function getTerritoryById(territoryId, seasonId) {
  return Territory.findOne({ territoryId, seasonId })
    .populate('ownerId', 'name tag')
    .populate('garrisonContributors.userId', 'username')
    .lean();
}

/**
 * Get territories controlled by a tribe
 * @param {string} tribeId - Tribe ID
 * @param {string} seasonId - Season ID
 * @returns {Promise<Array>} Territories
 */
async function getTribesTerritories(tribeId, seasonId) {
  return Territory.find({ ownerId: tribeId, seasonId })
    .sort({ territoryId: 1 })
    .lean();
}

/**
 * Transfer territory ownership after battle
 * @param {number} territoryId - Territory ID
 * @param {string} seasonId - Season ID
 * @param {string} newOwnerId - New owner tribe ID
 * @param {Object} newGarrison - New garrison composition
 * @param {Object} session - Mongoose session
 * @returns {Promise<Object>} Updated territory
 */
async function transferTerritoryOwnership(territoryId, seasonId, newOwnerId, newGarrison, session = null) {
  const territory = await Territory.findOne({ territoryId, seasonId }).session(session);
  if (!territory) {
    throw new Error('Territory not found');
  }

  const oldOwnerId = territory.ownerId;

  // Update old owner's territory count
  if (oldOwnerId) {
    await Tribe.updateOne(
      { _id: oldOwnerId },
      { $inc: { territoryCount: -1 } },
      { session }
    );
  }

  // Update new owner's territory count
  await Tribe.updateOne(
    { _id: newOwnerId },
    { $inc: { territoryCount: 1 } },
    { session }
  );

  // Update territory
  territory.ownerId = newOwnerId;
  territory.capturedAt = new Date();

  territory.garrison = {
    tribeId: newOwnerId,
    units: newGarrison?.units || { militia: 0, spearman: 0, archer: 0, cavalry: 0 },
    formation: 'balanced',
    lastUpdated: new Date(),
  };

  territory.garrisonContributors = newGarrison?.contributors || [];

  // Clear NPC garrison
  if (territory.npcGarrison) {
    territory.npcGarrison.active = false;
  }

  // Add to capture history
  territory.captureHistory.push({
    tribeId: newOwnerId,
    capturedAt: new Date(),
    lostAt: null,
  });

  await territory.save({ session });

  logger.info('Territory ownership transferred', {
    territoryId,
    oldOwner: oldOwnerId,
    newOwner: newOwnerId,
  });

  return territory;
}

/**
 * Add units to territory garrison
 * @param {number} territoryId - Territory ID
 * @param {string} seasonId - Season ID
 * @param {string} userId - User ID contributing
 * @param {Object} units - Units to add
 * @returns {Promise<Object>} Updated territory
 */
async function reinforceTerritory(territoryId, seasonId, userId, units) {
  const territory = await Territory.findOne({ territoryId, seasonId });
  if (!territory) {
    throw new Error('Territory not found');
  }

  // Update total garrison
  for (const [unitType, count] of Object.entries(units)) {
    if (count > 0) {
      territory.garrison.units[unitType] =
        (territory.garrison.units[unitType] || 0) + count;
    }
  }
  territory.garrison.lastUpdated = new Date();

  // Update or add contributor
  const contributorIndex = territory.garrisonContributors.findIndex(
    c => c.userId.toString() === userId.toString()
  );

  if (contributorIndex >= 0) {
    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0) {
        territory.garrisonContributors[contributorIndex].units[unitType] =
          (territory.garrisonContributors[contributorIndex].units[unitType] || 0) + count;
      }
    }
  } else {
    territory.garrisonContributors.push({
      userId,
      units,
      addedAt: new Date(),
    });
  }

  await territory.save();
  return territory;
}

/**
 * Remove units from territory garrison
 * @param {number} territoryId - Territory ID
 * @param {string} seasonId - Season ID
 * @param {string} userId - User ID withdrawing
 * @param {Object} units - Units to withdraw (or null for all)
 * @returns {Promise<Object>} Withdrawn units
 */
async function withdrawFromTerritory(territoryId, seasonId, userId, units = null) {
  const territory = await Territory.findOne({ territoryId, seasonId });
  if (!territory) {
    throw new Error('Territory not found');
  }

  const contributorIndex = territory.garrisonContributors.findIndex(
    c => c.userId.toString() === userId.toString()
  );

  if (contributorIndex === -1) {
    throw new Error('No units in this territory');
  }

  const contributor = territory.garrisonContributors[contributorIndex];
  const withdrawn = {};

  if (units === null) {
    // Withdraw all
    for (const [unitType, count] of Object.entries(contributor.units)) {
      withdrawn[unitType] = count;
      territory.garrison.units[unitType] -= count;
    }
    territory.garrisonContributors.splice(contributorIndex, 1);
  } else {
    // Withdraw specific units
    for (const [unitType, count] of Object.entries(units)) {
      if (count > 0 && contributor.units[unitType] >= count) {
        withdrawn[unitType] = count;
        contributor.units[unitType] -= count;
        territory.garrison.units[unitType] -= count;
      }
    }

    // Remove contributor if no units left
    const remainingUnits = Object.values(contributor.units).reduce((a, b) => a + b, 0);
    if (remainingUnits === 0) {
      territory.garrisonContributors.splice(contributorIndex, 1);
    }
  }

  territory.garrison.lastUpdated = new Date();
  await territory.save();
  return withdrawn;
}

/**
 * Activate shield on territory
 * @param {number} territoryId - Territory ID
 * @param {string} seasonId - Season ID
 * @param {string} userId - User activating shield
 * @returns {Promise<Object>} Shield info
 */
async function activateShield(territoryId, seasonId, userId) {
  const territory = await Territory.findOne({ territoryId, seasonId });
  if (!territory) {
    throw new Error('Territory not found');
  }

  // Check if already shielded
  if (territory.shieldActive && territory.shieldUntil > new Date()) {
    throw new Error('Territory already shielded');
  }

  const expiresAt = new Date(Date.now() + SHIELD_SETTINGS.personal.duration * 1000);

  territory.shieldActive = true;
  territory.shieldUntil = expiresAt;
  territory.shieldedBy = userId;

  await territory.save();

  // Set user's shield cooldown
  await User.updateOne(
    { _id: userId },
    {
      shieldAvailable: new Date(Date.now() + SHIELD_SETTINGS.personal.cooldown * 1000),
    }
  );

  return {
    territoryId,
    expiresAt,
    duration: SHIELD_SETTINGS.personal.duration,
  };
}

/**
 * Get territory map data (optimized for frontend)
 * @param {string} seasonId - Season ID
 * @returns {Promise<Array>} Map data
 */
async function getTerritoryMapData(seasonId) {
  return Territory.find({ seasonId })
    .select('territoryId name tier terrain ownerId goldPerHour vpPerHour shieldActive position')
    .populate('ownerId', 'name tag')
    .sort({ territoryId: 1 })
    .lean();
}

/**
 * Check shield expiration and deactivate expired shields
 * @returns {Promise<number>} Number of shields deactivated
 */
async function processShieldExpiration() {
  const result = await Territory.updateMany(
    {
      shieldActive: true,
      shieldUntil: { $lte: new Date() },
    },
    {
      $set: { shieldActive: false, shieldedBy: null },
    }
  );

  if (result.modifiedCount > 0) {
    logger.info(`Deactivated ${result.modifiedCount} expired shields`);
  }

  return result.modifiedCount;
}

/**
 * Get adjacent territories
 * @param {number} territoryId - Territory ID
 * @returns {Array<number>} Adjacent territory IDs
 */
function getAdjacentTerritories(territoryId) {
  // Simplified adjacency - in real implementation, would use a graph
  const adjacencyMap = {
    // Center (1-5) - all adjacent to each other and ring
    1: [2, 3, 4, 5, 6, 7, 8],
    2: [1, 3, 4, 5, 8, 9, 10],
    3: [1, 2, 4, 5, 10, 11, 12],
    4: [1, 2, 3, 5, 12, 13, 14],
    5: [1, 2, 3, 4, 6, 14, 15],

    // Ring territories (6-20) - adjacent to center and edge
    // ... would define complete adjacency map here
  };

  return adjacencyMap[territoryId] || [];
}

module.exports = {
  initializeSeasonTerritories,
  getAllTerritories,
  getTerritoryById,
  getTribesTerritories,
  transferTerritoryOwnership,
  reinforceTerritory,
  withdrawFromTerritory,
  activateShield,
  getTerritoryMapData,
  processShieldExpiration,
  getAdjacentTerritories,
};
