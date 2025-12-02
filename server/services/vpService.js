/**
 * VP (VICTORY POINTS) SERVICE
 * VP generation, tracking, and leaderboard calculations
 */

const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const logger = require('../utils/logger');
const {
  TERRITORY_TIERS,
  UNDERDOG_VP_BONUSES,
  BATTLE_VP_REWARDS,
  WAR_DECLARATION_VP_BONUS,
} = require('../config/constants');

/**
 * Get underdog VP bonus based on tribe rank
 * @param {number} rank - Tribe's current VP rank
 * @returns {number} VP multiplier
 */
function getUnderdogBonus(rank) {
  if (rank >= 1 && rank <= 3) return UNDERDOG_VP_BONUSES.rank1to3;
  if (rank >= 4 && rank <= 6) return UNDERDOG_VP_BONUSES.rank4to6;
  if (rank >= 7 && rank <= 10) return UNDERDOG_VP_BONUSES.rank7to10;
  return UNDERDOG_VP_BONUSES.rank11Plus;
}

/**
 * Calculate VP generation for a territory
 * @param {string} tier - Territory tier (center, ring, edge)
 * @returns {number} VP per hour
 */
function getTerritoryVpGeneration(tier) {
  const tierConfig = TERRITORY_TIERS[tier];
  return tierConfig?.vpPerHour || 0;
}

/**
 * Calculate battle VP rewards
 * @param {Object} options - Battle outcome options
 * @returns {Object} VP rewards for attacker and defender
 */
function calculateBattleVpRewards(options) {
  const {
    isAttackerVictory,
    territoryChanged,
    attackerKills,
    defenderKills,
    isWarTarget,
    attackerRank,
    defenderRank,
  } = options;

  let attackerVp = 0;
  let defenderVp = 0;

  // VP for territory capture
  if (isAttackerVictory && territoryChanged) {
    attackerVp += BATTLE_VP_REWARDS.territoryCaptured;
  }

  // VP for successful defense
  if (!isAttackerVictory && !territoryChanged) {
    defenderVp += BATTLE_VP_REWARDS.successfulDefense;
  }

  // VP per enemy unit killed
  attackerVp += defenderKills * BATTLE_VP_REWARDS.perEnemyUnitKilled;
  defenderVp += attackerKills * BATTLE_VP_REWARDS.perEnemyUnitKilled;

  // Apply war declaration bonus
  if (isWarTarget) {
    if (isAttackerVictory) {
      attackerVp *= WAR_DECLARATION_VP_BONUS;
    } else {
      defenderVp *= WAR_DECLARATION_VP_BONUS;
    }
  }

  // Apply underdog bonuses
  if (attackerRank) {
    attackerVp *= getUnderdogBonus(attackerRank);
  }
  if (defenderRank) {
    defenderVp *= getUnderdogBonus(defenderRank);
  }

  return {
    attacker: Math.floor(attackerVp),
    defender: Math.floor(defenderVp),
  };
}

/**
 * Award VP to a user
 * @param {string} userId - User ID
 * @param {number} amount - VP amount
 * @param {string} reason - Reason for VP award
 * @param {Object} session - Mongoose session
 * @returns {Promise<Object>} result
 */
async function awardUserVp(userId, amount, reason, session = null) {
  const user = await User.findById(userId).session(session);
  if (!user) {
    throw new Error('User not found');
  }

  const oldVp = user.statistics?.vp?.total || 0;
  const newVp = oldVp + amount;

  await User.updateOne(
    { _id: userId },
    {
      $inc: { 'statistics.vp.total': amount },
      $push: {
        'statistics.vp.history': {
          amount,
          reason,
          timestamp: new Date(),
        },
      },
    },
    { session }
  );

  // Update tribe VP
  if (user.currentSeason?.tribeId) {
    await Tribe.updateOne(
      { _id: user.currentSeason.tribeId },
      { $inc: { 'victoryPoints.total': amount } },
      { session }
    );
  }

  return { userId, oldVp, newVp, amount, reason };
}

/**
 * Award VP to a tribe
 * @param {string} tribeId - Tribe ID
 * @param {number} amount - VP amount
 * @param {string} reason - Reason for VP award
 * @param {Object} session - Mongoose session
 * @returns {Promise<Object>} result
 */
async function awardTribeVp(tribeId, amount, reason, session = null) {
  const tribe = await Tribe.findById(tribeId).session(session);
  if (!tribe) {
    throw new Error('Tribe not found');
  }

  const oldVp = tribe.victoryPoints.total;
  const newVp = oldVp + amount;

  await Tribe.updateOne(
    { _id: tribeId },
    {
      $inc: { 'victoryPoints.total': amount },
      $push: {
        'victoryPoints.history': {
          amount,
          reason,
          timestamp: new Date(),
        },
      },
    },
    { session }
  );

  return { tribeId, oldVp, newVp, amount, reason };
}

/**
 * Process hourly VP generation for all territories
 * @returns {Promise<Object>} processing results
 */
async function processHourlyVpGeneration() {
  const startTime = Date.now();
  let tribesProcessed = 0;
  let vpDistributed = 0;
  let errors = [];

  try {
    // Get tribe rankings for underdog bonus
    const tribes = await Tribe.find({ status: 'active' })
      .sort({ 'victoryPoints.total': -1 })
      .select('_id victoryPoints.total')
      .lean();

    const tribeRanks = {};
    tribes.forEach((tribe, index) => {
      tribeRanks[tribe._id.toString()] = index + 1;
    });

    // Get all controlled territories grouped by tribe
    const territories = await Territory.find({
      'controlledBy.tribeId': { $exists: true },
    }).lean();

    const tribeVpTotals = {};
    for (const territory of territories) {
      const tribeId = territory.controlledBy.tribeId.toString();
      if (!tribeVpTotals[tribeId]) {
        tribeVpTotals[tribeId] = 0;
      }
      tribeVpTotals[tribeId] += getTerritoryVpGeneration(territory.tier);
    }

    // Apply underdog bonuses and award VP
    for (const [tribeId, rawVp] of Object.entries(tribeVpTotals)) {
      try {
        const rank = tribeRanks[tribeId] || 99;
        const underdogMultiplier = getUnderdogBonus(rank);
        const finalVp = Math.floor(rawVp * underdogMultiplier);

        await Tribe.updateOne(
          { _id: tribeId },
          {
            $inc: { 'victoryPoints.total': finalVp },
            $push: {
              'victoryPoints.history': {
                $each: [{
                  amount: finalVp,
                  reason: 'Hourly territory VP',
                  raw: rawVp,
                  underdogMultiplier,
                  timestamp: new Date(),
                }],
                $slice: -100,
              },
            },
          }
        );

        tribesProcessed++;
        vpDistributed += finalVp;
      } catch (error) {
        errors.push({ tribeId, error: error.message });
      }
    }

    // Distribute VP to individual users based on garrison contribution
    await distributeVpToGarrisonContributors(territories);

    logger.info('Hourly VP generation completed', {
      tribesProcessed,
      vpDistributed,
      errors: errors.length,
      durationMs: Date.now() - startTime,
    });

    return {
      success: true,
      tribesProcessed,
      vpDistributed,
      errors,
    };
  } catch (error) {
    logger.error('Hourly VP generation failed', error);
    throw error;
  }
}

/**
 * Distribute VP to users based on garrison contribution
 * @param {Array} territories - Territories with garrisons
 */
async function distributeVpToGarrisonContributors(territories) {
  for (const territory of territories) {
    if (!territory.garrison?.contributors) continue;

    const vpPerHour = getTerritoryVpGeneration(territory.tier);

    for (const contributor of territory.garrison.contributors) {
      const userVp = Math.floor(vpPerHour * (contributor.percentage / 100));

      if (userVp > 0) {
        await User.updateOne(
          { _id: contributor.userId },
          {
            $inc: { 'statistics.vp.total': userVp },
          }
        );
      }
    }
  }
}

/**
 * Get tribe leaderboard with ranks
 * @param {string} seasonId - Season ID
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Ranked tribes
 */
async function getTribeLeaderboard(seasonId, limit = 50) {
  const tribes = await Tribe.find({
    seasonId,
    status: 'active',
  })
    .sort({ 'victoryPoints.total': -1 })
    .limit(limit)
    .select('name tag banner memberCount territoryCount victoryPoints.total')
    .lean();

  return tribes.map((tribe, index) => ({
    rank: index + 1,
    ...tribe,
    underdogBonus: getUnderdogBonus(index + 1),
  }));
}

/**
 * Get user VP leaderboard
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Ranked users
 */
async function getUserVpLeaderboard(limit = 50) {
  const users = await User.find({
    status: 'active',
    'statistics.vp.total': { $gt: 0 },
  })
    .sort({ 'statistics.vp.total': -1 })
    .limit(limit)
    .select('profile.displayName profile.avatar statistics.vp.total currentSeason.tribeId')
    .populate('currentSeason.tribeId', 'name tag')
    .lean();

  return users.map((user, index) => ({
    rank: index + 1,
    id: user._id,
    displayName: user.profile.displayName,
    avatar: user.profile.avatar,
    tribe: user.currentSeason?.tribeId,
    vp: user.statistics.vp.total,
  }));
}

/**
 * Get tribe rank
 * @param {string} tribeId - Tribe ID
 * @returns {Promise<number>} rank
 */
async function getTribeRank(tribeId) {
  const tribe = await Tribe.findById(tribeId).select('victoryPoints.total').lean();
  if (!tribe) return null;

  const higherRanked = await Tribe.countDocuments({
    status: 'active',
    'victoryPoints.total': { $gt: tribe.victoryPoints.total },
  });

  return higherRanked + 1;
}

module.exports = {
  getUnderdogBonus,
  getTerritoryVpGeneration,
  calculateBattleVpRewards,
  awardUserVp,
  awardTribeVp,
  processHourlyVpGeneration,
  distributeVpToGarrisonContributors,
  getTribeLeaderboard,
  getUserVpLeaderboard,
  getTribeRank,
};
