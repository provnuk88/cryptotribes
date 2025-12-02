/**
 * VP GENERATOR JOB
 * Processes hourly VP generation from territory control
 * Cron: every 10 minutes (accumulates to hourly)
 */

const { processHourlyVpGeneration } = require('../services/vpService');
const logger = require('../utils/logger');

// Track accumulated time for hourly processing
let lastHourlyRun = null;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Run the VP generation job
 * Called every 10 minutes, but only processes when an hour has passed
 */
async function run() {
  const now = Date.now();

  // Initialize on first run
  if (!lastHourlyRun) {
    lastHourlyRun = now;
    logger.info('VP generator initialized');
    return { skipped: true, reason: 'Initialized' };
  }

  // Check if an hour has passed since last processing
  const timeSinceLastRun = now - lastHourlyRun;

  if (timeSinceLastRun < HOUR_MS) {
    const minutesRemaining = Math.ceil((HOUR_MS - timeSinceLastRun) / 60000);
    return {
      skipped: true,
      reason: 'Waiting for hourly interval',
      minutesRemaining,
    };
  }

  try {
    logger.info('Running hourly VP generation');
    const result = await processHourlyVpGeneration();

    lastHourlyRun = now;

    logger.info('VP generation completed', {
      tribesProcessed: result.tribesProcessed,
      vpDistributed: result.vpDistributed,
    });

    return result;
  } catch (error) {
    logger.error('VP generation failed', error);
    throw error;
  }
}

/**
 * Force run the VP generation (for testing/admin)
 */
async function forceRun() {
  try {
    logger.info('Force running VP generation');
    const result = await processHourlyVpGeneration();
    lastHourlyRun = Date.now();
    return result;
  } catch (error) {
    logger.error('Force VP generation failed', error);
    throw error;
  }
}

/**
 * Get job status
 */
function getStatus() {
  const now = Date.now();
  const timeSinceLastRun = lastHourlyRun ? now - lastHourlyRun : null;

  return {
    lastRun: lastHourlyRun ? new Date(lastHourlyRun).toISOString() : null,
    nextRun: lastHourlyRun
      ? new Date(lastHourlyRun + HOUR_MS).toISOString()
      : 'Pending initialization',
    minutesSinceLastRun: timeSinceLastRun
      ? Math.floor(timeSinceLastRun / 60000)
      : null,
  };
}

/**
 * Reset the timer (for testing)
 */
function reset() {
  lastHourlyRun = null;
}

module.exports = {
  run,
  forceRun,
  getStatus,
  reset,
};
