/**
 * ERROR HANDLING MIDDLEWARE
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');

/**
 * Custom Application Error
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Not Found Error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict Error (duplicate resource, etc.)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Forbidden Error
 */
class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Insufficient Resources Error
 */
class InsufficientResourcesError extends AppError {
  constructor(resource = 'resources') {
    super(`Insufficient ${resource}`, 400, 'INSUFFICIENT_RESOURCES');
  }
}

/**
 * Game Logic Error
 */
class GameError extends AppError {
  constructor(message, code = 'GAME_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400, 'INVALID_ID');
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for field '${field}': ${value}`;
  return new AppError(message, 409, 'DUPLICATE_KEY');
};

/**
 * Handle Mongoose Validation Error
 */
const handleMongooseValidationError = (err) => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));
  return new ValidationError('Validation failed', errors);
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401, 'TOKEN_EXPIRED');
};

/**
 * Handle Version Error (optimistic locking conflict)
 */
const handleVersionError = (err) => {
  return new AppError(
    'Resource was modified by another request. Please refresh and try again.',
    409,
    'VERSION_CONFLICT'
  );
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  logger.error('Error:', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    code: err.code,
    errors: err.errors,
    stack: err.stack,
    path: req.path,
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      errors: err.errors,
    });
  } else {
    // Programming or unknown error: don't leak details
    logger.error('Unexpected Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      error: 'Something went wrong. Please try again later.',
      code: 'INTERNAL_ERROR',
    });
  }
};

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.code = err.code || 'INTERNAL_ERROR';

  // Handle specific error types
  let error = { ...err, message: err.message };

  // Mongoose CastError
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    error = handleMongooseValidationError(err);
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Version Error (optimistic locking)
  if (err.name === 'VersionError') {
    error = handleVersionError(err);
  }

  // Send appropriate response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Not Found Handler (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Async Transaction Handler
 * Wraps async handlers with transaction support
 */
const asyncTransactionHandler = (fn) => {
  return async (req, res, next) => {
    const { withTransaction } = require('../config/database');

    try {
      const result = await withTransaction(async (session) => {
        req.session = session;
        return await fn(req, res, next);
      });
      return result;
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  // Error Classes
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  InsufficientResourcesError,
  GameError,

  // Middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
  asyncTransactionHandler,
};
