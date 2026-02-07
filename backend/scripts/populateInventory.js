// ============================================
// POPULATE INVENTORY DATA FOR ALL PRODUCTS
// ============================================
// Run with: node scripts/populateInventory.js

require('dotenv').config();
const { sequelize } = require('../config/database');
const Product = require('../models/Product');

// Helper to generate SKU based on product info
const generateSKU = (product, index) => {
  const categoryMap = {
    'Green Tea': 'GT',
    'Black Tea': 'BT',
    'Herbal Tea': 'HT',
    'Oolong Tea': 'OT',
    'White Tea': 'WT',
    'Chai': 'CH',
    'Matcha': 'MA',
    'Specialty': 'SP',
    'Accessories': 'AC'
  };

  // Get category prefix (default to TEA if not found)
  const catPrefix = categoryMap[product.category] || 'TEA';

  // Create name prefix (first 3-4 letters of first significant word)
  const nameParts = product.name.replace(/[^a-zA-Z\s]/g, '').split(' ').filter(w => w.length > 2);
  const namePrefix = (nameParts[0] || 'PROD').substring(0, 4).toUpperCase();

  // Add size indicator
  const sizeIndicator = product.packetSizeGrams ? `${product.packetSizeGrams}G` : '100G';

  // Unique identifier
  const uniqueId = String(product.id).padStart(3, '0');

  return `${catPrefix}-${namePrefix}-${sizeIndicator}-${uniqueId}`;
};

// Determine tea type based on product name/category
const determineTeaType = (product) => {
  const name = product.name.toLowerCase();
  const category = (product.category || '').toLowerCase();

  // Check for explicit tea bag indicators
  if (name.includes('tea bag') || name.includes('teabag') || name.includes('sachets') || name.includes('pyramid')) {
    return 'tea_bags';
  }

  // Check for loose leaf indicators
  if (name.includes('loose') || name.includes('leaf') || name.includes('whole leaf')) {
    return 'loose_leaf';
  }

  // Matcha is usually powder (loose)
  if (category.includes('matcha') || name.includes('matcha')) {
    return 'loose_leaf';
  }

  // Default based on category
  if (category.includes('herbal')) {
    return 'loose_leaf';
  }

  // Random assignment for variety (60% loose leaf, 40% tea bags)
  return Math.random() > 0.4 ? 'loose_leaf' : 'tea_bags';
};

// Determine packet size
const determinePacketSize = (product, teaType) => {
  const sizes = teaType === 'tea_bags'
    ? [
        { display: '20 Tea Bags', grams: 40 },
        { display: '50 Tea Bags', grams: 100 },
        { display: '100 Tea Bags', grams: 200 }
      ]
    : [
        { display: '50g Pouch', grams: 50 },
        { display: '100g Tin', grams: 100 },
        { display: '250g Pack', grams: 250 },
        { display: '500g Bulk', grams: 500 }
      ];

  // Pick based on product id for consistency
  const sizeIndex = product.id % sizes.length;
  return sizes[sizeIndex];
};

// Determine origin country based on tea type
const determineOrigin = (product) => {
  const name = product.name.toLowerCase();
  const category = (product.category || '').toLowerCase();

  // Specific origins based on tea type
  if (name.includes('darjeeling') || name.includes('assam') || name.includes('masala') || name.includes('chai')) {
    return { country: 'India', isImported: true, shippingDays: 12 };
  }
  if (name.includes('earl grey') || name.includes('english breakfast')) {
    return { country: 'United Kingdom', isImported: true, shippingDays: 10 };
  }
  if (name.includes('sencha') || name.includes('gyokuro') || name.includes('matcha') || name.includes('genmaicha')) {
    return { country: 'Japan', isImported: true, shippingDays: 14 };
  }
  if (name.includes('oolong') || name.includes('pu-erh') || name.includes('dragon') || name.includes('jasmine')) {
    return { country: 'China', isImported: true, shippingDays: 14 };
  }
  if (name.includes('ceylon')) {
    return { country: 'Sri Lanka', isImported: true, shippingDays: 12 };
  }
  if (name.includes('rooibos')) {
    return { country: 'South Africa', isImported: true, shippingDays: 15 };
  }
  if (category.includes('herbal') || name.includes('chamomile') || name.includes('peppermint')) {
    return { country: 'USA', isImported: false, shippingDays: 3 };
  }

  // Default origins based on category
  const defaultOrigins = [
    { country: 'India', isImported: true, shippingDays: 12 },
    { country: 'China', isImported: true, shippingDays: 14 },
    { country: 'Japan', isImported: true, shippingDays: 14 },
    { country: 'Taiwan', isImported: true, shippingDays: 13 },
    { country: 'USA', isImported: false, shippingDays: 3 }
  ];

  return defaultOrigins[product.id % defaultOrigins.length];
};

// Calculate cost and profit margin
const calculateFinancials = (price) => {
  // Purchase cost is typically 40-60% of selling price
  const marginPercent = 0.4 + (Math.random() * 0.2); // 40-60% markup
  const purchaseCost = parseFloat((price * (1 - marginPercent)).toFixed(2));
  const profitMargin = parseFloat((marginPercent * 100).toFixed(2));

  return { purchaseCost, profitMargin };
};

// Generate barcode (EAN-13 format)
const generateBarcode = (productId) => {
  // Country code (890 = India) + company code + product code + check digit
  const base = `890${String(Date.now()).slice(-6)}${String(productId).padStart(3, '0')}`;
  // Simple check digit calculation
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return base + checkDigit;
};

async function populateInventory() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // Get all products
    const products = await Product.findAll();
    console.log(`Found ${products.length} products to update.\n`);

    if (products.length === 0) {
      console.log('No products found in database!');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const product of products) {
      try {
        // Determine tea type
        const teaType = product.teaType || determineTeaType(product);

        // Determine packet size
        const packetInfo = determinePacketSize(product, teaType);

        // Determine origin
        const originInfo = determineOrigin(product);

        // Calculate financials
        const financials = calculateFinancials(parseFloat(product.price));

        // Generate SKU if not exists
        const sku = product.sku || generateSKU(product, updated);

        // Generate barcode if not exists
        const barcode = product.barcode || generateBarcode(product.id);

        // Update product with all inventory data
        await product.update({
          stockQuantity: 20,
          warehouseStock: 20,
          reservedStock: 0,
          reorderLevel: 10,
          teaType: teaType,
          packetSize: packetInfo.display,
          packetSizeGrams: packetInfo.grams,
          isImported: originInfo.isImported,
          shippingDays: originInfo.shippingDays,
          originCountry: originInfo.country,
          purchaseCost: financials.purchaseCost,
          profitMargin: financials.profitMargin,
          sku: sku,
          barcode: barcode,
          isActive: true
        });

        console.log(`✓ Updated: ${product.name}`);
        console.log(`  SKU: ${sku} | Type: ${teaType} | Size: ${packetInfo.display}`);
        console.log(`  Origin: ${originInfo.country} | Stock: 20 | Cost: $${financials.purchaseCost}`);
        console.log('');

        updated++;
      } catch (err) {
        console.error(`✗ Error updating ${product.name}:`, err.message);
        errors++;
      }
    }

    console.log('========================================');
    console.log(`Inventory population complete!`);
    console.log(`Updated: ${updated} products`);
    console.log(`Errors: ${errors} products`);
    console.log('========================================');

    // Summary statistics
    const stats = await Product.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.col('stock_quantity')), 'totalStock']
      ],
      where: { isActive: true },
      raw: true
    });

    console.log(`\nInventory Summary:`);
    console.log(`Total Products: ${stats[0].total}`);
    console.log(`Total Stock Units: ${stats[0].totalStock}`);

  } catch (error) {
    console.error('Failed to populate inventory:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
populateInventory();
