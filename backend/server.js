// ============================================
// TEAHAVEN E-COMMERCE BACKEND SERVER
// ============================================
// This is the main entry point for the backend API server.
// It sets up Express, connects to the database, and mounts all routes.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');

// Import route modules
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const cartRoutes = require('./routes/cartRoutes');
const addressRoutes = require('./routes/addressRoutes');
const orderRoutes = require('./routes/orderRoutes');

// ============================================
// SERVER CONFIGURATION
// ============================================

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// ============================================
// MIDDLEWARE
// ============================================

// CORS - Allow frontend to make requests
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

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
      health: '/api/health'
    }
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler - Route not found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// DATABASE CONNECTION & SERVER STARTUP
// ============================================

const startServer = async () => {
  try {
    // Test database connection
    console.log('\n🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Sync models (creates tables if they don't exist)
    console.log('\n🔄 Syncing database models...');
    await sequelize.sync({ alter: false }); // Use { alter: true } to update schema
    console.log('✅ Database models synced');

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🍵  TEAHAVEN E-COMMERCE API SERVER');
      console.log('='.repeat(50));
      console.log(`🚀 Server running on: http://localhost:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
      console.log(`📡 Database: ${process.env.DB_NAME || 'teahaven'}@${process.env.DB_HOST || 'localhost'}`);
      console.log('='.repeat(50));
      console.log('\n📋 Available endpoints:');
      console.log('   POST   /api/auth/register      - Register new user');
      console.log('   POST   /api/auth/login         - Login user');
      console.log('   GET    /api/auth/verify        - Verify JWT token');
      console.log('   GET    /api/products           - Get all products');
      console.log('   GET    /api/products/:id       - Get product by ID');
      console.log('   GET    /api/cart               - Get user cart');
      console.log('   POST   /api/cart               - Add item to cart');
      console.log('   GET    /api/addresses          - Get user addresses');
      console.log('   POST   /api/addresses          - Create new address');
      console.log('   GET    /api/orders             - Get user orders');
      console.log('   POST   /api/orders             - Create new order');
      console.log('   GET    /api/health             - Health check');
      console.log('='.repeat(50) + '\n');
      console.log('✨ Server is ready to accept requests!\n');
    });

  } catch (error) {
    console.error('\n❌ Failed to start server:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('\nPlease check:');
    console.error('1. MySQL server is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. Database exists (or set DB_CREATE=true)');
    console.error('4. Network connection to database');
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n\n${signal} received. Starting graceful shutdown...`);

  try {
    // Close database connections
    await sequelize.close();
    console.log('✅ Database connections closed');

    console.log('✅ Server shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

// ============================================
// START THE SERVER
// ============================================

startServer();
