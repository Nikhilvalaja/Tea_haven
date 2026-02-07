// ============================================
// MIGRATION: Add Database Indexes for Scaling
// ============================================
// This migration adds indexes to improve query performance
// when dealing with large numbers of orders, products, and users.
// Run with: node migrations/addIndexesForScaling.js

const { sequelize } = require('../config/database');

const addIndexes = async () => {
  console.log('Starting index migration...\n');

  const queries = [
    // Orders table indexes
    {
      name: 'idx_orders_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC)',
      description: 'Index for date-based order queries'
    },
    {
      name: 'idx_orders_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status)',
      description: 'Index for filtering orders by status'
    },
    {
      name: 'idx_orders_user_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC)',
      description: 'Composite index for user order history'
    },
    {
      name: 'idx_orders_payment_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders (payment_status)',
      description: 'Index for payment status filtering'
    },
    {
      name: 'idx_orders_status_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at DESC)',
      description: 'Composite index for status + date filtering'
    },
    {
      name: 'idx_orders_order_number',
      sql: 'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number)',
      description: 'Index for order number lookups'
    },

    // Order Items indexes
    {
      name: 'idx_order_items_order_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id)',
      description: 'Index for fetching items by order'
    },
    {
      name: 'idx_order_items_product_id',
      sql: 'CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id)',
      description: 'Index for product sales analytics'
    },

    // Products table indexes
    {
      name: 'idx_products_is_active',
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_is_active ON products (is_active)',
      description: 'Index for active product filtering'
    },
    {
      name: 'idx_products_category',
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)',
      description: 'Index for category filtering'
    },
    {
      name: 'idx_products_stock',
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_stock ON products (stock_quantity)',
      description: 'Index for stock queries'
    },
    {
      name: 'idx_products_sku',
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku)',
      description: 'Index for SKU lookups'
    },
    {
      name: 'idx_products_active_stock',
      sql: 'CREATE INDEX IF NOT EXISTS idx_products_active_stock ON products (is_active, stock_quantity)',
      description: 'Composite index for active products with stock'
    },

    // Users table indexes
    {
      name: 'idx_users_email',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)',
      description: 'Index for email lookups'
    },
    {
      name: 'idx_users_role',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_role ON users (role)',
      description: 'Index for role-based queries'
    },
    {
      name: 'idx_users_created_at',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC)',
      description: 'Index for new user queries'
    },
    {
      name: 'idx_users_is_active',
      sql: 'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active)',
      description: 'Index for active user filtering'
    },

    // Inventory Logs indexes
    {
      name: 'idx_inventory_logs_product',
      sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs (product_id)',
      description: 'Index for product history'
    },
    {
      name: 'idx_inventory_logs_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON inventory_logs (created_at DESC)',
      description: 'Index for recent activity'
    },
    {
      name: 'idx_inventory_logs_action',
      sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_logs_action ON inventory_logs (action)',
      description: 'Index for action type filtering'
    },

    // Admin Logs indexes
    {
      name: 'idx_admin_logs_admin',
      sql: 'CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs (admin_id)',
      description: 'Index for admin activity'
    },
    {
      name: 'idx_admin_logs_created',
      sql: 'CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs (created_at DESC)',
      description: 'Index for recent admin actions'
    },
    {
      name: 'idx_admin_logs_action_type',
      sql: 'CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs (action_type)',
      description: 'Index for action type filtering'
    },

    // User Sessions indexes
    {
      name: 'idx_user_sessions_user',
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id)',
      description: 'Index for user session lookups'
    },
    {
      name: 'idx_user_sessions_status',
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_status ON user_sessions (status)',
      description: 'Index for active session queries'
    },
    {
      name: 'idx_user_sessions_token',
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token)',
      description: 'Index for token validation'
    }
  ];

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const query of queries) {
    try {
      await sequelize.query(query.sql);
      console.log(`✅ ${query.name}: ${query.description}`);
      successCount++;
    } catch (error) {
      if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
        console.log(`⏭️  ${query.name}: Already exists (skipped)`);
        skipCount++;
      } else {
        console.error(`❌ ${query.name}: ${error.message}`);
        errorCount++;
      }
    }
  }

  console.log('\n========================================');
  console.log(`Migration complete!`);
  console.log(`  Created: ${successCount}`);
  console.log(`  Skipped: ${skipCount}`);
  console.log(`  Errors:  ${errorCount}`);
  console.log('========================================\n');
};

// Run the migration
const runMigration = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established.\n');
    await addIndexes();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

runMigration();
