/**
 * RATE LIMITING MIDDLEWARE
 * Prevents abuse and ensures fair usage
 */

const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const logger = require('../utils/logger');
const { RATE_LIMITS } = require('../config/constants');

// Redis client for rate limiting (if available)
let redisClient = null;
let RedisStore = null;

const initRedis = async () => {
  if (process.env.REDIS_URL) {
    try {
      // Dynamic import for rate-limit-redis (ESM module in v4)
      const rateLimitRedis = await import('rate-limit-redis');
      RedisStore = rateLimitRedis.default || rateLimitRedis.RedisStore;

      redisClient = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryDelayOnFailover: 100,
        lazyConnect: true,
      });

      await redisClient.connect();

      redisClient.on('error', (err) => {
        logger.error('Redis rate limit client error:', err);
      });

      logger.info('Redis rate limit client connected');
    } catch (error) {
      logger.warn('Redis not available for rate limiting, using memory store:', error.message);
      redisClient = null;
      RedisStore = null;
    }
  }
};

// Initialize Redis (don't block module loading)
initRedis();

/**
 * Create rate limiter store (Redis if available, memory otherwise)
 */
const createStore = (prefix) => {
  if (redisClient && RedisStore) {
    try {
      return new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: `rl:${prefix}:`,
      });
    } catch (e) {
      logger.warn('Failed to create Redis store, using memory:', e.message);
      return undefined;
    }
  }
  return undefined; // Use default memory store
};

/**
 * Key generator - uses user ID if authenticated, IP otherwise
 */
const keyGenerator = (req) => {
  if (req.user && req.user.id) {
    return `user:${req.user.id}`;
  }
  return `ip:${req.ip}`;
};

/**
 * Rate limit exceeded handler
 */
const handleRateLimitExceeded = (req, res, next, options) => {
  logger.warn('Rate limit exceeded', {
    key: keyGenerator(req),
    endpoint: req.path,
    method: req.method,
    limit: options.max,
    windowMs: options.windowMs,
  });

  res.status(429).json({
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil(options.windowMs / 1000),
  });
};

/**
 * Skip rate limiting for certain conditions
 */
const shouldSkip = (req) => {
  // Skip for health checks
  if (req.path === '/health' || req.path === '/api/v1/health') {
    return true;
  }

  // Skip for admins (optional)
  if (req.user && req.user.isAdmin) {
    return true;
  }

  return false;
};

// ===========================================
// RATE LIMITERS
// ===========================================

/**
 * Global rate limiter - applies to all routes
 * 100 requests per hour per user/IP
 */
const globalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMITS.actionsPerHour, // 100 requests
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('global'),
  keyGenerator,
  skip: shouldSkip,
  handler: handleRateLimitExceeded,
  message: {
    success: false,
    error: 'Too many requests',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Authentication rate limiter - stricter for login/register
 * 10 attempts per 15 minutes
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 10 : 100, // 10 in prod, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth'),
  keyGenerator: (req) => `auth:${req.ip}`, // Always by IP for auth
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'AUTH_RATE_LIMIT',
      retryAfter: 900, // 15 minutes
    });
  },
});

/**
 * Attack rate limiter - limits battle/attack actions
 * 20 attacks per hour
 */
const attackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMITS.attacksPerHour, // 20 attacks
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('attack'),
  keyGenerator,
  skip: shouldSkip,
  handler: (req, res) => {
    logger.warn('Attack rate limit exceeded', {
      userId: req.user?.id,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: 'Attack limit reached. You can attack 20 times per hour.',
      code: 'ATTACK_RATE_LIMIT',
      retryAfter: 3600,
    });
  },
});

/**
 * Training rate limiter - limits unit training
 * 50 training actions per hour
 */
const trainingRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: RATE_LIMITS.trainingPerHour, // 50 training actions
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('training'),
  keyGenerator,
  skip: shouldSkip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Training limit reached. Maximum 50 training actions per hour.',
      code: 'TRAINING_RATE_LIMIT',
      retryAfter: 3600,
    });
  },
});

/**
 * Payment rate limiter - extra strict for financial operations
 * 5 payment attempts per hour
 */
const paymentRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('payment'),
  keyGenerator,
  handler: (req, res) => {
    logger.warn('Payment rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
    });

    res.status(429).json({
      success: false,
      error: 'Payment limit reached. Please try again later.',
      code: 'PAYMENT_RATE_LIMIT',
      retryAfter: 3600,
    });
  },
});

/**
 * Admin rate limiter - higher limits for admin operations
 * 500 requests per hour
 */
const adminRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 500 requests
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('admin'),
  keyGenerator,
  handler: handleRateLimitExceeded,
});

/**
 * Webhook rate limiter - for external webhook endpoints
 * 100 requests per minute
 */
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('webhook'),
  keyGenerator: (req) => `webhook:${req.ip}`,
  handler: (req, res) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: 'Webhook rate limit exceeded',
      code: 'WEBHOOK_RATE_LIMIT',
    });
  },
});

/**
 * Create custom rate limiter
 * @param {Object} options - Rate limit options
 */
const createCustomLimiter = (options) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore(options.prefix || 'custom'),
    keyGenerator,
    skip: shouldSkip,
    handler: handleRateLimitExceeded,
    ...options,
  });
};

/**
 * Dynamic rate limiter based on user tier/subscription
 * Premium users get higher limits
 */
const dynamicRateLimiter = async (req, res, next) => {
  // Default limits
  let maxRequests = 100;
  let windowMs = 60 * 60 * 1000;

  // Adjust based on user tier (if user is authenticated)
  if (req.user) {
    // Check if user has premium status (could be based on payment tier)
    // This is a placeholder - implement based on your tier system
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('premiumTier').lean();

    if (user) {
      switch (user.premiumTier) {
        case 'gold':
          maxRequests = 200;
          break;
        case 'platinum':
          maxRequests = 500;
          break;
        case 'diamond':
          maxRequests = 1000;
          break;
      }
    }
  }

  const limiter = rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    store: createStore('dynamic'),
    keyGenerator,
    handler: handleRateLimitExceeded,
  });

  return limiter(req, res, next);
};

module.exports = {
  globalRateLimiter,
  authRateLimiter,
  attackRateLimiter,
  trainingRateLimiter,
  paymentRateLimiter,
  adminRateLimiter,
  webhookRateLimiter,
  createCustomLimiter,
  dynamicRateLimiter,
};
