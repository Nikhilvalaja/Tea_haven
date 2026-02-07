// ============================================
// MIGRATION - Create Reviews Table & Product Review Fields
// ============================================
// Run this migration to add reviews functionality

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function up() {
  console.log('Running migration: createReviewsTable');

  try {
    // Create reviews table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        user_id INT NOT NULL,
        order_id INT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(200) NULL,
        comment TEXT NULL,
        is_verified_purchase BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT TRUE,
        helpful_count INT DEFAULT 0,
        admin_response TEXT NULL,
        admin_response_at DATETIME NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
        UNIQUE KEY unique_user_product (product_id, user_id),
        INDEX idx_product_id (product_id),
        INDEX idx_user_id (user_id),
        INDEX idx_rating (rating),
        INDEX idx_is_approved (is_approved),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ Reviews table created');

    // Add review fields to products table
    const [columns] = await sequelize.query(
      `SHOW COLUMNS FROM products LIKE 'average_rating'`,
      { type: QueryTypes.SELECT }
    );

    if (!columns) {
      await sequelize.query(`
        ALTER TABLE products
        ADD COLUMN average_rating DECIMAL(2,1) DEFAULT 0,
        ADD COLUMN review_count INT DEFAULT 0
      `);
      console.log('✅ Added average_rating and review_count to products table');
    } else {
      console.log('ℹ️  Review fields already exist in products table');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    if (error.original?.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('ℹ️  Reviews table already exists');
    } else if (error.original?.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  Fields already exist');
    } else {
      throw error;
    }
  }
}

async function down() {
  console.log('Rolling back migration: createReviewsTable');

  try {
    await sequelize.query('DROP TABLE IF EXISTS reviews');
    console.log('✅ Reviews table dropped');

    await sequelize.query(`
      ALTER TABLE products
      DROP COLUMN IF EXISTS average_rating,
      DROP COLUMN IF EXISTS review_count
    `);
    console.log('✅ Removed review fields from products table');
  } catch (error) {
    console.error('❌ Rollback error:', error.message);
    throw error;
  }
}

// Run migration if called directly
if (require.main === module) {
  const command = process.argv[2];

  (async () => {
    try {
      await sequelize.authenticate();
      console.log('Database connected');

      if (command === 'down') {
        await down();
      } else {
        await up();
      }

      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
