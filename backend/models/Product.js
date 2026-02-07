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
  // Pricing
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Maximum Retail Price'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    },
    comment: 'Selling price'
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    comment: 'Discount percentage'
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
  // Tea characteristics
  caffeineLevel: {
    type: DataTypes.ENUM('caffeine_free', 'low', 'medium', 'high'),
    allowNull: true,
    field: 'caffeine_level',
    comment: 'Caffeine content level'
  },
  flavourNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'flavour_notes',
    comment: 'Flavor profile description (e.g., floral, earthy, citrus)'
  },
  brewingInstructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'brewing_instructions',
    comment: 'How to brew this tea'
  },
  brewingTemp: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'brewing_temp',
    comment: 'Recommended brewing temperature (e.g., 85°C)'
  },
  brewingTime: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'brewing_time',
    comment: 'Recommended steeping time (e.g., 3-5 mins)'
  },
  // Packaging
  packagingType: {
    type: DataTypes.ENUM('pouch', 'box', 'tin', 'jar', 'sachet', 'gift_box'),
    allowNull: true,
    field: 'packaging_type',
    comment: 'Type of packaging'
  },
  // Supplier info
  supplier: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Supplier/vendor name'
  },
  supplierCode: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'supplier_code',
    comment: 'Supplier product code'
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
  lowStockThreshold: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'low_stock_threshold',
    comment: 'Show low stock warning at this level'
  },
  stockStatus: {
    type: DataTypes.ENUM('in_stock', 'low_stock', 'out_of_stock'),
    defaultValue: 'in_stock',
    field: 'stock_status',
    comment: 'Current stock status'
  },
  lastRestockedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_restocked_at',
    comment: 'When stock was last added'
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
  },
  // Review stats (cached for performance)
  averageRating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0,
    field: 'average_rating',
    comment: 'Cached average rating from reviews'
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'review_count',
    comment: 'Cached count of approved reviews'
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    // Auto-update stock status before saving
    beforeSave: (product) => {
      const stock = product.stockQuantity || 0;
      const lowThreshold = product.lowStockThreshold || 5;

      if (stock === 0) {
        product.stockStatus = 'out_of_stock';
      } else if (stock <= lowThreshold) {
        product.stockStatus = 'low_stock';
      } else {
        product.stockStatus = 'in_stock';
      }
    }
  }
});

// Instance method: Add stock
Product.prototype.addStock = async function(quantity, reason = null) {
  const previousStock = this.stockQuantity;
  this.stockQuantity += quantity;
  this.lastRestockedAt = new Date();
  await this.save();

  return {
    previousStock,
    newStock: this.stockQuantity,
    change: quantity,
    reason
  };
};

// Instance method: Remove stock
Product.prototype.removeStock = async function(quantity, reason = null) {
  if (this.stockQuantity < quantity) {
    throw new Error('Insufficient stock');
  }

  const previousStock = this.stockQuantity;
  this.stockQuantity -= quantity;
  await this.save();

  return {
    previousStock,
    newStock: this.stockQuantity,
    change: -quantity,
    reason
  };
};

// Instance method: Calculate discount price
Product.prototype.getDiscountedPrice = function() {
  if (!this.discount || this.discount === 0) {
    return parseFloat(this.price);
  }
  const discountAmount = (parseFloat(this.price) * parseFloat(this.discount)) / 100;
  return parseFloat(this.price) - discountAmount;
};

// Instance method: Check if low stock
Product.prototype.isLowStock = function() {
  return this.stockQuantity <= (this.lowStockThreshold || 5);
};

// Instance method: Check if out of stock
Product.prototype.isOutOfStock = function() {
  return this.stockQuantity === 0;
};

module.exports = Product;
