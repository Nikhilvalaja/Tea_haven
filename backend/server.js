// ============================================
// TEAHAVEN E-COMMERCE BACKEND SERVER
// ============================================
// This is the main entry point for the backend API server.
// It sets up Express, connects to the database, and mounts all routes.
//

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sequelize } = require('./config/database');
const { logger, httpLogger } = require('./utils/logger');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

// ============================================
// SERVER CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS - Allow frontend to make requests
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// HTTP request logging (Winston + Morgan)
app.use(httpLogger);

// Rate limiting
app.use('/api/', apiLimiter);

// ============================================
// API ROUTES
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'TeaHaven API is running',
    timestamp: new Date().toISOString(),
    database: sequelize.authenticate()
      .then(() => 'connected')
      .catch(() => 'disconnected')
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'TeaHaven API Server',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      cart: '/api/cart',
      addresses: '/api/addresses',
      orders: '/api/orders',
      wishlist: '/api/wishlist',
      health: '/api/health'
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

const { notFoundHandler, globalErrorHandler } = require('./middleware/errorHandler');

// 404 handler - Route not found
app.use(notFoundHandler);

// Global error handler - SECURITY: Never leaks sensitive error details
app.use(globalErrorHandler);

// ============================================
// DATABASE CONNECTION & SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    logger.info('Connecting to database...');
    await sequelize.authenticate();
    logger.info('Database connected successfully');

    // Sync models (creates tables if they don't exist)
    logger.info('Syncing database models...');
    // Disable alter mode to avoid deadlocks and FK constraint issues during development restarts
    await sequelize.sync(); // Just create tables if missing, don't alter
    logger.info('Database models synced');

    // DEVELOPMENT ONLY: Auto-confirm orders after 1 hour
    if (process.env.NODE_ENV !== 'production') {
      const { Order } = require('./models');

      setInterval(async () => {
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

          const ordersToConfirm = await Order.findAll({
            where: {
              status: 'pending',
              paymentStatus: 'paid',
              created_at: {
                [require('sequelize').Op.lte]: oneHourAgo
              }
            }
          });

          if (ordersToConfirm.length > 0) {
            for (const order of ordersToConfirm) {
              await order.update({ status: 'confirmed' });
              logger.info(`Auto-confirmed order ${order.orderNumber} (dev mode)`);
            }
          }
        } catch (err) {
          logger.error('Auto-confirm error', { error: err.message });
        }
      }, 5 * 60 * 1000); // Check every 5 minutes

      logger.info('Development mode: Auto-confirm enabled (1 hour)');
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info('='.repeat(50));
      logger.info('TEAHAVEN E-COMMERCE API SERVER');
      logger.info('='.repeat(50));
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend URL: ${FRONTEND_URL}`);
      logger.info(`Database: ${process.env.DB_NAME || 'teahaven'}@${process.env.DB_HOST || 'localhost'}`);
      logger.info('Server is ready to accept requests!');
    });

  } catch (error) {
    logger.error('Failed to start server', {
      message: error.message,
      stack: error.stack,
      hints: [
        'Check if MySQL server is running',
        'Verify database credentials in .env',
        'Ensure database exists',
        'Check network connection to database'
      ]
    });
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  try {
    await sequelize.close();
    logger.info('Database connections closed');
    logger.info('Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: String(reason), promise: String(promise) });
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// ============================================
// START THE SERVER
// ============================================

startServer();
