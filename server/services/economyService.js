/**
 * ECONOMY SERVICE
 * Gold generation, upkeep calculation, and diminishing returns
 */

const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const logger = require('../utils/logger');
const {
  UPKEEP_COSTS,
  LEADER_UPKEEP_PENALTIES,
  BASE_GENERATION,
  DIMINISHING_RETURNS,
  BUILDING_COSTS,
  TRIBE_SETTINGS,
} = require('../config/constants');

/**
 * Get diminishing returns efficiency for territory count
 * @param {number} territoryCount - Number of territories held
 * @returns {number} efficiency multiplier (0-1)
 */
function getDiminishingReturnsEfficiency(territoryCount) {
  const bracket = DIMINISHING_RETURNS.brackets.find(
    b => territoryCount >= b.min && territoryCount <= b.max
  );
  return bracket ? bracket.efficiency : 0.2;
}

/**
 * Calculate leader upkeep penalty based on tribe rank
 * @param {number} rank - Tribe's VP rank
 * @returns {number} upkeep multiplier
 */
function getLeaderUpkeepPenalty(rank) {
  if (rank === 1) return LEADER_UPKEEP_PENALTIES.rank1;
  if (rank === 2) return LEADER_UPKEEP_PENALTIES.rank2;
  if (rank === 3) return LEADER_UPKEEP_PENALTIES.rank3;
  return LEADER_UPKEEP_PENALTIES.rank4Plus;
}

/**
 * Calculate army upkeep cost per hour
 * @param {Object} army - Army composition
 * @returns {number} upkeep cost in gold per hour
 */
function calculateArmyUpkeep(army) {
  const totalUnits = (army.militia || 0) +
    (army.spearman || 0) +
    (army.archer || 0) +
    (army.cavalry || 0);
  return totalUnits * UPKEEP_COSTS.armyPerHour;
}

/**
 * Calculate territory upkeep cost per hour
 * @param {number} territoryCount - Number of territories
 * @returns {number} upkeep cost in gold per hour
 */
function calculateTerritoryUpkeep(territoryCount) {
  return territoryCount * UPKEEP_COSTS.territoryPerHour;
}

/**
 * Calculate warehouse passive income
 * @param {number} warehouseLevel - Warehouse building level
 * @returns {number} gold per hour
 */
function calculateWarehouseIncome(warehouseLevel) {
  const config = BUILDING_COSTS.warehouse.levels.find(l => l.level === warehouseLevel);
  return config?.passiveIncome || 0;
}

/**
 * Calculate total income for a user from their territories
 * @param {string} userId - User ID
 * @param {string} tribeId - Tribe ID
 * @returns {Promise<Object>} income breakdown
 */
async function calculateUserTerritoryIncome(userId, tribeId) {
  const territories = await Territory.find({
    'controlledBy.tribeId': tribeId,
    'garrison.contributors.userId': userId,
  }).lean();

  let totalGoldIncome = 0;
  let totalVpIncome = 0;

  for (const territory of territories) {
    const contributor = territory.garrison?.contributors?.find(
      c => c.userId.toString() === userId.toString()
    );

    if (contributor) {
      const sharePercentage = contributor.percentage / 100;
      totalGoldIncome += territory.generation.goldPerHour * sharePercentage;
      totalVpIncome += territory.generation.vpPerHour * sharePercentage;
    }
  }

  return {
    goldPerHour: Math.floor(totalGoldIncome),
    vpPerHour: Math.floor(totalVpIncome),
    territoriesContributed: territories.length,
  };
}

/**
 * Calculate tribe territory income with diminishing returns
 * @param {string} tribeId - Tribe ID
 * @returns {Promise<Object>} tribe income data
 */
async function calculateTribeTerritoryIncome(tribeId) {
  const tribe = await Tribe.findById(tribeId).lean();
  if (!tribe) return { goldPerHour: 0, vpPerHour: 0 };

  const territories = await Territory.find({
    'controlledBy.tribeId': tribeId,
  }).lean();

  const territoryCount = territories.length;
  const efficiency = getDiminishingReturnsEfficiency(territoryCount);

  let rawGoldIncome = 0;
  let rawVpIncome = 0;

  for (const territory of territories) {
    rawGoldIncome += territory.generation.goldPerHour;
    rawVpIncome += territory.generation.vpPerHour;
  }

  // Apply diminishing returns
  const effectiveGoldIncome = Math.floor(rawGoldIncome * efficiency);
  const effectiveVpIncome = Math.floor(rawVpIncome * efficiency);

  return {
    territoryCount,
    efficiency,
    rawGoldPerHour: rawGoldIncome,
    rawVpPerHour: rawVpIncome,
    effectiveGoldPerHour: effectiveGoldIncome,
    effectiveVpPerHour: effectiveVpIncome,
  };
}

/**
 * Calculate full economy overview for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} economy breakdown
 */
async function calculateUserEconomy(userId) {
  const user = await User.findById(userId)
    .select('gold army buildings currentSeason')
    .lean();

  if (!user) {
    throw new Error('User not found');
  }

  // Base income
  const baseIncome = BASE_GENERATION.goldPerHour;

  // Warehouse income
  const warehouseLevel = user.buildings?.warehouse?.level || 1;
  const warehouseIncome = calculateWarehouseIncome(warehouseLevel);

  // Territory income
  let territoryIncome = { goldPerHour: 0, vpPerHour: 0, territoriesContributed: 0 };
  if (user.currentSeason?.tribeId) {
    territoryIncome = await calculateUserTerritoryIncome(
      userId,
      user.currentSeason.tribeId
    );
  }

  // Upkeep costs
  const armyUpkeep = calculateArmyUpkeep(user.army);
  const territoryUpkeep = calculateTerritoryUpkeep(territoryIncome.territoriesContributed);

  // Net income
  const grossIncome = baseIncome + warehouseIncome + territoryIncome.goldPerHour;
  const totalUpkeep = armyUpkeep + territoryUpkeep;
  const netIncome = grossIncome - totalUpkeep;

  return {
    currentGold: user.gold,
    income: {
      base: baseIncome,
      warehouse: warehouseIncome,
      territory: territoryIncome.goldPerHour,
      vp: territoryIncome.vpPerHour,
      gross: grossIncome,
    },
    upkeep: {
      army: armyUpkeep,
      territory: territoryUpkeep,
      total: totalUpkeep,
    },
    netIncomePerHour: netIncome,
    hoursUntilBankrupt: netIncome < 0 ?
      Math.floor(user.gold / Math.abs(netIncome)) : null,
  };
}

/**
 * Process hourly resource generation for all users
 * @returns {Promise<Object>} processing results
 */
async function processHourlyResourceGeneration() {
  const startTime = Date.now();
  let usersProcessed = 0;
  let goldDistributed = 0;
  let errors = [];

  try {
    // Get all active users with current season
    const users = await User.find({
      status: 'active',
      'currentSeason.seasonId': { $exists: true },
    }).select('_id gold army buildings currentSeason');

    for (const user of users) {
      try {
        const economy = await calculateUserEconomy(user._id);

        // Apply net income
        const newGold = Math.max(0, user.gold + economy.netIncomePerHour);

        await User.updateOne(
          { _id: user._id },
          {
            $set: { gold: newGold },
            $push: {
              transactions: {
                $each: [{
                  type: 'hourly_generation',
                  amount: economy.netIncomePerHour,
                  balance: newGold,
                  description: 'Hourly resource generation',
                  timestamp: new Date(),
                }],
                $slice: -100, // Keep last 100 transactions
              },
            },
          }
        );

        usersProcessed++;
        goldDistributed += economy.netIncomePerHour;
      } catch (error) {
        errors.push({ userId: user._id, error: error.message });
      }
    }

    logger.info('Hourly resource generation completed', {
      usersProcessed,
      goldDistributed,
      errors: errors.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      usersProcessed,
      goldDistributed,
      errors,
    };
  } catch (error) {
    logger.error('Hourly resource generation failed', error);
    throw error;
  }
}

/**
 * Calculate and apply treasury tax on territorial income
 * @param {string} tribeId - Tribe ID
 * @param {number} goldIncome - Gold income to tax
 * @returns {Promise<Object>} tax result
 */
async function applyTreasuryTax(tribeId, goldIncome) {
  const taxAmount = Math.floor(goldIncome * TRIBE_SETTINGS.treasuryTaxRate);

  await Tribe.updateOne(
    { _id: tribeId },
    {
      $inc: { 'treasury.balance': taxAmount },
      $push: {
        'treasury.history': {
          type: 'tax',
          amount: taxAmount,
          description: 'Territorial income tax',
          timestamp: new Date(),
        },
      },
    }
  );

  return { taxAmount };
}

/**
 * Calculate loot tax for battle winnings
 * @param {number} goldLooted - Gold looted from battle
 * @returns {number} tax amount
 */
function calculateBattleLootTax(goldLooted) {
  return Math.floor(goldLooted * TRIBE_SETTINGS.battleLootTaxRate);
}

/**
 * Transfer gold between users
 * @param {string} senderId - Sender user ID
 * @param {string} recipientId - Recipient user ID
 * @param {number} amount - Amount to transfer
 * @param {Object} session - Mongoose session for transaction
 * @returns {Promise<Object>} transfer result
 */
async function transferGold(senderId, recipientId, amount, session = null) {
  const transferFee = Math.ceil(amount * 0.05); // 5% fee
  const totalCost = amount + transferFee;

  const sender = await User.findById(senderId).session(session);
  const recipient = await User.findById(recipientId).session(session);

  if (!sender || !recipient) {
    throw new Error('User not found');
  }

  if (sender.gold < totalCost) {
    throw new Error('Insufficient gold');
  }

  // Deduct from sender
  sender.gold -= totalCost;
  sender.transactions.push({
    type: 'transfer_out',
    amount: -totalCost,
    balance: sender.gold,
    description: `Transfer to ${recipient.profile.displayName}`,
    timestamp: new Date(),
  });
  await sender.save({ session });

  // Add to recipient
  recipient.gold += amount;
  recipient.transactions.push({
    type: 'transfer_in',
    amount,
    balance: recipient.gold,
    description: `Transfer from ${sender.profile.displayName}`,
    timestamp: new Date(),
  });
  await recipient.save({ session });

  return {
    amount,
    fee: transferFee,
    senderNewBalance: sender.gold,
    recipientNewBalance: recipient.gold,
  };
}

module.exports = {
  getDiminishingReturnsEfficiency,
  getLeaderUpkeepPenalty,
  calculateArmyUpkeep,
  calculateTerritoryUpkeep,
  calculateWarehouseIncome,
  calculateUserTerritoryIncome,
  calculateTribeTerritoryIncome,
  calculateUserEconomy,
  processHourlyResourceGeneration,
  applyTreasuryTax,
  calculateBattleLootTax,
  transferGold,
};
