const { Op } = require('sequelize');
const Product = require('../models/Product');

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
      name,
      description,
      price,
      stockQuantity,
      category,
      imageUrl,
      teaType,
      packetSize,
      packetSizeGrams,
      isImported,
      shippingDays,
      originCountry,
      sku,
      barcode,
      warehouseStock,
      reorderLevel,
      purchaseCost,
      profitMargin
    } = req.body;

    const product = await Product.create({
      name,
      description,
      price,
      stockQuantity: stockQuantity || 0,
      category,
      imageUrl,
      teaType: teaType || 'loose_leaf',
      packetSize,
      packetSizeGrams,
      isImported: isImported || false,
      shippingDays: shippingDays || (isImported ? 12 : 3),
      originCountry,
      sku,
      barcode,
      warehouseStock: warehouseStock || 0,
      reorderLevel: reorderLevel || 10,
      purchaseCost,
      profitMargin,
      isActive: true
    });

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

// Admin: Get low stock alerts
exports.getLowStockAlerts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          Product.sequelize.where(
            Product.sequelize.col('stock_quantity'),
            Op.lte,
            Product.sequelize.col('reorder_level')
          )
        ]
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
