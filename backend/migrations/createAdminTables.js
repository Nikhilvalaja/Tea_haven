// ============================================
// MIGRATION: CREATE ADMIN TABLES
// ============================================
// Creates admin_logs and user_sessions tables
// Also adds new columns to users table

const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'teahaven123',
    database: process.env.DB_NAME || 'teahaven'
  });

  console.log('🔌 Connected to database');

  try {
    // Add new columns to users table
    console.log('📝 Adding new columns to users table...');

    const userColumns = [
      { name: 'is_active', sql: 'ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE' },
      { name: 'promoted_by', sql: 'ALTER TABLE users ADD COLUMN promoted_by INT NULL' },
      { name: 'promoted_at', sql: 'ALTER TABLE users ADD COLUMN promoted_at DATETIME NULL' },
      { name: 'last_login_at', sql: 'ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL' },
      { name: 'login_count', sql: 'ALTER TABLE users ADD COLUMN login_count INT DEFAULT 0' },
      { name: 'phone', sql: 'ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL' }
    ];

    for (const col of userColumns) {
      try {
        await connection.execute(col.sql);
        console.log(`  ✅ Added column: ${col.name}`);
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ⏭️  Column ${col.name} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Update role enum to include new roles
    console.log('📝 Updating role enum...');
    try {
      await connection.execute(`
        ALTER TABLE users MODIFY COLUMN role
        ENUM('customer', 'manager', 'admin', 'super_admin')
        DEFAULT 'customer'
      `);
      console.log('  ✅ Role enum updated');
    } catch (err) {
      console.log('  ⏭️  Role enum already updated or error:', err.message);
    }

    // Create admin_logs table
    console.log('📝 Creating admin_logs table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        admin_id INT NOT NULL,
        action_type ENUM(
          'user_create', 'user_update', 'user_delete', 'user_role_change',
          'user_suspend', 'user_activate',
          'inventory_add', 'inventory_adjust', 'inventory_damage', 'inventory_transfer',
          'product_create', 'product_update', 'product_delete', 'product_price_change',
          'order_status_change', 'order_cancel', 'refund_approve', 'refund_reject',
          'settings_update', 'admin_login', 'admin_logout'
        ) NOT NULL,
        description VARCHAR(500) NOT NULL,
        entity_type VARCHAR(50) NULL,
        entity_id INT NULL,
        previous_value JSON NULL,
        new_value JSON NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        session_id VARCHAR(100) NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_admin_id (admin_id),
        INDEX idx_action_type (action_type),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created_at (created_at),
        INDEX idx_session_id (session_id),

        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ admin_logs table created');

    // Create user_sessions table
    console.log('📝 Creating user_sessions table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        logout_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        status ENUM('active', 'expired', 'logged_out', 'invalidated') DEFAULT 'active',
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(500) NULL,
        device_type VARCHAR(50) NULL,
        location VARCHAR(200) NULL,
        last_activity_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_user_id (user_id),
        INDEX idx_session_token (session_token),
        INDEX idx_status (status),
        INDEX idx_login_at (login_at),
        INDEX idx_expires_at (expires_at),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✅ user_sessions table created');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('🔌 Database connection closed');
  }
}

// Run if executed directly
if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runMigration;
