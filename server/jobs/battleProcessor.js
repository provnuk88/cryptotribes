/**
 * BATTLE PROCESSOR JOB
 * Monitors and processes the Bull.js battle queue
 */

const { initializeBattleQueue, getBattleQueueStatus, closeBattleQueue } = require('../services/battleQueue');
const logger = require('../utils/logger');

let isRunning = false;

/**
 * Initialize the battle processor
 * This sets up the Bull.js queue and starts processing battles
 */
async function start() {
  if (isRunning) {
    logger.warn('Battle processor already running');
    return;
  }

  try {
    await initializeBattleQueue();
    isRunning = true;
    logger.info('Battle processor started');

    // Log queue status periodically
    setInterval(async () => {
      try {
        const status = await getBattleQueueStatus();
        if (status.waiting > 0 || status.active > 0) {
          logger.debug('Battle queue status', status);
        }
      } catch (error) {
        logger.error('Failed to get queue status', error);
      }
    }, 30000); // Every 30 seconds

  } catch (error) {
    logger.error('Failed to start battle processor', error);
    throw error;
  }
}

/**
 * Stop the battle processor gracefully
 */
async function stop() {
  if (!isRunning) {
    return;
  }

  try {
    await closeBattleQueue();
    isRunning = false;
    logger.info('Battle processor stopped');
  } catch (error) {
    logger.error('Error stopping battle processor', error);
    throw error;
  }
}

/**
 * Get processor status
 */
async function getStatus() {
  if (!isRunning) {
    return { running: false };
  }

  const queueStatus = await getBattleQueueStatus();
  return {
    running: true,
    queue: queueStatus,
  };
}

module.exports = {
  start,
  stop,
  getStatus,
};
