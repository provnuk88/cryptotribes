/**
 * BATTLE QUEUE SERVICE
 * Bull.js queue for processing battles asynchronously
 */

const Queue = require('bull');
const mongoose = require('mongoose');

const Battle = require('../models/Battle');
const Territory = require('../models/Territory');
const User = require('../models/User');
const Tribe = require('../models/Tribe');
const logger = require('../utils/logger');
const combatCalculator = require('./combatCalculator');
const { transferTerritoryOwnership } = require('./territoryService');
const { awardTribeVp } = require('./vpService');
const { withTransaction } = require('../config/database');

// Redis connection config
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create battle queue
let battleQueue = null;

/**
 * Initialize the battle queue
 */
async function initializeBattleQueue() {
  try {
    battleQueue = new Queue('battle-processing', REDIS_URL, {
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    // Process battles
    battleQueue.process('battle', 5, processBattle);

    // Event handlers
    battleQueue.on('completed', (job, result) => {
      logger.debug('Battle completed', {
        jobId: job.id,
        battleId: job.data.battleId,
        result: result?.result,
      });
    });

    battleQueue.on('failed', (job, error) => {
      logger.error('Battle processing failed', {
        jobId: job.id,
        battleId: job.data.battleId,
        error: error.message,
      });
    });

    battleQueue.on('error', (error) => {
      logger.error('Battle queue error', error);
    });

    logger.info('Battle queue initialized');
    return battleQueue;
  } catch (error) {
    logger.error('Failed to initialize battle queue', error);
    throw error;
  }
}

/**
 * Add a battle to the processing queue
 * @param {string} battleId - Battle document ID
 * @returns {Promise<Object>} Job info
 */
async function addBattleToQueue(battleId) {
  if (!battleQueue) {
    throw new Error('Battle queue not initialized');
  }

  const job = await battleQueue.add('battle', { battleId }, {
    priority: 1,
    delay: 0, // Process immediately
  });

  logger.debug('Battle added to queue', { battleId, jobId: job.id });
  return { jobId: job.id, battleId };
}

/**
 * Process a battle from the queue
 * @param {Object} job - Bull job
 * @returns {Promise<Object>} Battle result
 */
async function processBattle(job) {
  const { battleId } = job.data;

  logger.debug('Processing battle', { battleId, jobId: job.id });

  try {
    const result = await withTransaction(async (session) => {
      // 1. Get and lock battle record
      const battle = await Battle.findById(battleId).session(session);
      if (!battle) {
        throw new Error('Battle not found');
      }

      if (battle.status !== 'queued') {
        logger.warn('Battle already processed', { battleId, status: battle.status });
        return { skipped: true, status: battle.status };
      }

      battle.status = 'processing';
      await battle.save({ session });

      // 2. Get territory
      const territory = await Territory.findOne({
        territoryId: battle.territoryId,
      }).session(session);

      if (!territory) {
        throw new Error('Territory not found');
      }

      // 3. Get attacker user for workshop level
      const attacker = await User.findById(battle.attacker.userId)
        .select('buildings.workshop.level')
        .session(session);

      // 4. Determine defender army (garrison or NPC)
      let defenderArmy;
      let isNpcDefender = false;

      if (territory.controlledBy?.tribeId) {
        defenderArmy = territory.garrison?.total || {
          militia: 0, spearman: 0, archer: 0, cavalry: 0,
        };
      } else {
        defenderArmy = territory.npcGarrison || {
          militia: 0, spearman: 0, archer: 0, cavalry: 0,
        };
        isNpcDefender = true;
      }

      // 5. Calculate battle with combat calculator
      const battleResult = combatCalculator.processBattle({
        attackerArmy: battle.attacker.units.initial,
        defenderArmy,
        terrain: territory.terrain,
        attackerFormation: battle.attacker.units.formation || 'balanced',
        defenderFormation: 'defensive',
        attackerWorkshopLevel: attacker?.buildings?.workshop?.level || 1,
        defenderWorkshopLevel: 1,
        defenderGold: 0, // Would get from user if PvP
        defenderWarehouseProtection: 0,
        isNpcDefender,
        isWarTarget: false, // Would check war declarations
      });

      // 6. Update battle record with results
      battle.defender.units.initial = defenderArmy;
      battle.attacker.power = battleResult.attacker.initialPower;
      battle.defender.power = battleResult.defender.initialPower;
      battle.attacker.casualties = battleResult.attacker.casualties;
      battle.defender.casualties = battleResult.defender.casualties;
      battle.attacker.survivors = battleResult.attacker.survivors;
      battle.defender.survivors = battleResult.defender.survivors;
      battle.result = battleResult.result;
      battle.combatLog = battleResult.combatLog;
      battle.rewards = {
        goldLooted: battleResult.attacker.goldLooted || 0,
        vpGained: battleResult.attacker.vpGained || 0,
      };
      battle.status = 'completed';
      battle.completedAt = new Date();

      await battle.save({ session });

      // 7. Apply casualties to attacker's army
      await User.updateOne(
        { _id: battle.attacker.userId },
        {
          $inc: {
            'army.militia': -(battleResult.attacker.casualties.militia || 0),
            'army.spearman': -(battleResult.attacker.casualties.spearman || 0),
            'army.archer': -(battleResult.attacker.casualties.archer || 0),
            'army.cavalry': -(battleResult.attacker.casualties.cavalry || 0),
            'statistics.battles.total': 1,
            'statistics.battles.attacking': 1,
            [`statistics.battles.${battleResult.result === 'attacker_victory' ? 'victories' : 'defeats'}`]: 1,
          },
        },
        { session }
      );

      // 8. Handle territory capture if attacker won
      if (battleResult.result === 'attacker_victory') {
        await transferTerritoryOwnership(
          battle.territoryId,
          battle.attacker.tribeId,
          {
            units: battleResult.attacker.survivors,
            capturedBy: battle.attacker.userId,
            contributors: [{
              userId: battle.attacker.userId,
              units: battleResult.attacker.survivors,
              sentAt: new Date(),
              percentage: 100,
            }],
          },
          session
        );

        // Award VP to attacker's tribe
        if (battleResult.attacker.vpGained > 0) {
          await awardTribeVp(
            battle.attacker.tribeId,
            battleResult.attacker.vpGained,
            `Territory ${battle.territoryId} captured`,
            session
          );
        }
      } else {
        // Defender won - update garrison with survivors
        if (!isNpcDefender) {
          await Territory.updateOne(
            { territoryId: battle.territoryId },
            { $set: { 'garrison.total': battleResult.defender.survivors } },
            { session }
          );
        } else {
          // Update NPC garrison
          await Territory.updateOne(
            { territoryId: battle.territoryId },
            { $set: { npcGarrison: battleResult.defender.survivors } },
            { session }
          );
        }

        // Return surviving units to attacker
        await User.updateOne(
          { _id: battle.attacker.userId },
          {
            $inc: {
              'army.militia': battleResult.attacker.survivors.militia || 0,
              'army.spearman': battleResult.attacker.survivors.spearman || 0,
              'army.archer': battleResult.attacker.survivors.archer || 0,
              'army.cavalry': battleResult.attacker.survivors.cavalry || 0,
            },
          },
          { session }
        );
      }

      // 9. Add battle to territory history
      await Territory.updateOne(
        { territoryId: battle.territoryId },
        {
          $push: {
            battleHistory: {
              $each: [{
                battleId: battle._id,
                timestamp: battle.completedAt,
                result: battle.result,
                attackerTribe: battle.attacker.tribeId,
                defenderTribe: battle.defender.tribeId,
              }],
              $slice: -20, // Keep last 20 battles
            },
          },
        },
        { session }
      );

      logger.info('Battle processed successfully', {
        battleId,
        result: battleResult.result,
        territory: battle.territoryId,
        attackerCasualties: battleResult.attacker.casualties.total,
        defenderCasualties: battleResult.defender.casualties.total,
      });

      return {
        battleId,
        result: battleResult.result,
        territoryChanged: battleResult.result === 'attacker_victory',
        attacker: {
          casualties: battleResult.attacker.casualties,
          survivors: battleResult.attacker.survivors,
          vpGained: battleResult.attacker.vpGained,
        },
        defender: {
          casualties: battleResult.defender.casualties,
          survivors: battleResult.defender.survivors,
        },
      };
    });

    return result;
  } catch (error) {
    logger.error('Battle processing error', {
      battleId,
      error: error.message,
      stack: error.stack,
    });

    // Mark battle as failed
    await Battle.updateOne(
      { _id: battleId },
      {
        status: 'failed',
        error: {
          message: error.message,
          timestamp: new Date(),
        },
      }
    );

    throw error;
  }
}

/**
 * Get battle queue status
 * @returns {Promise<Object>} Queue status
 */
async function getBattleQueueStatus() {
  if (!battleQueue) {
    return { initialized: false };
  }

  const [waiting, active, completed, failed] = await Promise.all([
    battleQueue.getWaitingCount(),
    battleQueue.getActiveCount(),
    battleQueue.getCompletedCount(),
    battleQueue.getFailedCount(),
  ]);

  return {
    initialized: true,
    waiting,
    active,
    completed,
    failed,
  };
}

/**
 * Close the battle queue gracefully
 */
async function closeBattleQueue() {
  if (battleQueue) {
    await battleQueue.close();
    battleQueue = null;
    logger.info('Battle queue closed');
  }
}

/**
 * Get queue for external use
 */
function getQueue() {
  return battleQueue;
}

module.exports = {
  initializeBattleQueue,
  addBattleToQueue,
  processBattle,
  getBattleQueueStatus,
  closeBattleQueue,
  getQueue,
};
