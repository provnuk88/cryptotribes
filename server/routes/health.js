/**
 * HEALTH CHECK ROUTES
 * Server and database health monitoring
 */

const express = require('express');
const router = express.Router();

const { isDatabaseConnected, getDatabaseStats } = require('../config/database');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

/**
 * @route   GET /api/v1/health/ready
 * @desc    Readiness check (all dependencies ready)
 * @access  Public
 */
router.get('/ready', async (req, res) => {
  const checks = {
    database: isDatabaseConnected(),
    // Add more checks as needed (Redis, external APIs, etc.)
  };

  const allReady = Object.values(checks).every(v => v === true);

  if (allReady) {
    res.json({
      success: true,
      status: 'ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      success: false,
      status: 'not_ready',
      checks,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * @route   GET /api/v1/health/live
 * @desc    Liveness check (server is running)
 * @access  Public
 */
router.get('/live', (req, res) => {
  res.json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * @route   GET /api/v1/health/detailed
 * @desc    Detailed health check with metrics
 * @access  Public (should be restricted in production)
 */
router.get('/detailed', async (req, res) => {
  try {
    const dbStats = await getDatabaseStats();

    const memoryUsage = process.memoryUsage();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      memory: {
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      },
      database: {
        connected: isDatabaseConnected(),
        ...dbStats,
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message,
    });
  }
});

module.exports = router;
