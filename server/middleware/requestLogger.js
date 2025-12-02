/**
 * REQUEST LOGGER MIDDLEWARE
 * Logs incoming requests with timing and metadata
 */

const logger = require('../utils/logger');

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Request Logger Middleware
 * Logs request details and response time
 */
const requestLogger = (req, res, next) => {
  // Generate unique request ID
  const requestId = generateRequestId();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Record start time
  const startTime = process.hrtime();

  // Log request start
  const requestData = {
    requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  };

  logger.debug('Incoming request', requestData);

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    res.body = body;
    return originalSend.call(this, body);
  };

  // Log response on finish
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const logLevel = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'debug';

    const responseData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
    };

    // Add error details for 4xx/5xx responses
    if (res.statusCode >= 400 && res.body) {
      try {
        const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
        responseData.error = body.error;
        responseData.code = body.code;
      } catch (e) {
        // Body is not JSON, ignore
      }
    }

    logger[logLevel]('Request completed', responseData);
  });

  next();
};

/**
 * Action Tracker Middleware
 * Tracks user actions for anti-cheat system
 */
const actionTracker = (actionType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const actionData = {
      userId: req.user.id,
      actionType,
      timestamp: new Date(),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
    };

    // Store action for behavioral analysis
    // This is a fire-and-forget operation
    try {
      const BehavioralFlag = require('../models/BehavioralFlag');

      // Update user's action pattern (async, don't wait)
      BehavioralFlag.trackAction(req.user.id, actionType, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
      }).catch(err => {
        logger.error('Failed to track action:', err);
      });
    } catch (error) {
      // Non-critical, don't block request
      logger.error('Action tracking error:', error);
    }

    next();
  };
};

/**
 * Performance Monitor Middleware
 * Tracks slow requests for optimization
 */
const performanceMonitor = (slowThresholdMs = 1000) => {
  return (req, res, next) => {
    const startTime = process.hrtime();

    res.on('finish', () => {
      const diff = process.hrtime(startTime);
      const responseTime = diff[0] * 1e3 + diff[1] * 1e-6;

      if (responseTime > slowThresholdMs) {
        logger.warn('Slow request detected', {
          requestId: req.requestId,
          method: req.method,
          path: req.path,
          responseTime: `${responseTime.toFixed(2)}ms`,
          threshold: `${slowThresholdMs}ms`,
          query: req.query,
          userId: req.user?.id,
        });
      }
    });

    next();
  };
};

module.exports = {
  requestLogger,
  actionTracker,
  performanceMonitor,
};
