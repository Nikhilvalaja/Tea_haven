// ============================================
// PROMETHEUS METRICS MIDDLEWARE
// ============================================

const client = require('prom-client');

// Create a dedicated registry
const register = new client.Registry();

// Add default Node.js metrics (memory, CPU, event loop, GC)
client.collectDefaultMetrics({ register, prefix: 'teahaven_' });

// ============================================
// CUSTOM METRICS
// ============================================

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
  name: 'teahaven_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register]
});

// HTTP request counter
const httpRequestsTotal = new client.Counter({
  name: 'teahaven_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Active connections gauge
const activeConnections = new client.Gauge({
  name: 'teahaven_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register]
});

// Cache hit/miss counters
const cacheHits = new client.Counter({
  name: 'teahaven_cache_hits_total',
  help: 'Total Redis cache hits',
  labelNames: ['key_prefix'],
  registers: [register]
});

const cacheMisses = new client.Counter({
  name: 'teahaven_cache_misses_total',
  help: 'Total Redis cache misses',
  labelNames: ['key_prefix'],
  registers: [register]
});

// Database query duration
const dbQueryDuration = new client.Histogram({
  name: 'teahaven_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Express middleware to track HTTP request metrics.
 * Measures duration, counts requests, tracks active connections.
 */
const metricsMiddleware = (req, res, next) => {
  // Skip metrics endpoint itself to avoid recursion
  if (req.path === '/metrics') return next();

  const start = process.hrtime.bigint();
  activeConnections.inc();

  res.on('finish', () => {
    activeConnections.dec();
    const duration = Number(process.hrtime.bigint() - start) / 1e9;

    // Normalize route to avoid high cardinality label explosion
    const route = normalizeRoute(req.baseUrl, req.route?.path || req.path);
    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode
    };

    httpRequestDuration.observe(labels, duration);
    httpRequestsTotal.inc(labels);
  });

  next();
};

/**
 * Normalize route paths to reduce label cardinality.
 * Replaces numeric IDs with :id placeholder.
 */
function normalizeRoute(baseUrl, path) {
  const full = (baseUrl || '') + (path || '') || '/';
  return full.replace(/\/\d+/g, '/:id');
}

module.exports = {
  register,
  metricsMiddleware,
  cacheHits,
  cacheMisses,
  dbQueryDuration
};
