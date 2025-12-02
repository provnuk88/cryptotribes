/**
 * BUILDING PROCESSOR JOB
 * Processes completed building upgrades
 * Cron: every 10 seconds
 */

const User = require('../models/User');
const logger = require('../utils/logger');
const { BUILDING_COSTS } = require('../config/constants');

/**
 * Process all completed building upgrades for all users
 */
async function run() {
  const startTime = Date.now();
  let usersProcessed = 0;
  let buildingsCompleted = 0;
  let errors = [];

  try {
    const now = new Date();

    // Find users with completed building upgrades
    const usersWithBuilding = await User.find({
      'buildingQueue.0': { $exists: true },
      'buildingQueue.completesAt': { $lte: now },
    }).select('_id buildings buildingQueue');

    for (const user of usersWithBuilding) {
      try {
        const completedBuildings = [];
        const remainingQueue = [];

        // Separate completed and pending upgrades
        for (const building of user.buildingQueue) {
          if (new Date(building.completesAt) <= now) {
            completedBuildings.push(building);
          } else {
            remainingQueue.push(building);
          }
        }

        if (completedBuildings.length === 0) continue;

        // Apply completed upgrades
        const buildingUpdates = {};

        for (const completed of completedBuildings) {
          const buildingKey = `buildings.${completed.buildingType}.level`;
          buildingUpdates[buildingKey] = completed.toLevel;

          // Clear upgrading flag
          buildingUpdates[`buildings.${completed.buildingType}.upgrading`] = false;

          buildingsCompleted++;

          logger.debug('Building upgrade completed', {
            userId: user._id,
            buildingType: completed.buildingType,
            newLevel: completed.toLevel,
          });
        }

        // Update user
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              ...buildingUpdates,
              buildingQueue: remainingQueue,
            },
          }
        );

        usersProcessed++;

      } catch (error) {
        errors.push({ userId: user._id, error: error.message });
        logger.error('Error processing building for user', {
          userId: user._id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    if (usersProcessed > 0 || errors.length > 0) {
      logger.info('Building processor completed', {
        usersProcessed,
        buildingsCompleted,
        errors: errors.length,
        durationMs: duration,
      });
    }

    return {
      success: true,
      usersProcessed,
      buildingsCompleted,
      errors,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('Building processor failed', error);
    throw error;
  }
}

/**
 * Get building queue stats
 */
async function getStats() {
  const now = new Date();

  const [pending, completed] = await Promise.all([
    User.countDocuments({
      'buildingQueue.0': { $exists: true },
      'buildingQueue.completesAt': { $gt: now },
    }),
    User.countDocuments({
      'buildingQueue.0': { $exists: true },
      'buildingQueue.completesAt': { $lte: now },
    }),
  ]);

  return {
    pendingUpgrades: pending,
    completedUpgrades: completed,
  };
}

module.exports = {
  run,
  getStats,
};
