/**
 * SERVER ENTRY POINT
 * Starts HTTP server with graceful shutdown
 */

require('dotenv').config();

const http = require('http');
const app = require('./app');
const logger = require('./utils/logger');
const { connectDB, closeDB } = require('./config/database');
const { initializeJobs, stopAllJobs } = require('./jobs');
const { initializeBattleQueue, closeBattleQueue } = require('./services/battleQueue');

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const server = http.createServer(app);

// Track active connections for graceful shutdown
const activeConnections = new Set();

server.on('connection', (connection) => {
  activeConnections.add(connection);
  connection.on('close', () => {
    activeConnections.delete(connection);
  });
});

/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDB();

    // Initialize battle queue (Bull.js with Redis)
    logger.info('Initializing battle queue...');
    await initializeBattleQueue();

    // Initialize cron jobs
    logger.info('Initializing cron jobs...');
    await initializeJobs();

    // Start HTTP server
    server.listen(PORT, HOST, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏰 CRYPTOTRIBES SERVER STARTED                         ║
║                                                           ║
║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(40)}║
║   Host:        ${HOST.padEnd(40)}║
║   Port:        ${String(PORT).padEnd(40)}║
║   API:         http://${HOST}:${PORT}/api/v1${' '.repeat(25 - String(PORT).length)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error('Error during server close:', err);
    }

    try {
      // Close active connections
      logger.info(`Closing ${activeConnections.size} active connections...`);
      for (const connection of activeConnections) {
        connection.destroy();
      }

      // Stop cron jobs
      logger.info('Stopping cron jobs...');
      await stopAllJobs();

      // Close battle queue
      logger.info('Closing battle queue...');
      await closeBattleQueue();

      // Close database connection
      logger.info('Closing database connection...');
      await closeDB();

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

module.exports = server;
