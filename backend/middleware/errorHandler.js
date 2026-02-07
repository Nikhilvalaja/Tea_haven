// ============================================
// CENTRALIZED ERROR HANDLING MIDDLEWARE
// ============================================
// SECURITY: This module ensures no sensitive data leaks to frontend
// All errors are logged server-side, sanitized for client response

const { logger } = require('../utils/logger');

/**
 * Logger for backend errors - uses Winston logger
 * @param {string} context - Where the error occurred
 * @param {Error} error - The error object
 * @param {Object} meta - Additional metadata (userId, path, etc.)
 */
const logError = (context, error, meta = {}) => {
  logger.logError(context, error, meta);
};

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.success = false;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static validation(message = 'Validation error') {
    return new ApiError(422, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, false);
  }
}

/**
 * Async handler wrapper - catches async errors
 * @param {Function} fn - Async route handler
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Standard success response
 * @param {Object} res - Express response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * Standard error response
 * @param {Object} res - Express response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} error - Detailed error (dev only)
 */
const errorResponse = (res, message = 'Error', statusCode = 500, error = null) => {
  const response = {
    success: false,
    message
  };

  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }

  return res.status(statusCode).json(response);
};

/**
 * Global error handler middleware
 * SECURITY: Never exposes internal error details to frontend
 */
const globalErrorHandler = (err, req, res, _next) => {
  // Log full error details server-side
  logError('GlobalErrorHandler', err, {
    path: req.path,
    method: req.method,
    userId: req.user?.userId || req.user?.id,
    ip: req.ip
  });

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map(e => e.message).join(', ');
    return errorResponse(res, messages, 422);
  }

  // Handle Sequelize unique constraint errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    // Provide specific messages for common unique fields
    const field = err.errors?.[0]?.path;
    if (field === 'email') {
      return errorResponse(res, 'This email is already registered', 409);
    }
    return errorResponse(res, 'A record with this value already exists', 409);
  }

  // Handle Sequelize foreign key errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return errorResponse(res, 'Referenced record not found', 400);
  }

  // Handle Sequelize database errors (connection, query issues)
  if (err.name === 'SequelizeDatabaseError') {
    // Don't expose internal database structure, but log it
    return errorResponse(res, 'A database error occurred. Please try again.', 500);
  }

  // Handle Sequelize connection errors
  if (err.name === 'SequelizeConnectionError' || err.name === 'SequelizeConnectionRefusedError') {
    return errorResponse(res, 'Service temporarily unavailable. Please try again later.', 503);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid token', 401);
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 'Token expired', 401);
  }

  // Handle custom ApiError
  if (err instanceof ApiError) {
    return errorResponse(res, err.message, err.statusCode);
  }

  // Handle unknown errors - NEVER expose internal details
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Something went wrong. Please try again later.';

  return errorResponse(res, message, statusCode);
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  ApiError,
  asyncHandler,
  successResponse,
  errorResponse,
  globalErrorHandler,
  notFoundHandler,
  logError
};
