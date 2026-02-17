// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

const rateLimit = require('express-rate-limit');

// General API rate limit: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  skip: (req) => req.path === '/api/health' || req.path === '/metrics'
});

// Strict auth rate limit: 10 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

module.exports = { apiLimiter, authLimiter };
