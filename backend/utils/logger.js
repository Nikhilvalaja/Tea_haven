// ============================================
// WINSTON LOGGER - Centralized Logging System
// ============================================
// Provides structured logging with:
// - Console output (colorized for dev)
// - File rotation (error.log, combined.log)
// - Database query logging
// - HTTP request logging
// - Different log levels per environment

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const logDir = process.env.LOG_DIR || 'logs';

// ============================================
// LOG FORMATS
// ============================================

// Custom format for console (colorized, readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Format for file logging (JSON, machine-readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// ============================================
// TRANSPORTS
// ============================================

const transports = [
  // Console - always enabled
  new winston.transports.Console({
    format: consoleFormat,
    level: isDevelopment ? 'debug' : 'info'
  })
];

// File transports - only in production or if LOG_TO_FILE=true
if (!isDevelopment || process.env.LOG_TO_FILE === 'true') {
  // Error logs - separate file for errors only
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true
    })
  );

  // Combined logs - all levels
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: fileFormat,
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true
    })
  );

  // Debug logs - only in development with file logging
  if (isDevelopment) {
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, 'debug-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        level: 'debug',
        format: fileFormat,
        maxSize: '50m',
        maxFiles: '3d'
      })
    );
  }
}

// ============================================
// CREATE LOGGER
// ============================================

const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  defaultMeta: { service: 'teahaven-api' },
  transports,
  // Don't exit on error
  exitOnError: false
});

// ============================================
// HELPER METHODS
// ============================================

/**
 * Log HTTP request (for Morgan integration)
 */
logger.httpStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Log database query
 * @param {string} sql - The SQL query
 * @param {number} duration - Query duration in ms
 * @param {Object} options - Additional options
 */
logger.query = (sql, duration, options = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger.log(level, 'Database Query', {
    sql: sql.substring(0, 500), // Truncate long queries
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...options
  });
};

/**
 * Log API request/response (for debugging)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Object} options - Additional data
 */
logger.apiLog = (req, res, options = {}) => {
  logger.info('API Request', {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    userId: req.user?.userId || req.user?.id || 'anonymous',
    ip: req.ip,
    userAgent: req.get('user-agent')?.substring(0, 100),
    duration: options.duration,
    ...options
  });
};

/**
 * Log error with context
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {Object} meta - Additional metadata
 */
logger.logError = (context, error, meta = {}) => {
  logger.error(`[${context}] ${error.message}`, {
    context,
    errorName: error.name,
    stack: error.stack,
    ...meta
  });
};

/**
 * Log security events (login, logout, failed attempts)
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
logger.security = (event, details = {}) => {
  logger.warn(`Security: ${event}`, {
    type: 'security',
    event,
    ...details
  });
};

/**
 * Log business events (orders, payments, etc.)
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
logger.business = (event, details = {}) => {
  logger.info(`Business: ${event}`, {
    type: 'business',
    event,
    ...details
  });
};

// ============================================
// MORGAN HTTP LOGGER MIDDLEWARE
// ============================================

const morgan = require('morgan');

// Custom token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) return '-';
  const ms = (res._startAt[0] - req._startAt[0]) * 1e3 +
             (res._startAt[1] - req._startAt[1]) * 1e-6;
  return ms.toFixed(2);
});

// Custom token for user ID
morgan.token('user-id', (req) => req.user?.userId || req.user?.id || 'anon');

// Morgan middleware with custom format
const httpLogger = morgan(
  ':method :url :status :response-time-ms ms - :user-id',
  {
    stream: logger.httpStream,
    skip: (req) => {
      // Skip health check endpoints in production
      if (!isDevelopment && req.url === '/api/health') return true;
      return false;
    }
  }
);

// ============================================
// SEQUELIZE QUERY LOGGER
// ============================================

/**
 * Sequelize logging function
 * Use this in your Sequelize config: logging: sequelizeLogger
 */
const sequelizeLogger = (sql, timing) => {
  // timing is the duration in ms if benchmark: true
  const duration = typeof timing === 'number' ? timing : 0;

  // Skip logging SELECT queries in production (too verbose)
  if (!isDevelopment && sql.startsWith('SELECT')) {
    return;
  }

  // Warn on slow queries (> 1 second)
  if (duration > 1000) {
    logger.warn('Slow Query', { sql: sql.substring(0, 500), duration: `${duration}ms` });
  } else if (isDevelopment) {
    logger.debug('SQL', { sql: sql.substring(0, 300), duration: `${duration}ms` });
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  logger,
  httpLogger,
  sequelizeLogger
};
