const { Order, OrderItem, Cart, CartItem, Address, Product, sequelize } = require('../models');
const { calculateOrderTotal } = require('../utils/shippingCalculator');

// Generate unique order number
const generateOrderNumber = async () => {
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
};

// Create order from cart (checkout)
const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.userId;
    const { addressId, customerNotes } = req.body;

    // Validate address belongs to user
    const address = await Address.findOne({
      where: { id: addressId, userId }
    });

    if (!address) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Get user's cart with items
    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }],
      transaction
    });

    if (!cart || cart.items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate totals
    let subtotal = 0;
    let hasImportedItems = false;
    const orderItems = [];

    // Validate stock and prepare order items
    for (const item of cart.items) {
      const product = item.product;

      // Check if product is still active
      if (!product.isActive) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Product "${product.name}" is no longer available`
        });
      }

      // Check stock availability
      const availableStock = product.stockQuantity - product.reservedStock;
      if (availableStock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${availableStock} available.`
        });
      }

      // Reserve stock
      product.reservedStock += item.quantity;
      await product.save({ transaction });

      // Check if imported
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

    // Calculate shipping, tax, and total
    const calculation = calculateOrderTotal(
      address.state,
      subtotal,
      cart.items.length,
      hasImportedItems
    );

    // Generate order number
    const orderNumber = await generateOrderNumber();

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

    // Commit transaction
    await transaction.commit();

    // Fetch complete order with items and address
    const completeOrder = await Order.findOne({
      where: { id: order.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        },
        {
          model: Address,
          as: 'address'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: completeOrder
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Get user's orders
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit = 20, offset = 0 } = req.query;

    const where = { userId };
    if (status) {
      where.status = status;
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        },
        {
          model: Address,
          as: 'address'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: orders.rows,
      pagination: {
        total: orders.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id, userId },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        },
        {
          model: Address,
          as: 'address'
        }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Cancel order (only if pending)
const cancelOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const order = await Order.findOne({
      where: { id, userId },
      include: [{
        model: OrderItem,
        as: 'items'
      }],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    // Release reserved stock
    for (const item of order.items) {
      const product = await Product.findByPk(item.productId, { transaction });
      if (product) {
        product.reservedStock -= item.quantity;
        await product.save({ transaction });
      }
    }

    // Update order status
    order.status = 'cancelled';
    await order.save({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
      error: error.message
    });
  }
};

// Admin: Get all orders
const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const orders = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items'
        },
        {
          model: Address,
          as: 'address'
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: orders.rows,
      pagination: {
        total: orders.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Admin: Update order status
const updateOrderStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { status, trackingNumber, adminNotes } = req.body;

    const order = await Order.findByPk(id, {
      include: [{
        model: OrderItem,
        as: 'items'
      }],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Handle stock updates based on status change
    if (status === 'shipped' && order.status !== 'shipped') {
      // Move from reserved to sold (decrease stock quantity)
      for (const item of order.items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (product) {
          product.stockQuantity -= item.quantity;
          product.reservedStock -= item.quantity;
          await product.save({ transaction });
        }
      }
      order.shippedAt = new Date();
    }

    if (status === 'delivered' && order.status !== 'delivered') {
      order.deliveredAt = new Date();
    }

    // Update order
    order.status = status || order.status;
    order.trackingNumber = trackingNumber || order.trackingNumber;
    order.adminNotes = adminNotes || order.adminNotes;

    if (status === 'shipped') {
      order.paymentStatus = 'paid';
    }

    await order.save({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Order updated successfully',
      data: order
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
};
