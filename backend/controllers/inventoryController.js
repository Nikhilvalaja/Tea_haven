const { Product, InventoryLog, Order, OrderItem, sequelize, AdminLog } = require('../models');
const { Op } = require('sequelize');

// Helper to log admin inventory actions
const logInventoryAction = async (adminId, actionType, description, options = {}) => {
  try {
    await AdminLog.create({
      adminId,
      actionType,
      description,
      entityType: options.entityType || 'product',
      entityId: options.entityId || null,
      previousValue: options.previousValue || null,
      newValue: options.newValue || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null
    });
  } catch (error) {
    console.error('Failed to log inventory action:', error.message);
  }
};

// ============================================
// INVENTORY LOG HELPERS
// ============================================

// Create inventory log entry
const createInventoryLog = async (data, transaction = null) => {
  const options = transaction ? { transaction } : {};
  return await InventoryLog.create(data, options);
};

// ============================================
// STOCK MANAGEMENT
// ============================================

// Add stock (purchase/restock)
const addStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, quantity, reason, referenceNumber, unitCost } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Product ID and positive quantity are required'
      });
    }

    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.stockQuantity;
    const newStock = previousStock + quantity;

    // Update product stock
    product.stockQuantity = newStock;
    if (unitCost) {
      product.purchaseCost = unitCost;
    }
    await product.save({ transaction });

    // Create inventory log
    await createInventoryLog({
      productId,
      action: 'purchase_in',
      quantityChange: quantity,
      previousStock,
      newStock,
      userId,
      reason: reason || 'Stock purchase/restock',
      referenceNumber,
      unitCost,
      totalValue: unitCost ? unitCost * quantity : null
    }, transaction);

    await transaction.commit();

    // Log admin action
    await logInventoryAction(userId, 'inventory_add',
      `Added ${quantity} units to ${product.name} (${previousStock} → ${newStock})`, {
        entityType: 'product',
        entityId: productId,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock, quantityAdded: quantity },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    res.json({
      success: true,
      message: `Added ${quantity} units to ${product.name}`,
      data: {
        productId,
        productName: product.name,
        previousStock,
        newStock,
        quantityAdded: quantity
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Add stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add stock. Please try again.'
    });
  }
};

// Adjust stock (manual adjustment)
const adjustStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, quantity, action, reason } = req.body;
    const userId = req.user.userId;

    if (!productId || quantity === undefined) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Product ID and quantity are required'
      });
    }

    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.stockQuantity;
    let newStock;
    let logAction;
    let quantityChange;

    if (action === 'set') {
      // Set to exact value
      newStock = Math.max(0, quantity);
      quantityChange = newStock - previousStock;
      logAction = quantityChange >= 0 ? 'adjustment_add' : 'adjustment_sub';
    } else if (action === 'subtract' || quantity < 0) {
      // Subtract from current
      const subtractQty = Math.abs(quantity);
      newStock = Math.max(0, previousStock - subtractQty);
      quantityChange = newStock - previousStock;
      logAction = 'adjustment_sub';
    } else {
      // Add to current
      newStock = previousStock + quantity;
      quantityChange = quantity;
      logAction = 'adjustment_add';
    }

    // Update product stock
    product.stockQuantity = newStock;
    await product.save({ transaction });

    // Create inventory log
    await createInventoryLog({
      productId,
      action: logAction,
      quantityChange,
      previousStock,
      newStock,
      userId,
      reason: reason || 'Manual stock adjustment'
    }, transaction);

    await transaction.commit();

    // Log admin action
    await logInventoryAction(userId, 'inventory_adjust',
      `Adjusted ${product.name} stock (${previousStock} → ${newStock}, change: ${quantityChange > 0 ? '+' : ''}${quantityChange})`, {
        entityType: 'product',
        entityId: productId,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock, change: quantityChange },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    res.json({
      success: true,
      message: `Stock adjusted for ${product.name}`,
      data: {
        productId,
        productName: product.name,
        previousStock,
        newStock,
        change: quantityChange
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock. Please try again.'
    });
  }
};

// Record damaged/expired stock
const recordDamage = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId, quantity, reason } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity || quantity <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Product ID and positive quantity are required'
      });
    }

    const product = await Product.findByPk(productId, { transaction });
    if (!product) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const previousStock = product.stockQuantity;
    const newStock = Math.max(0, previousStock - quantity);

    // Update product stock
    product.stockQuantity = newStock;
    await product.save({ transaction });

    // Create inventory log
    await createInventoryLog({
      productId,
      action: 'damage_out',
      quantityChange: -quantity,
      previousStock,
      newStock,
      userId,
      reason: reason || 'Damaged/expired stock removed',
      totalValue: product.purchaseCost ? product.purchaseCost * quantity : null
    }, transaction);

    await transaction.commit();

    // Log admin action
    await logInventoryAction(userId, 'inventory_damage',
      `Removed ${quantity} damaged/expired units from ${product.name} (${previousStock} → ${newStock})`, {
        entityType: 'product',
        entityId: productId,
        previousValue: { stock: previousStock },
        newValue: { stock: newStock, removed: quantity, reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    res.json({
      success: true,
      message: `Recorded ${quantity} damaged units for ${product.name}`,
      data: {
        productId,
        productName: product.name,
        previousStock,
        newStock,
        quantityRemoved: quantity
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Record damage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record damage. Please try again.'
    });
  }
};

// ============================================
// INVENTORY QUERIES
// ============================================

// Stock threshold constants
const LOW_STOCK_THRESHOLD = 5;  // Alert when stock drops to 5 or below
const OUT_OF_STOCK_THRESHOLD = 0;  // Out of stock at 0

// Helper: Active product condition (isActive = true OR isActive IS NULL)
const activeProductCondition = {
  [Op.or]: [
    { isActive: true },
    { isActive: null }
  ]
};

// Get all products with inventory info
const getInventory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'ASC',
      filter = 'all', // all, low_stock, out_of_stock, in_stock, needs_reorder
      search = ''
    } = req.query;

    const offset = (page - 1) * limit;

    // Build where clause - always include active products condition
    // Use Op.and to combine multiple conditions without overwriting
    const conditions = [activeProductCondition];

    if (search) {
      conditions.push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { sku: { [Op.like]: `%${search}%` } },
          { barcode: { [Op.like]: `%${search}%` } }
        ]
      });
    }

    if (filter === 'low_stock') {
      // Low stock: > 0 but <= 5
      conditions.push({
        stockQuantity: {
          [Op.and]: [
            { [Op.gt]: OUT_OF_STOCK_THRESHOLD },
            { [Op.lte]: LOW_STOCK_THRESHOLD }
          ]
        }
      });
    } else if (filter === 'out_of_stock') {
      conditions.push({ stockQuantity: OUT_OF_STOCK_THRESHOLD });
    } else if (filter === 'in_stock') {
      conditions.push({ stockQuantity: { [Op.gt]: LOW_STOCK_THRESHOLD } });
    } else if (filter === 'needs_reorder') {
      // Needs reorder: stock <= reorder level OR <= 5
      conditions.push({
        [Op.or]: [
          { stockQuantity: { [Op.lte]: sequelize.col('reorder_level') } },
          { stockQuantity: { [Op.lte]: LOW_STOCK_THRESHOLD } }
        ]
      });
    }

    const where = { [Op.and]: conditions };

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      attributes: [
        'id', 'name', 'sku', 'barcode', 'price', 'purchaseCost',
        'stockQuantity', 'reservedStock', 'reorderLevel', 'warehouseStock',
        'category', 'imageUrl', 'isActive', 'teaType', 'packetSize',
        'packetSizeGrams', 'originCountry', 'isImported', 'shippingDays'
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Calculate available stock for each product
    const productsWithAvailable = products.map(p => ({
      ...p.toJSON(),
      availableStock: p.stockQuantity - p.reservedStock,
      stockStatus: p.stockQuantity === 0 ? 'out_of_stock' :
                   p.stockQuantity <= LOW_STOCK_THRESHOLD ? 'low_stock' : 'in_stock',
      needsReorder: p.stockQuantity <= p.reorderLevel || p.stockQuantity <= LOW_STOCK_THRESHOLD,
      stockValue: p.purchaseCost ? p.stockQuantity * parseFloat(p.purchaseCost) : null
    }));

    res.json({
      success: true,
      data: productsWithAvailable,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory. Please try again.'
    });
  }
};

// Get inventory log history
const getInventoryLog = async (req, res) => {
  try {
    const {
      productId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (productId) {
      where.productId = productId;
    }
    if (action) {
      where.action = action;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }

    const { count, rows: logs } = await InventoryLog.findAndCountAll({
      where,
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'sku']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get inventory log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory log. Please try again.'
    });
  }
};

// ============================================
// ANALYTICS & REPORTS
// ============================================

// Get inventory dashboard overview
const getDashboard = async (req, res) => {
  try {
    // Total products (isActive = true OR isActive IS NULL)
    const totalProducts = await Product.count({
      where: {
        [Op.and]: [activeProductCondition]
      }
    });

    // Stock status counts (using LOW_STOCK_THRESHOLD = 5)
    // Out of stock: stockQuantity = 0 or NULL
    const outOfStock = await Product.count({
      where: {
        [Op.and]: [
          activeProductCondition,
          {
            [Op.or]: [
              { stockQuantity: 0 },
              { stockQuantity: null }
            ]
          }
        ]
      }
    });

    // Low stock: > 0 but <= 5
    const lowStock = await Product.count({
      where: {
        [Op.and]: [
          activeProductCondition,
          { stockQuantity: { [Op.gt]: 0 } },
          { stockQuantity: { [Op.lte]: LOW_STOCK_THRESHOLD } }
        ]
      }
    });

    const inStock = totalProducts - outOfStock - lowStock;

    // Total stock value - use COALESCE for NULL handling
    const stockValueResult = await Product.findAll({
      where: {
        [Op.and]: [activeProductCondition]
      },
      attributes: [
        [sequelize.fn('SUM',
          sequelize.literal('COALESCE(stock_quantity, 0) * COALESCE(purchase_cost, price * 0.6)')
        ), 'totalCostValue'],
        [sequelize.fn('SUM',
          sequelize.literal('COALESCE(stock_quantity, 0) * price')
        ), 'totalRetailValue'],
        [sequelize.fn('SUM', sequelize.literal('COALESCE(stock_quantity, 0)')), 'totalUnits']
      ],
      raw: true
    });

    // Recent stock movements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentMovements = await InventoryLog.findAll({
      where: {
        createdAt: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('quantity_change')), 'totalQuantity']
      ],
      group: ['action'],
      raw: true
    });

    // Top selling products (by order items in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topSelling = await OrderItem.findAll({
      attributes: [
        'productId',
        'productName',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'totalRevenue']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          created_at: { [Op.gte]: thirtyDaysAgo },
          status: { [Op.notIn]: ['cancelled', 'refunded'] }
        }
      }],
      group: ['productId', 'productName'],
      order: [[sequelize.fn('SUM', sequelize.col('quantity')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Products needing reorder (stock <= 5 OR stock <= reorder_level)
    const needsReorder = await Product.findAll({
      where: {
        [Op.and]: [
          activeProductCondition,
          {
            [Op.or]: [
              { stockQuantity: { [Op.lte]: LOW_STOCK_THRESHOLD } },
              { stockQuantity: { [Op.lte]: sequelize.col('reorder_level') } },
              { stockQuantity: null }
            ]
          }
        ]
      },
      attributes: ['id', 'name', 'sku', 'stockQuantity', 'reorderLevel', 'reservedStock', 'packetSize', 'teaType'],
      order: [['stockQuantity', 'ASC']],
      limit: 20
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalProducts,
          inStock,
          lowStock,
          outOfStock,
          totalUnits: parseInt(stockValueResult[0]?.totalUnits) || 0,
          totalCostValue: parseFloat(stockValueResult[0]?.totalCostValue) || 0,
          totalRetailValue: parseFloat(stockValueResult[0]?.totalRetailValue) || 0
        },
        recentMovements,
        topSelling,
        needsReorder
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard. Please try again.'
    });
  }
};

// Get sales analytics
const getSalesAnalytics = async (req, res) => {
  try {
    const { period = '30days' } = req.query;

    let startDate = new Date();
    let groupBy;
    let dateFormat;

    switch (period) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        groupBy = 'DATE(created_at)';
        dateFormat = 'daily';
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'DATE(created_at)';
        dateFormat = 'daily';
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        groupBy = 'YEARWEEK(created_at)';
        dateFormat = 'weekly';
        break;
      case '365days':
        startDate.setDate(startDate.getDate() - 365);
        groupBy = 'DATE_FORMAT(created_at, "%Y-%m")';
        dateFormat = 'monthly';
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
        groupBy = 'DATE(created_at)';
        dateFormat = 'daily';
    }

    // Sales by period
    const salesByPeriod = await Order.findAll({
      where: {
        created_at: { [Op.gte]: startDate },
        status: { [Op.notIn]: ['cancelled', 'refunded'] }
      },
      attributes: [
        [sequelize.literal(groupBy), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalSales'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avgOrderValue']
      ],
      group: [sequelize.literal(groupBy)],
      order: [[sequelize.literal(groupBy), 'ASC']],
      raw: true
    });

    // Sales by category
    const salesByCategory = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('OrderItem.quantity')), 'totalSold'],
        [sequelize.fn('SUM', sequelize.col('OrderItem.total_price')), 'totalRevenue']
      ],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [],
          where: {
            created_at: { [Op.gte]: startDate },
            status: { [Op.notIn]: ['cancelled', 'refunded'] }
          }
        },
        {
          model: Product,
          as: 'product',
          attributes: ['category']
        }
      ],
      group: ['product.category'],
      raw: true
    });

    // Total summary
    const totalSummary = await Order.findOne({
      where: {
        created_at: { [Op.gte]: startDate },
        status: { [Op.notIn]: ['cancelled', 'refunded'] }
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalOrders'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avgOrderValue']
      ],
      raw: true
    });

    // Units sold
    const unitsSold = await OrderItem.findOne({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'totalUnits']
      ],
      include: [{
        model: Order,
        as: 'order',
        attributes: [],
        where: {
          created_at: { [Op.gte]: startDate },
          status: { [Op.notIn]: ['cancelled', 'refunded'] }
        }
      }],
      raw: true
    });

    res.json({
      success: true,
      data: {
        period: dateFormat,
        startDate,
        summary: {
          totalOrders: parseInt(totalSummary?.totalOrders) || 0,
          totalRevenue: parseFloat(totalSummary?.totalRevenue) || 0,
          avgOrderValue: parseFloat(totalSummary?.avgOrderValue) || 0,
          totalUnitsSold: parseInt(unitsSold?.totalUnits) || 0
        },
        salesByPeriod,
        salesByCategory
      }
    });
  } catch (error) {
    console.error('Get sales analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics. Please try again.'
    });
  }
};

// Get stock movement report
const getStockMovementReport = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate);
      if (endDate) where.createdAt[Op.lte] = new Date(endDate);
    }
    if (productId) {
      where.productId = productId;
    }

    // Summary by action type
    const summaryByAction = await InventoryLog.findAll({
      where,
      attributes: [
        'action',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('quantity_change')), 'totalQuantity'],
        [sequelize.fn('SUM', sequelize.col('total_value')), 'totalValue']
      ],
      group: ['action'],
      raw: true
    });

    // Stock in vs stock out
    const stockIn = summaryByAction
      .filter(s => ['purchase_in', 'return_in', 'adjustment_add', 'transfer_in', 'reservation_release'].includes(s.action))
      .reduce((sum, s) => sum + parseInt(s.totalQuantity || 0), 0);

    const stockOut = summaryByAction
      .filter(s => ['sale_out', 'damage_out', 'adjustment_sub', 'transfer_out', 'reservation'].includes(s.action))
      .reduce((sum, s) => sum + Math.abs(parseInt(s.totalQuantity || 0)), 0);

    // Daily movement (for chart)
    const dailyMovement = await InventoryLog.findAll({
      where,
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        [sequelize.fn('SUM',
          sequelize.literal("CASE WHEN quantity_change > 0 THEN quantity_change ELSE 0 END")
        ), 'stockIn'],
        [sequelize.fn('SUM',
          sequelize.literal("CASE WHEN quantity_change < 0 THEN ABS(quantity_change) ELSE 0 END")
        ), 'stockOut']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at'))],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        summaryByAction,
        totals: {
          stockIn,
          stockOut,
          netChange: stockIn - stockOut
        },
        dailyMovement
      }
    });
  } catch (error) {
    console.error('Get stock movement report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movement report. Please try again.'
    });
  }
};

// Get product stock history
const getProductStockHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const product = await Product.findByPk(id, {
      attributes: ['id', 'name', 'sku', 'stockQuantity', 'reservedStock', 'reorderLevel']
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const history = await InventoryLog.findAll({
      where: { productId: id },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: {
        product,
        history
      }
    });
  } catch (error) {
    console.error('Get product stock history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product stock history. Please try again.'
    });
  }
};

// ============================================
// INVENTORY STATS (FOR DASHBOARD)
// ============================================

// Get inventory stats for admin dashboard
const getInventoryStats = async (req, res) => {
  try {
    // Total products count (isActive = true OR isActive IS NULL)
    const totalProducts = await Product.count({
      where: {
        [Op.and]: [activeProductCondition]
      }
    });

    // Out of stock count (stock = 0 or NULL)
    const outOfStockCount = await Product.count({
      where: {
        [Op.and]: [
          activeProductCondition,
          {
            [Op.or]: [
              { stockQuantity: 0 },
              { stockQuantity: null }
            ]
          }
        ]
      }
    });

    // Low stock count (stock > 0 but <= 5)
    const lowStockCount = await Product.count({
      where: {
        [Op.and]: [
          activeProductCondition,
          { stockQuantity: { [Op.gt]: 0 } },
          { stockQuantity: { [Op.lte]: LOW_STOCK_THRESHOLD } }
        ]
      }
    });

    // Get low stock items for dashboard alert (stock <= 5 or NULL)
    const lowStockItems = await Product.findAll({
      where: {
        [Op.and]: [
          activeProductCondition,
          {
            [Op.or]: [
              { stockQuantity: { [Op.lte]: LOW_STOCK_THRESHOLD } },
              { stockQuantity: null }
            ]
          }
        ]
      },
      attributes: ['id', 'name', 'sku', 'stockQuantity', 'reorderLevel', 'packetSize', 'teaType'],
      order: [['stockQuantity', 'ASC']],
      limit: 15
    });

    // Total inventory value - use COALESCE for NULL handling
    const valueResult = await Product.findAll({
      where: {
        [Op.and]: [activeProductCondition]
      },
      attributes: [
        [sequelize.fn('SUM',
          sequelize.literal('COALESCE(stock_quantity, 0) * COALESCE(purchase_cost, price * 0.6)')
        ), 'totalCostValue'],
        [sequelize.fn('SUM',
          sequelize.literal('COALESCE(stock_quantity, 0) * price')
        ), 'totalRetailValue']
      ],
      raw: true
    });

    res.json({
      success: true,
      stats: {
        totalProducts,
        outOfStockCount,
        lowStockCount,
        totalCostValue: parseFloat(valueResult[0]?.totalCostValue) || 0,
        totalRetailValue: parseFloat(valueResult[0]?.totalRetailValue) || 0,
        lowStockItems: lowStockItems.map(item => ({
          id: item.id,
          name: item.name,
          sku: item.sku,
          quantity: item.stockQuantity,
          reorderLevel: item.reorderLevel
        }))
      }
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory stats. Please try again.'
    });
  }
};

// ============================================
// STOCK CHECK FOR FRONTEND
// ============================================

// Check stock availability (public endpoint)
const checkStock = async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    const products = await Product.findAll({
      where: { id: productIds },
      attributes: ['id', 'name', 'stockQuantity', 'reservedStock', 'isActive']
    });

    const stockStatus = products.map(p => ({
      productId: p.id,
      name: p.name,
      availableStock: p.stockQuantity - p.reservedStock,
      isAvailable: p.isActive && (p.stockQuantity - p.reservedStock) > 0,
      status: !p.isActive ? 'inactive' :
              p.stockQuantity === 0 ? 'out_of_stock' :
              (p.stockQuantity - p.reservedStock) <= 0 ? 'reserved' : 'available'
    }));

    res.json({
      success: true,
      data: stockStatus
    });
  } catch (error) {
    console.error('Check stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check stock. Please try again.'
    });
  }
};

module.exports = {
  // Stock management
  addStock,
  adjustStock,
  recordDamage,

  // Queries
  getInventory,
  getInventoryLog,

  // Analytics
  getDashboard,
  getSalesAnalytics,
  getStockMovementReport,
  getProductStockHistory,
  getInventoryStats,

  // Frontend helpers
  checkStock,

  // Helper for other controllers
  createInventoryLog
};
