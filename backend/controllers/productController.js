const { Op } = require('sequelize');
const Product = require('../models/Product');
const { invalidateCache } = require('../middleware/cache');

const clearProductCache = () => invalidateCache('cache:product*').then(() => invalidateCache('cache:categories:*'));

exports.getAllProducts = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      sortBy,
      order,
      teaType,
      isImported,
      originCountry,
      minWeight,
      maxWeight,
      inStock
    } = req.query;

    const whereClause = { isActive: true };

    // Category filter
    if (category) {
      whereClause.category = category;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    // Tea type filter (loose_leaf, tea_bags, both)
    if (teaType) {
      whereClause.teaType = teaType;
    }

    // Imported/local filter
    if (isImported !== undefined) {
      whereClause.isImported = isImported === 'true';
    }

    // Origin country filter
    if (originCountry) {
      whereClause.originCountry = originCountry;
    }

    // Weight/size filter (in grams)
    if (minWeight || maxWeight) {
      whereClause.packetSizeGrams = {};
      if (minWeight) whereClause.packetSizeGrams[Op.gte] = parseInt(minWeight);
      if (maxWeight) whereClause.packetSizeGrams[Op.lte] = parseInt(maxWeight);
    }

    // In stock filter
    if (inStock === 'true') {
      whereClause.stockQuantity = { [Op.gt]: 0 };
    }

    // Search filter
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { originCountry: { [Op.like]: `%${search}%` } }
      ];
    }

    // Sorting
    const orderClause = [];
    if (sortBy) {
      const orderDirection = order === 'desc' ? 'DESC' : 'ASC';
      orderClause.push([sortBy, orderDirection]);
    } else {
      orderClause.push(['name', 'ASC']);
    }

    const products = await Product.findAll({
      where: whereClause,
      order: orderClause
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Failed to fetch product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Product.findAll({
      attributes: [[Product.sequelize.fn('DISTINCT', Product.sequelize.col('category')), 'category']],
      where: {
        isActive: true,
        category: { [Op.ne]: null }
      },
      raw: true
    });

    const categoryList = categories.map(c => c.category).filter(Boolean);

    res.json({
      success: true,
      data: categoryList
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const {
      // Basic info
      name,
      description,
      category,
      imageUrl,
      // Pricing
      mrp,
      price,
      discount,
      // Tea details
      teaType,
      packetSize,
      packetSizeGrams,
      packagingType,
      // Origin & shipping
      isImported,
      shippingDays,
      originCountry,
      // Tea characteristics
      caffeineLevel,
      flavourNotes,
      brewingInstructions,
      brewingTemp,
      brewingTime,
      // Supplier
      supplier,
      supplierCode,
      // Inventory
      sku,
      barcode,
      stockQuantity,
      warehouseStock,
      reorderLevel,
      lowStockThreshold,
      purchaseCost,
      profitMargin
    } = req.body;

    const product = await Product.create({
      name,
      description,
      category,
      imageUrl,
      mrp,
      price,
      discount: discount || 0,
      teaType: teaType || 'loose_leaf',
      packetSize,
      packetSizeGrams,
      packagingType,
      isImported: isImported || false,
      shippingDays: shippingDays || (isImported ? 12 : 3),
      originCountry,
      caffeineLevel,
      flavourNotes,
      brewingInstructions,
      brewingTemp,
      brewingTime,
      supplier,
      supplierCode,
      sku,
      barcode,
      stockQuantity: stockQuantity || 0,
      warehouseStock: warehouseStock || 0,
      reorderLevel: reorderLevel || 10,
      lowStockThreshold: lowStockThreshold || 5,
      purchaseCost,
      profitMargin,
      isActive: true,
      lastRestockedAt: stockQuantity > 0 ? new Date() : null
    });

    await clearProductCache();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Failed to create product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.update(updates);
    await clearProductCache();

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await product.update({ isActive: false });
    await clearProductCache();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Failed to delete product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Get ALL products (including inactive)
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      products: products,
      count: products.length
    });
  } catch (error) {
    console.error('Failed to fetch all products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Toggle product active status
exports.toggleProductStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = !product.isActive;
    await product.save();
    await clearProductCache();

    res.json({
      success: true,
      message: `Product ${product.isActive ? 'activated' : 'deactivated'} successfully`,
      data: product
    });
  } catch (error) {
    console.error('Failed to toggle product status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle product status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Get inventory overview
exports.getInventoryOverview = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      attributes: [
        'id',
        'name',
        'sku',
        'stockQuantity',
        'warehouseStock',
        'reservedStock',
        'reorderLevel',
        'price',
        'purchaseCost',
        'profitMargin'
      ],
      order: [['name', 'ASC']]
    });

    // Calculate summary statistics
    const totalProducts = products.length;
    const lowStockItems = products.filter(p => p.stockQuantity <= p.reorderLevel).length;
    const outOfStockItems = products.filter(p => p.stockQuantity === 0).length;
    const totalStockValue = products.reduce((sum, p) => {
      return sum + (parseFloat(p.price) * p.stockQuantity);
    }, 0);

    res.json({
      success: true,
      data: products,
      summary: {
        totalProducts,
        lowStockItems,
        outOfStockItems,
        totalStockValue: totalStockValue.toFixed(2)
      }
    });
  } catch (error) {
    console.error('Failed to fetch inventory:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Get stock alerts (low stock and out of stock)
exports.getStockAlerts = async (req, res) => {
  try {
    // Get all active products
    const allProducts = await Product.findAll({
      where: { isActive: true },
      order: [['stockQuantity', 'ASC']]
    });

    // Categorize by stock status
    const outOfStock = allProducts.filter(p => p.stockQuantity === 0);
    const lowStock = allProducts.filter(p =>
      p.stockQuantity > 0 && p.stockQuantity <= (p.lowStockThreshold || 5)
    );
    const needsReorder = allProducts.filter(p =>
      p.stockQuantity <= (p.reorderLevel || 10) && p.stockQuantity > (p.lowStockThreshold || 5)
    );

    res.json({
      success: true,
      data: {
        outOfStock,
        lowStock,
        needsReorder
      },
      summary: {
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        needsReorderCount: needsReorder.length,
        totalAlerts: outOfStock.length + lowStock.length
      }
    });
  } catch (error) {
    console.error('Failed to fetch stock alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Legacy: Get low stock alerts (kept for backward compatibility)
exports.getLowStockAlerts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
        stockStatus: { [Op.in]: ['low_stock', 'out_of_stock'] }
      },
      order: [['stockQuantity', 'ASC']]
    });

    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Failed to fetch low stock alerts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Update stock levels
exports.updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stockQuantity, warehouseStock, operation } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Handle different stock operations
    if (operation === 'add') {
      product.stockQuantity += parseInt(stockQuantity || 0);
      product.warehouseStock += parseInt(warehouseStock || 0);
    } else if (operation === 'set') {
      if (stockQuantity !== undefined) product.stockQuantity = parseInt(stockQuantity);
      if (warehouseStock !== undefined) product.warehouseStock = parseInt(warehouseStock);
    } else if (operation === 'subtract') {
      product.stockQuantity -= parseInt(stockQuantity || 0);
      product.warehouseStock -= parseInt(warehouseStock || 0);
    }

    // Ensure stock doesn't go negative
    product.stockQuantity = Math.max(0, product.stockQuantity);
    product.warehouseStock = Math.max(0, product.warehouseStock);

    await product.save();

    res.json({
      success: true,
      message: 'Stock updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Failed to update stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Find product by barcode/SKU (for scanner)
exports.findByBarcode = async (req, res) => {
  try {
    const { code } = req.params;

    const product = await Product.findOne({
      where: {
        [Op.or]: [
          { barcode: code },
          { sku: code }
        ]
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found with this barcode/SKU'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Failed to find product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Add stock to product
exports.addStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, referenceNumber, unitCost } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number'
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity += parseInt(quantity);
    product.lastRestockedAt = new Date();

    // Update unit cost if provided
    if (unitCost) {
      product.purchaseCost = parseFloat(unitCost);
    }

    await product.save();

    // Log to inventory (if InventoryLog model exists)
    try {
      const { InventoryLog } = require('../models');
      await InventoryLog.create({
        productId: id,
        action: 'purchase_in',
        quantityChange: parseInt(quantity),
        previousStock,
        newStock: product.stockQuantity,
        userId: req.user?.userId || req.user?.id,
        reason: reason || 'Stock added',
        referenceNumber,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        totalValue: unitCost ? parseFloat(unitCost) * parseInt(quantity) : null
      });
    } catch (logError) {
      console.warn('Could not log inventory change:', logError.message);
    }

    res.json({
      success: true,
      message: `Added ${quantity} units to stock`,
      data: {
        product,
        previousStock,
        newStock: product.stockQuantity,
        added: parseInt(quantity)
      }
    });
  } catch (error) {
    console.error('Failed to add stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Remove stock from product
exports.removeStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive number'
      });
    }

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Available: ${product.stockQuantity}`
      });
    }

    const previousStock = product.stockQuantity;
    product.stockQuantity -= parseInt(quantity);
    await product.save();

    // Log to inventory
    try {
      const { InventoryLog } = require('../models');
      await InventoryLog.create({
        productId: id,
        action: 'adjustment_sub',
        quantityChange: -parseInt(quantity),
        previousStock,
        newStock: product.stockQuantity,
        userId: req.user?.userId || req.user?.id,
        reason: reason || 'Stock removed manually'
      });
    } catch (logError) {
      console.warn('Could not log inventory change:', logError.message);
    }

    res.json({
      success: true,
      message: `Removed ${quantity} units from stock`,
      data: {
        product,
        previousStock,
        newStock: product.stockQuantity,
        removed: parseInt(quantity)
      }
    });
  } catch (error) {
    console.error('Failed to remove stock:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Admin: Get product with full details for editing
exports.getProductForEdit = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get inventory history
    let inventoryHistory = [];
    try {
      const { InventoryLog } = require('../models');
      inventoryHistory = await InventoryLog.findAll({
        where: { productId: id },
        order: [['created_at', 'DESC']],
        limit: 20
      });
    } catch (e) {
      // InventoryLog might not exist
    }

    res.json({
      success: true,
      data: {
        product,
        inventoryHistory,
        stockInfo: {
          isLowStock: product.stockQuantity <= (product.lowStockThreshold || 5),
          isOutOfStock: product.stockQuantity === 0,
          needsReorder: product.stockQuantity <= (product.reorderLevel || 10)
        }
      }
    });
  } catch (error) {
    console.error('Failed to fetch product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get enum options for dropdowns
exports.getProductEnums = async (req, res) => {
  res.json({
    success: true,
    data: {
      teaTypes: ['loose_leaf', 'tea_bags', 'both'],
      caffeinelevels: ['caffeine_free', 'low', 'medium', 'high'],
      packagingTypes: ['pouch', 'box', 'tin', 'jar', 'sachet', 'gift_box'],
      stockStatuses: ['in_stock', 'low_stock', 'out_of_stock']
    }
  });
};
