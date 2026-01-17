const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  stockQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'stock_quantity',
    validate: {
      min: 0
    }
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  imageUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'image_url'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  // Tea type variants
  teaType: {
    type: DataTypes.ENUM('loose_leaf', 'tea_bags', 'both'),
    allowNull: false,
    defaultValue: 'loose_leaf',
    field: 'tea_type'
  },
  // Packet/container sizes
  packetSize: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'packet_size',
    comment: 'e.g., 50g, 100g, 250g, 20 bags, 50 bags'
  },
  packetSizeGrams: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'packet_size_grams',
    comment: 'Weight in grams for sorting/filtering'
  },
  // Import status
  isImported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_imported',
    comment: 'True if product is imported from overseas'
  },
  shippingDays: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'shipping_days',
    comment: 'Estimated shipping days (10+ for imported items)'
  },
  originCountry: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'origin_country',
    comment: 'Country of origin (e.g., India, China, Japan)'
  },
  // Inventory management fields
  sku: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    comment: 'Stock Keeping Unit for tracking'
  },
  barcode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Barcode/IMEI number for scanning'
  },
  warehouseStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'warehouse_stock',
    comment: 'Stock in main warehouse'
  },
  reservedStock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'reserved_stock',
    comment: 'Stock reserved for pending orders'
  },
  reorderLevel: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
    field: 'reorder_level',
    comment: 'Alert when stock falls below this'
  },
  purchaseCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'purchase_cost',
    comment: 'Cost we paid for this product'
  },
  profitMargin: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'profit_margin',
    comment: 'Profit margin percentage'
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Product;
