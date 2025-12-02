/**
 * TRAINING PROCESSOR JOB
 * Processes completed unit training queues
 * Cron: every 10 seconds
 */

const User = require('../models/User');
const logger = require('../utils/logger');
const { UNIT_STATS } = require('../config/constants');

/**
 * Process all completed training for all users
 */
async function run() {
  const startTime = Date.now();
  let usersProcessed = 0;
  let unitsCompleted = 0;
  let errors = [];

  try {
    const now = new Date();

    // Find users with completed training
    const usersWithTraining = await User.find({
      'trainingQueue.0': { $exists: true },
      'trainingQueue.completesAt': { $lte: now },
    }).select('_id army trainingQueue');

    for (const user of usersWithTraining) {
      try {
        const completedTraining = [];
        const remainingQueue = [];

        // Separate completed and pending training
        for (const training of user.trainingQueue) {
          if (new Date(training.completesAt) <= now) {
            completedTraining.push(training);
          } else {
            remainingQueue.push(training);
          }
        }

        if (completedTraining.length === 0) continue;

        // Calculate units to add
        const unitsToAdd = {
          militia: 0,
          spearman: 0,
          archer: 0,
          cavalry: 0,
        };

        for (const training of completedTraining) {
          if (unitsToAdd.hasOwnProperty(training.unitType)) {
            unitsToAdd[training.unitType] += training.quantity;
            unitsCompleted += training.quantity;
          }
        }

        // Update user
        await User.updateOne(
          { _id: user._id },
          {
            $inc: {
              'army.militia': unitsToAdd.militia,
              'army.spearman': unitsToAdd.spearman,
              'army.archer': unitsToAdd.archer,
              'army.cavalry': unitsToAdd.cavalry,
            },
            $set: { trainingQueue: remainingQueue },
          }
        );

        usersProcessed++;

        logger.debug('Training completed for user', {
          userId: user._id,
          unitsAdded: unitsToAdd,
          remainingInQueue: remainingQueue.length,
        });

      } catch (error) {
        errors.push({ userId: user._id, error: error.message });
        logger.error('Error processing training for user', {
          userId: user._id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    if (usersProcessed > 0 || errors.length > 0) {
      logger.info('Training processor completed', {
        usersProcessed,
        unitsCompleted,
        errors: errors.length,
        durationMs: duration,
      });
    }

    return {
      success: true,
      usersProcessed,
      unitsCompleted,
      errors,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('Training processor failed', error);
    throw error;
  }
}

/**
 * Get training queue stats
 */
async function getStats() {
  const now = new Date();

  const [pending, completed] = await Promise.all([
    User.aggregate([
      { $unwind: '$trainingQueue' },
      { $match: { 'trainingQueue.completesAt': { $gt: now } } },
      { $group: { _id: null, count: { $sum: '$trainingQueue.quantity' } } },
    ]),
    User.aggregate([
      { $unwind: '$trainingQueue' },
      { $match: { 'trainingQueue.completesAt': { $lte: now } } },
      { $group: { _id: null, count: { $sum: '$trainingQueue.quantity' } } },
    ]),
  ]);

  return {
    pendingUnits: pending[0]?.count || 0,
    completedUnits: completed[0]?.count || 0,
  };
}

module.exports = {
  run,
  getStats,
};
