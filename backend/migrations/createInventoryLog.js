/**
 * Migration: Create InventoryLog Table
 *
 * This migration creates the inventory_logs table to track all stock movements.
 *
 * Run this migration:
 * node migrations/createInventoryLog.js
 */

const { sequelize } = require('../config/database');

const createInventoryLogTable = async () => {
  try {
    console.log('🔄 Creating inventory_logs table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS inventory_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        product_id INT NOT NULL,
        action ENUM(
          'purchase_in',
          'sale_out',
          'adjustment_add',
          'adjustment_sub',
          'return_in',
          'damage_out',
          'transfer_in',
          'transfer_out',
          'reservation',
          'reservation_release'
        ) NOT NULL,
        quantity_change INT NOT NULL COMMENT 'Positive for stock in, negative for stock out',
        previous_stock INT NOT NULL,
        new_stock INT NOT NULL,
        order_id INT NULL,
        user_id INT NULL COMMENT 'Admin who made the adjustment',
        reason VARCHAR(500) NULL COMMENT 'Reason for adjustment or notes',
        reference_number VARCHAR(100) NULL COMMENT 'PO number, invoice number, etc.',
        unit_cost DECIMAL(10, 2) NULL COMMENT 'Cost per unit for purchase_in',
        total_value DECIMAL(10, 2) NULL COMMENT 'Total value of stock change',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_product_id (product_id),
        INDEX idx_action (action),
        INDEX idx_order_id (order_id),
        INDEX idx_created_at (created_at),
        INDEX idx_product_created (product_id, created_at),

        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✅ inventory_logs table created successfully!');

    // Verify table exists
    const [tables] = await sequelize.query(`SHOW TABLES LIKE 'inventory_logs'`);
    if (tables.length > 0) {
      console.log('✅ Table verified: inventory_logs exists');
    }

    // Show table structure
    const [columns] = await sequelize.query(`DESCRIBE inventory_logs`);
    console.log('\n📋 Table Structure:');
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    if (error.original?.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Table inventory_logs already exists');
    } else {
      console.error('❌ Migration failed:', error.message);
      throw error;
    }
  } finally {
    await sequelize.close();
  }
};

// Run migration
createInventoryLogTable()
  .then(() => {
    console.log('\n✅ Migration completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  });
