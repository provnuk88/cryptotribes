/**
 * SHIELD EXPIRATION JOB
 * Deactivates expired territory shields
 * Cron: * * * * * (every minute)
 */

const { processShieldExpiration } = require('../services/territoryService');
const logger = require('../utils/logger');

/**
 * Process expired shields
 */
async function run() {
  const startTime = Date.now();

  try {
    const deactivatedCount = await processShieldExpiration();

    const duration = Date.now() - startTime;

    if (deactivatedCount > 0) {
      logger.info('Shield expiration processed', {
        deactivatedCount,
        durationMs: duration,
      });
    }

    return {
      success: true,
      deactivatedCount,
      durationMs: duration,
    };
  } catch (error) {
    logger.error('Shield expiration failed', error);
    throw error;
  }
}

/**
 * Get active shields count
 */
async function getActiveShieldsCount() {
  const Territory = require('../models/Territory');

  const count = await Territory.countDocuments({
    'shield.active': true,
    'shield.expiresAt': { $gt: new Date() },
  });

  return { activeShields: count };
}

module.exports = {
  run,
  getActiveShieldsCount,
};
