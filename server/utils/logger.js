/**
 * WINSTON LOGGER CONFIGURATION
 * Centralized logging for entire application
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : process.env.LOG_LEVEL || 'info';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack, ...meta } = info;

    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
      log += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return log;
  })
);

// Console transport (for development)
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    format
  ),
});

// File transport for errors (daily rotation)
const errorFileTransport = new DailyRotateFile({
  filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: format,
});

// File transport for combined logs (daily rotation)
const combinedFileTransport = new DailyRotateFile({
  filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: format,
});

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
  ],
  // Prevent crashes on uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE_PATH || 'logs', 'rejections.log'),
    }),
  ],
  exitOnError: false,
});

// Stream for Morgan HTTP logging middleware
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;
