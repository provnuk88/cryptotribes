/**
 * CRON JOBS INDEX
 * Initializes and manages all background jobs
 */

const cron = require('node-cron');
const logger = require('../utils/logger');

const battleProcessor = require('./battleProcessor');
const vpGenerator = require('./vpGenerator');
const resourceGenerator = require('./resourceGenerator');
const trainingProcessor = require('./trainingProcessor');
const buildingProcessor = require('./buildingProcessor');
const shieldExpiration = require('./shieldExpiration');

// Store cron job references for cleanup
const jobs = {};

/**
 * Initialize all cron jobs
 */
async function initializeJobs() {
  logger.info('Initializing cron jobs...');

  try {
    // Start battle processor (Bull.js queue)
    await battleProcessor.start();

    // VP Generation - every 10 minutes (hourly accumulation)
    jobs.vpGenerator = cron.schedule('*/10 * * * *', async () => {
      try {
        await vpGenerator.run();
      } catch (error) {
        logger.error('VP generator cron error', error);
      }
    });

    // Resource Generation - every 10 minutes (hourly accumulation)
    jobs.resourceGenerator = cron.schedule('*/10 * * * *', async () => {
      try {
        await resourceGenerator.run();
      } catch (error) {
        logger.error('Resource generator cron error', error);
      }
    });

    // Training Processor - every 10 seconds
    jobs.trainingProcessor = cron.schedule('*/10 * * * * *', async () => {
      try {
        await trainingProcessor.run();
      } catch (error) {
        logger.error('Training processor cron error', error);
      }
    });

    // Building Processor - every 10 seconds
    jobs.buildingProcessor = cron.schedule('*/10 * * * * *', async () => {
      try {
        await buildingProcessor.run();
      } catch (error) {
        logger.error('Building processor cron error', error);
      }
    });

    // Shield Expiration - every minute
    jobs.shieldExpiration = cron.schedule('* * * * *', async () => {
      try {
        await shieldExpiration.run();
      } catch (error) {
        logger.error('Shield expiration cron error', error);
      }
    });

    logger.info('All cron jobs initialized', {
      jobs: Object.keys(jobs).length + 1, // +1 for battle processor
    });

    return true;
  } catch (error) {
    logger.error('Failed to initialize cron jobs', error);
    throw error;
  }
}

/**
 * Stop all cron jobs gracefully
 */
async function stopAllJobs() {
  logger.info('Stopping cron jobs...');

  try {
    // Stop cron jobs
    for (const [name, job] of Object.entries(jobs)) {
      job.stop();
      logger.debug(`Stopped cron job: ${name}`);
    }

    // Stop battle processor
    await battleProcessor.stop();

    logger.info('All cron jobs stopped');
  } catch (error) {
    logger.error('Error stopping cron jobs', error);
    throw error;
  }
}

/**
 * Get status of all jobs
 */
async function getJobsStatus() {
  const [battleStatus, vpStatus, resourceStatus, trainingStats, buildingStats, shieldStats] =
    await Promise.all([
      battleProcessor.getStatus(),
      Promise.resolve(vpGenerator.getStatus()),
      Promise.resolve(resourceGenerator.getStatus()),
      trainingProcessor.getStats(),
      buildingProcessor.getStats(),
      shieldExpiration.getActiveShieldsCount(),
    ]);

  return {
    battleProcessor: battleStatus,
    vpGenerator: vpStatus,
    resourceGenerator: resourceStatus,
    trainingProcessor: trainingStats,
    buildingProcessor: buildingStats,
    shieldExpiration: shieldStats,
    cronJobs: Object.keys(jobs).map((name) => ({
      name,
      running: jobs[name]?.running ?? false,
    })),
  };
}

/**
 * Force run a specific job (for admin/testing)
 */
async function forceRunJob(jobName) {
  switch (jobName) {
    case 'vpGenerator':
      return vpGenerator.forceRun();
    case 'resourceGenerator':
      return resourceGenerator.forceRun();
    case 'trainingProcessor':
      return trainingProcessor.run();
    case 'buildingProcessor':
      return buildingProcessor.run();
    case 'shieldExpiration':
      return shieldExpiration.run();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}

module.exports = {
  initializeJobs,
  stopAllJobs,
  getJobsStatus,
  forceRunJob,
};
