/**
 * MIDDLEWARE INDEX
 * Central export for all middleware
 */

const {
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireTribe,
  requireTribeLeader,
  requireActiveSeason,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthError,
} = require('./auth');

const {
  globalRateLimiter,
  authRateLimiter,
  attackRateLimiter,
  trainingRateLimiter,
  paymentRateLimiter,
  adminRateLimiter,
  webhookRateLimiter,
  createCustomLimiter,
  dynamicRateLimiter,
} = require('./rateLimit');

const {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InsufficientResourcesError,
  GameError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  asyncTransactionHandler,
} = require('./errorHandler');

const {
  requestLogger,
  actionTracker,
  performanceMonitor,
} = require('./requestLogger');

const {
  validate,
  objectId,
  walletAddress,
  paginationSchema,
  idParamSchema,
  authSchemas,
  userSchemas,
  tribeSchemas,
  territorySchemas,
  buildingSchemas,
  unitSchemas,
  battleSchemas,
  economySchemas,
  paymentSchemas,
  seasonSchemas,
  adminSchemas,
} = require('./validator');

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  requireTribe,
  requireTribeLeader,
  requireActiveSeason,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthError,

  // Rate Limiting
  globalRateLimiter,
  authRateLimiter,
  attackRateLimiter,
  trainingRateLimiter,
  paymentRateLimiter,
  adminRateLimiter,
  webhookRateLimiter,
  createCustomLimiter,
  dynamicRateLimiter,

  // Error Handling
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InsufficientResourcesError,
  GameError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  asyncTransactionHandler,

  // Logging
  requestLogger,
  actionTracker,
  performanceMonitor,

  // Validation
  validate,
  objectId,
  walletAddress,
  paginationSchema,
  idParamSchema,
  authSchemas,
  userSchemas,
  tribeSchemas,
  territorySchemas,
  buildingSchemas,
  unitSchemas,
  battleSchemas,
  economySchemas,
  paymentSchemas,
  seasonSchemas,
  adminSchemas,
};
