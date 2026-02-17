// ============================================
// REDIS CACHE MIDDLEWARE
// ============================================

const redis = require('../config/redis');
const { logger } = require('../utils/logger');

/**
 * Cache middleware for GET requests.
 * @param {string} keyPrefix - Cache key prefix (e.g., 'products')
 * @param {number} ttlSeconds - Time-to-live in seconds (default: 300 = 5 min)
 */
const cacheMiddleware = (keyPrefix, ttlSeconds = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') return next();

    const key = `cache:${keyPrefix}:${req.originalUrl}`;

    try {
      const cached = await redis.get(key);
      if (cached) {
        logger.debug(`Cache HIT: ${key}`);
        return res.json(JSON.parse(cached));
      }
    } catch (err) {
      // Redis down — fall through to handler
      logger.debug(`Cache error: ${err.message}`);
    }

    // Intercept res.json to cache successful responses
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        redis.setex(key, ttlSeconds, JSON.stringify(data)).catch(() => {});
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate all cache keys matching a pattern.
 * Call after create/update/delete operations.
 * @param {string} pattern - e.g., 'cache:products:*'
 */
const invalidateCache = async (pattern) => {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.debug(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
    }
  } catch (err) {
    logger.debug(`Cache invalidation error: ${err.message}`);
  }
};

module.exports = { cacheMiddleware, invalidateCache };
