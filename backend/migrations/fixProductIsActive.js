/**
 * Migration: Fix Product isActive Values
 *
 * This migration updates NULL is_active fields to true for all products.
 * This ensures the inventory dashboard correctly counts products.
 *
 * Run with: node migrations/fixProductIsActive.js
 */

const { sequelize } = require('../config/database');

async function fixProductIsActive() {
  console.log('Starting isActive fix migration...');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // Check current state
    console.log('--- Current State ---');
    const [nullCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active IS NULL
    `);
    console.log(`Products with NULL is_active: ${nullCount[0]?.count || 0}`);

    const [trueCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `);
    console.log(`Products with is_active = true: ${trueCount[0]?.count || 0}`);

    const [falseCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = false
    `);
    console.log(`Products with is_active = false: ${falseCount[0]?.count || 0}`);

    // Fix products with NULL is_active
    console.log('\nFixing products with NULL is_active...');
    const [result] = await sequelize.query(`
      UPDATE products
      SET is_active = true
      WHERE is_active IS NULL
    `);
    console.log(`Products updated: ${result?.affectedRows || 'check complete'}`);

    // Verify the fixes
    console.log('\n--- Verification ---');
    const [afterNullCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active IS NULL
    `);
    console.log(`Products with NULL is_active after fix: ${afterNullCount[0]?.count || 0}`);

    const [totalProducts] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = true
    `);
    console.log(`Total active products: ${totalProducts[0]?.count || 0}`);

    console.log('\n✅ isActive fix migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixProductIsActive();
}

module.exports = fixProductIsActive;
