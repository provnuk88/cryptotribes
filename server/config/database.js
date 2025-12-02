/**
 * DATABASE CONNECTION MODULE
 * MongoDB connection with Mongoose, transaction helpers, and error handling
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with retry logic
 */
const connectDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        // Mongoose 7+ no longer needs useNewUrlParser, useUnifiedTopology
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info(`MongoDB Connected: ${conn.connection.host}`);
      logger.info(`Database: ${conn.connection.name}`);

      // Connection event listeners
      mongoose.connection.on('connected', () => {
        logger.info('Mongoose connected to MongoDB');
      });

      mongoose.connection.on('error', (err) => {
        logger.error(`Mongoose connection error: ${err.message}`);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('Mongoose disconnected from MongoDB');
      });

      return conn;
    } catch (error) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries}/${maxRetries} failed: ${error.message}`);

      if (retries < maxRetries) {
        logger.info(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }
    }
  }
};

/**
 * Graceful shutdown - close database connection
 */
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed gracefully');
  } catch (error) {
    logger.error(`Error closing MongoDB connection: ${error.message}`);
    throw error;
  }
};

/**
 * Start a MongoDB transaction session
 * Used for atomic operations (battles, territory captures)
 *
 * @returns {mongoose.ClientSession} session
 *
 * @example
 * const session = await startTransaction();
 * try {
 *   await User.updateOne({ _id: userId }, { $inc: { gold: -100 } }, { session });
 *   await Battle.create([battleData], { session });
 *   await commitTransaction(session);
 * } catch (error) {
 *   await abortTransaction(session);
 *   throw error;
 * }
 */
const startTransaction = async () => {
  const session = await mongoose.startSession();
  session.startTransaction({
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
    readPreference: 'primary'
  });
  return session;
};

/**
 * Commit a transaction
 * @param {mongoose.ClientSession} session
 */
const commitTransaction = async (session) => {
  try {
    await session.commitTransaction();
    logger.debug('Transaction committed successfully');
  } catch (error) {
    logger.error(`Transaction commit failed: ${error.message}`);
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Abort a transaction (rollback)
 * @param {mongoose.ClientSession} session
 */
const abortTransaction = async (session) => {
  try {
    await session.abortTransaction();
    logger.warn('Transaction aborted (rolled back)');
  } catch (error) {
    logger.error(`Transaction abort failed: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Execute a function within a transaction (higher-level helper)
 * Automatically handles commit/abort
 *
 * @param {Function} callback - async function to execute within transaction
 * @returns {*} result of callback
 *
 * @example
 * const result = await withTransaction(async (session) => {
 *   await User.updateOne({ _id: attackerId }, { $inc: { 'army.cavalry': -50 } }, { session });
 *   await Territory.updateOne({ territoryId: 23 }, { ownerId: tribeId }, { session });
 *   return { success: true };
 * });
 */
const withTransaction = async (callback) => {
  const session = await startTransaction();
  try {
    const result = await callback(session);
    await commitTransaction(session);
    return result;
  } catch (error) {
    await abortTransaction(session);
    throw error;
  }
};

/**
 * Check if MongoDB connection is healthy
 * Used for health check endpoints
 */
const isDatabaseConnected = () => {
  return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Get database statistics
 * Useful for monitoring and debugging
 */
const getDatabaseStats = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    return {
      database: db.databaseName,
      collections: stats.collections,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`,
      totalSize: `${((stats.dataSize + stats.indexSize) / 1024 / 1024).toFixed(2)} MB`,
      objects: stats.objects
    };
  } catch (error) {
    logger.error(`Error getting database stats: ${error.message}`);
    return null;
  }
};

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing database connection...');
  await closeDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing database connection...');
  await closeDB();
  process.exit(0);
});

module.exports = {
  connectDB,
  closeDB,
  startTransaction,
  commitTransaction,
  abortTransaction,
  withTransaction,
  isDatabaseConnected,
  getDatabaseStats
};
