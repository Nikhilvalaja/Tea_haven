// ============================================
// ORDER SERVICE - Order Management
// ============================================

const { Order, OrderItem, Cart, CartItem, Address, Product, User, sequelize } = require('../models');
const { calculateOrderTotal } = require('../utils/shippingCalculator');
const StockService = require('./StockService');
const { Op } = require('sequelize');

class OrderService {
  /**
   * Standard order include options for queries
   */
  static get ORDER_INCLUDES() {
    return [
      {
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product' }]
      },
      { model: Address, as: 'address' }
    ];
  }

  /**
   * Generate unique order number
   * @returns {string} Order number (TH-YEAR-00001)
   */
  static async generateOrderNumber() {
    const year = new Date().getFullYear();
    const lastOrder = await Order.findOne({
      order: [['created_at', 'DESC']]
    });

    let orderNum = 1;
    if (lastOrder && lastOrder.orderNumber) {
      const lastNum = parseInt(lastOrder.orderNumber.split('-')[2]);
      orderNum = lastNum + 1;
    }

    return `TH-${year}-${String(orderNum).padStart(5, '0')}`;
  }

  /**
   * Create order from cart
   * @param {number} userId
   * @param {number} addressId
   * @param {string} customerNotes
   * @returns {Object} { success, order, message }
   */
  static async createFromCart(userId, addressId, customerNotes = null) {
    const transaction = await sequelize.transaction();

    try {
      // Validate address
      const address = await Address.findOne({
        where: { id: addressId, userId }
      });

      if (!address) {
        await transaction.rollback();
        return { success: false, message: 'Address not found' };
      }

      // Get cart with items
      const cart = await Cart.findOne({
        where: { userId },
        include: [{
          model: CartItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }]
        }],
        transaction
      });

      if (!cart || cart.items.length === 0) {
        await transaction.rollback();
        return { success: false, message: 'Cart is empty' };
      }

      // Validate stock and prepare order items
      let subtotal = 0;
      let hasImportedItems = false;
      const orderItems = [];

      for (const item of cart.items) {
        const product = item.product;

        // Check availability
        const stockCheck = await StockService.checkAvailability(product.id, item.quantity);
        if (!stockCheck.available) {
          await transaction.rollback();
          return { success: false, message: stockCheck.message };
        }

        // Reserve stock
        await StockService.reserveStock(product.id, item.quantity, transaction);

        if (product.isImported) {
          hasImportedItems = true;
        }

        const itemTotal = parseFloat(product.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtPurchase: product.price,
          productName: product.name,
          productSku: product.sku,
          totalPrice: itemTotal
        });
      }

      // Calculate totals
      const calculation = calculateOrderTotal(
        address.state,
        subtotal,
        cart.items.length,
        hasImportedItems
      );

      // Generate order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const order = await Order.create({
        orderNumber,
        userId,
        addressId,
        subtotal: calculation.subtotal,
        shippingCost: calculation.shipping.cost,
        taxAmount: calculation.tax.amount,
        totalAmount: calculation.total,
        shippingMethod: calculation.shipping.method,
        estimatedDeliveryDays: calculation.shipping.estimatedDays,
        status: 'pending',
        paymentStatus: 'pending',
        customerNotes
      }, { transaction });

      // Create order items
      for (const item of orderItems) {
        await OrderItem.create({
          orderId: order.id,
          ...item
        }, { transaction });
      }

      // Clear cart
      await CartItem.destroy({
        where: { cartId: cart.id },
        transaction
      });

      await transaction.commit();

      // Fetch complete order
      const completeOrder = await Order.findOne({
        where: { id: order.id },
        include: this.ORDER_INCLUDES
      });

      return { success: true, order: completeOrder };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get orders for a user
   * @param {number} userId
   * @param {Object} options - { status, limit, offset }
   * @returns {Object} { orders, pagination }
   */
  static async getUserOrders(userId, options = {}) {
    const { status, limit = 20, offset = 0 } = options;

    const where = { userId };
    if (status) where.status = status;

    const result = await Order.findAndCountAll({
      where,
      include: this.ORDER_INCLUDES,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    return {
      orders: result.rows,
      pagination: {
        total: result.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    };
  }

  /**
   * Get single order by ID (for user)
   * @param {number} orderId
   * @param {number} userId
   * @returns {Object|null} order
   */
  static async getOrderById(orderId, userId = null) {
    const where = { id: orderId };
    if (userId) where.userId = userId;

    return await Order.findOne({
      where,
      include: this.ORDER_INCLUDES
    });
  }

  /**
   * Cancel order (only pending orders)
   * @param {number} orderId
   * @param {number} userId
   * @returns {Object} { success, order, message }
   */
  static async cancelOrder(orderId, userId) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findOne({
        where: { id: orderId, userId },
        include: [{ model: OrderItem, as: 'items' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return { success: false, message: 'Order not found' };
      }

      if (order.status !== 'pending') {
        await transaction.rollback();
        return { success: false, message: 'Only pending orders can be cancelled' };
      }

      // Release reserved stock
      for (const item of order.items) {
        await StockService.releaseReservedStock(item.productId, item.quantity, transaction);
      }

      order.status = 'cancelled';
      await order.save({ transaction });

      await transaction.commit();

      return { success: true, order };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update order status (admin)
   * @param {number} orderId
   * @param {Object} updates - { status, trackingNumber, adminNotes }
   * @returns {Object} { success, order, message }
   */
  static async updateStatus(orderId, updates) {
    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items' }],
        transaction
      });

      if (!order) {
        await transaction.rollback();
        return { success: false, message: 'Order not found' };
      }

      const { status, trackingNumber, adminNotes } = updates;

      // Handle stock on shipped
      if (status === 'shipped' && order.status !== 'shipped') {
        for (const item of order.items) {
          await StockService.deductStock(item.productId, item.quantity, transaction);
        }
        order.shippedAt = new Date();
        order.paymentStatus = 'paid';
      }

      if (status === 'delivered' && order.status !== 'delivered') {
        order.deliveredAt = new Date();
      }

      if (status) order.status = status;
      if (trackingNumber) order.trackingNumber = trackingNumber;
      if (adminNotes) order.adminNotes = adminNotes;

      await order.save({ transaction });
      await transaction.commit();

      return { success: true, order };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get order statistics for dashboard
   * @returns {Object} stats
   */
  static async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      revenueResult,
      monthRevenueResult,
      recentOrders
    ] = await Promise.all([
      Order.count(),
      Order.count({ where: { status: 'pending' } }),
      Order.count({ where: { status: 'processing' } }),
      Order.count({ where: { status: 'confirmed' } }),
      Order.count({ where: { status: 'shipped' } }),
      Order.count({ where: { status: 'delivered' } }),
      Order.count({ where: { status: 'cancelled' } }),
      Order.count({ where: { created_at: { [Op.gte]: today } } }),
      Order.findOne({
        where: {
          status: { [Op.notIn]: ['cancelled', 'refunded'] },
          paymentStatus: 'paid'
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'totalRevenue']],
        raw: true
      }),
      Order.findOne({
        where: {
          status: { [Op.notIn]: ['cancelled', 'refunded'] },
          paymentStatus: 'paid',
          created_at: { [Op.gte]: thirtyDaysAgo }
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'monthRevenue']],
        raw: true
      }),
      Order.findAll({
        include: [{
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }],
        order: [['created_at', 'DESC']],
        limit: 10
      })
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      confirmedOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      todayOrders,
      totalRevenue: parseFloat(revenueResult?.totalRevenue) || 0,
      monthRevenue: parseFloat(monthRevenueResult?.monthRevenue) || 0,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : 'Guest',
        customerEmail: order.user?.email,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: order.totalAmount,
        createdAt: order.createdAt
      }))
    };
  }

  /**
   * Get orders by date range for reporting
   * @param {Object} options - { startDate, endDate, status, page, limit }
   * @returns {Object} { orders, summary, pagination }
   */
  static async getByDateRange(options = {}) {
    const { startDate, endDate, status, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const where = {};

    // Handle date filtering
    if (startDate && endDate) {
      // Both dates provided - filter between them
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = {
        [Op.between]: [start, end]
      };
    } else if (startDate) {
      // Only start date - from this date onwards
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.created_at = {
        [Op.gte]: start
      };
    } else if (endDate) {
      // Only end date - up to this date
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = {
        [Op.lte]: end
      };
    }

    if (status) where.status = status;

    const [result, summaryResult] = await Promise.all([
      Order.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'firstName', 'lastName', 'email']
          },
          {
            model: OrderItem,
            as: 'items',
            include: [{
              model: Product,
              as: 'product',
              attributes: ['id', 'name', 'sku']
            }]
          },
          { model: Address, as: 'address' }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      }),
      Order.findOne({
        where,
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'totalAmount'],
          [sequelize.fn('AVG', sequelize.col('total_amount')), 'avgAmount']
        ],
        raw: true
      })
    ]);

    return {
      orders: result.rows,
      summary: {
        totalOrders: parseInt(summaryResult?.totalCount) || 0,
        totalRevenue: parseFloat(summaryResult?.totalAmount) || 0,
        avgOrderValue: parseFloat(summaryResult?.avgAmount) || 0
      },
      pagination: {
        total: result.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(result.count / limit)
      }
    };
  }
}

module.exports = OrderService;
