/**
 * Migration: Fix All NULL Values in Products
 *
 * This comprehensive migration fixes:
 * - NULL is_active values (set to true)
 * - NULL stock_quantity values (set to 0)
 * - NULL reserved_stock values (set to 0)
 * - NULL warehouse_stock values (set to 0)
 * - NULL reorder_level values (set to 10)
 * - NULL low_stock_threshold values (set to 5)
 *
 * Run with: node migrations/fixAllNullValues.js
 */

const { sequelize } = require('../config/database');

async function fixAllNullValues() {
  console.log('='.repeat(50));
  console.log('COMPREHENSIVE NULL VALUES FIX MIGRATION');
  console.log('='.repeat(50));
  console.log('');

  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // ============================================
    // CHECK CURRENT STATE
    // ============================================
    console.log('--- Current State ---\n');

    // Check products table structure
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM products
    `);
    console.log('Products table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (NULL: ${col.Null}, Default: ${col.Default})`);
    });
    console.log('');

    // Count total products
    const [totalResult] = await sequelize.query(`SELECT COUNT(*) as count FROM products`);
    console.log(`Total products in database: ${totalResult[0]?.count || 0}`);

    // Check for NULL is_active
    const [nullIsActive] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active IS NULL
    `);
    console.log(`Products with NULL is_active: ${nullIsActive[0]?.count || 0}`);

    // Check for NULL stock_quantity
    const [nullStock] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE stock_quantity IS NULL
    `);
    console.log(`Products with NULL stock_quantity: ${nullStock[0]?.count || 0}`);

    // Check for NULL reserved_stock
    const [nullReserved] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE reserved_stock IS NULL
    `);
    console.log(`Products with NULL reserved_stock: ${nullReserved[0]?.count || 0}`);

    // Check for NULL reorder_level
    const [nullReorder] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE reorder_level IS NULL
    `);
    console.log(`Products with NULL reorder_level: ${nullReorder[0]?.count || 0}`);

    console.log('\n--- Applying Fixes ---\n');

    // ============================================
    // FIX NULL VALUES
    // ============================================

    // Fix is_active
    console.log('1. Fixing NULL is_active values...');
    const [isActiveResult] = await sequelize.query(`
      UPDATE products SET is_active = 1 WHERE is_active IS NULL
    `);
    console.log(`   Updated: ${isActiveResult?.affectedRows || 'check complete'} rows`);

    // Fix stock_quantity
    console.log('2. Fixing NULL stock_quantity values...');
    const [stockResult] = await sequelize.query(`
      UPDATE products SET stock_quantity = 0 WHERE stock_quantity IS NULL
    `);
    console.log(`   Updated: ${stockResult?.affectedRows || 'check complete'} rows`);

    // Fix reserved_stock
    console.log('3. Fixing NULL reserved_stock values...');
    const [reservedResult] = await sequelize.query(`
      UPDATE products SET reserved_stock = 0 WHERE reserved_stock IS NULL
    `);
    console.log(`   Updated: ${reservedResult?.affectedRows || 'check complete'} rows`);

    // Fix warehouse_stock
    console.log('4. Fixing NULL warehouse_stock values...');
    const [warehouseResult] = await sequelize.query(`
      UPDATE products SET warehouse_stock = 0 WHERE warehouse_stock IS NULL
    `);
    console.log(`   Updated: ${warehouseResult?.affectedRows || 'check complete'} rows`);

    // Fix reorder_level
    console.log('5. Fixing NULL reorder_level values...');
    const [reorderResult] = await sequelize.query(`
      UPDATE products SET reorder_level = 10 WHERE reorder_level IS NULL
    `);
    console.log(`   Updated: ${reorderResult?.affectedRows || 'check complete'} rows`);

    // Fix low_stock_threshold
    console.log('6. Fixing NULL low_stock_threshold values...');
    const [thresholdResult] = await sequelize.query(`
      UPDATE products SET low_stock_threshold = 5 WHERE low_stock_threshold IS NULL
    `);
    console.log(`   Updated: ${thresholdResult?.affectedRows || 'check complete'} rows`);

    // Fix stock_status
    console.log('7. Updating stock_status based on stock_quantity...');
    await sequelize.query(`
      UPDATE products
      SET stock_status = CASE
        WHEN stock_quantity = 0 THEN 'out_of_stock'
        WHEN stock_quantity <= COALESCE(low_stock_threshold, 5) THEN 'low_stock'
        ELSE 'in_stock'
      END
    `);
    console.log('   Stock statuses updated');

    // ============================================
    // VERIFY FIXES
    // ============================================
    console.log('\n--- Verification ---\n');

    const [verifyIsActive] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active IS NULL
    `);
    console.log(`Products with NULL is_active after fix: ${verifyIsActive[0]?.count || 0}`);

    const [verifyStock] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE stock_quantity IS NULL
    `);
    console.log(`Products with NULL stock_quantity after fix: ${verifyStock[0]?.count || 0}`);

    // Show final counts
    const [activeCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1
    `);
    console.log(`\nTotal active products: ${activeCount[0]?.count || 0}`);

    const [inStockCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity > 5
    `);
    console.log(`Products in stock (qty > 5): ${inStockCount[0]?.count || 0}`);

    const [lowStockCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity > 0 AND stock_quantity <= 5
    `);
    console.log(`Products low stock (1-5): ${lowStockCount[0]?.count || 0}`);

    const [outOfStockCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_quantity = 0
    `);
    console.log(`Products out of stock (0): ${outOfStockCount[0]?.count || 0}`);

    // Sample products
    console.log('\n--- Sample Products ---\n');
    const [sampleProducts] = await sequelize.query(`
      SELECT id, name, is_active, stock_quantity, stock_status, price
      FROM products
      LIMIT 5
    `);
    sampleProducts.forEach(p => {
      console.log(`  ID: ${p.id}, Name: ${p.name}, Active: ${p.is_active}, Stock: ${p.stock_quantity}, Status: ${p.stock_status}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('Migration completed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixAllNullValues();
}

module.exports = fixAllNullValues;
