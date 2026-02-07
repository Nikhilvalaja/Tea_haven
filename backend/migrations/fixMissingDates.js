/**
 * Migration: Fix Missing Dates
 *
 * This migration updates NULL created_at and updated_at fields
 * for existing orders and users.
 *
 * Run with: node migrations/fixMissingDates.js
 */

const { sequelize } = require('../config/database');

async function fixMissingDates() {
  console.log('Starting date fix migration...');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // Fix orders with NULL created_at
    console.log('Fixing orders with NULL dates...');
    const [ordersUpdated] = await sequelize.query(`
      UPDATE orders
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    console.log(`Orders updated: ${ordersUpdated?.affectedRows || 'check complete'}`);

    // Fix users with NULL created_at
    console.log('Fixing users with NULL dates...');
    const [usersUpdated] = await sequelize.query(`
      UPDATE users
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    console.log(`Users updated: ${usersUpdated?.affectedRows || 'check complete'}`);

    // Fix products with NULL created_at
    console.log('Fixing products with NULL dates...');
    const [productsUpdated] = await sequelize.query(`
      UPDATE products
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    console.log(`Products updated: ${productsUpdated?.affectedRows || 'check complete'}`);

    // Fix addresses with NULL created_at
    console.log('Fixing addresses with NULL dates...');
    const [addressesUpdated] = await sequelize.query(`
      UPDATE addresses
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    console.log(`Addresses updated: ${addressesUpdated?.affectedRows || 'check complete'}`);

    // Fix reviews with NULL created_at
    console.log('Fixing reviews with NULL dates...');
    const [reviewsUpdated] = await sequelize.query(`
      UPDATE reviews
      SET created_at = COALESCE(created_at, NOW()),
          updated_at = COALESCE(updated_at, NOW())
      WHERE created_at IS NULL OR updated_at IS NULL
    `);
    console.log(`Reviews updated: ${reviewsUpdated?.affectedRows || 'check complete'}`);

    // Verify the fixes
    console.log('\n--- Verification ---');

    const [ordersWithNull] = await sequelize.query(`
      SELECT COUNT(*) as count FROM orders WHERE created_at IS NULL
    `);
    console.log(`Orders with NULL created_at: ${ordersWithNull[0]?.count || 0}`);

    const [usersWithNull] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users WHERE created_at IS NULL
    `);
    console.log(`Users with NULL created_at: ${usersWithNull[0]?.count || 0}`);

    console.log('\n✅ Date fix migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixMissingDates();
}

module.exports = fixMissingDates;
