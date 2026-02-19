const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const { Order, OrderItem, Cart, CartItem, Product, User, Address, sequelize } = require('../models');
const { calculateShipping, calculateTax } = require('../utils/shippingCalculator');
const { logger } = require('../utils/logger');
const StockService = require('../services/StockService');
const crypto = require('crypto');

// ============================================
// IDEMPOTENCY KEY MANAGEMENT
// ============================================
// In-memory store for idempotency keys (production should use Redis)
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate idempotency key from user and cart state
 * This ensures same cart content = same key = prevents duplicates
 */
const generateIdempotencyKey = (userId, cartId, addressId, cartItemsHash) => {
  return crypto.createHash('sha256')
    .update(`${userId}-${cartId}-${addressId}-${cartItemsHash}`)
    .digest('hex');
};

/**
 * Hash cart items for idempotency comparison
 */
const hashCartItems = (items) => {
  const itemData = items.map(i => `${i.productId}:${i.quantity}`).sort().join('|');
  return crypto.createHash('md5').update(itemData).digest('hex');
};

/**
 * Check and store idempotency key
 * @returns {Object|null} Previous result if exists, null if new
 */
const checkIdempotency = (key) => {
  const existing = idempotencyStore.get(key);
  if (existing && Date.now() - existing.timestamp < IDEMPOTENCY_TTL) {
    return existing.result;
  }
  return null;
};

const storeIdempotency = (key, result) => {
  idempotencyStore.set(key, { result, timestamp: Date.now() });
  // Cleanup old entries periodically
  if (idempotencyStore.size > 10000) {
    const cutoff = Date.now() - IDEMPOTENCY_TTL;
    for (const [k, v] of idempotencyStore) {
      if (v.timestamp < cutoff) idempotencyStore.delete(k);
    }
  }
};

// Create Stripe Checkout Session
const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.body;

    // Get user's cart with CURRENT product prices from database
    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product',
          where: { isActive: true } // Only active products
        }]
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Check idempotency - prevent duplicate checkout sessions
    const cartHash = hashCartItems(cart.items);
    const idempotencyKey = generateIdempotencyKey(userId, cart.id, addressId, cartHash);
    const existingResult = checkIdempotency(idempotencyKey);
    if (existingResult) {
      logger.info('Returning cached checkout session (idempotency)', { userId, idempotencyKey });
      return res.json(existingResult);
    }

    // Get shipping address
    const address = await Address.findOne({
      where: { id: addressId, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // SECURITY: Validate stock availability BEFORE creating checkout session
    // This prevents overselling
    for (const item of cart.items) {
      const stockCheck = await StockService.checkAvailability(item.productId, item.quantity);
      if (!stockCheck.available) {
        return res.status(400).json({
          success: false,
          message: `${item.product.name}: ${stockCheck.message}`
        });
      }
    }

    // SECURITY: Calculate totals using CURRENT DATABASE PRICES
    // Never trust frontend prices - always fetch from Product table
    let subtotal = 0;
    const lineItems = [];

    for (const item of cart.items) {
      // Use current product.price from database, NOT priceAtAdd
      const currentPrice = parseFloat(item.product.price);
      const itemTotal = currentPrice * item.quantity;
      subtotal += itemTotal;

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product.name,
            description: item.product.description?.substring(0, 100) || '',
            images: item.product.imageUrl ? [item.product.imageUrl] : [],
            metadata: {
              productId: item.productId.toString(),
              sku: item.product.sku || ''
            }
          },
          unit_amount: Math.round(currentPrice * 100), // Convert to cents
        },
        quantity: item.quantity,
      });
    }

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const hasImported = cart.items.some(item => item.product?.isImported);

    // Calculate shipping and tax server-side
    const shipping = calculateShipping(address.state, subtotal, totalItems, hasImported);
    const shippingCost = shipping.cost;
    const tax = calculateTax(address.state, subtotal);
    const total = subtotal + shippingCost + tax;

    // Add shipping as a line item
    if (shippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Shipping',
            description: `Shipping to ${address.state}`,
          },
          unit_amount: Math.round(shippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Add tax as a line item
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Tax',
            description: `Sales tax for ${address.state}`,
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    // Create Stripe Checkout Session with idempotency key
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout?cancelled=true`,
      customer_email: req.user.email,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        addressId: addressId.toString(),
        cartId: cart.id.toString(),
        subtotal: subtotal.toFixed(2),
        shipping: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        idempotencyKey // Store for verification
      }
    }, {
      idempotencyKey: idempotencyKey // Stripe-level idempotency
    });

    const result = {
      success: true,
      sessionId: session.id,
      url: session.url
    };

    // Cache result for idempotency
    storeIdempotency(idempotencyKey, result);

    logger.info('Checkout session created', {
      userId,
      sessionId: session.id,
      total,
      itemCount: cart.items.length
    });

    res.json(result);

  } catch (error) {
    logger.logError('createCheckoutSession', error, { userId: req.user?.userId });
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session. Please try again.'
    });
  }
};

// Stripe Webhook Handler
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed', { error: err.message });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      await handleSuccessfulPayment(event.data.object);
      break;

    case 'payment_intent.payment_failed':
      await handleFailedPayment(event.data.object);
      break;

    default:
      logger.debug('Unhandled webhook event type', { type: event.type });
  }

  res.json({ received: true });
};

// Handle Successful Payment - with idempotency and transactions
const handleSuccessfulPayment = async (session) => {
  const transaction = await sequelize.transaction();

  try {
    logger.info('Webhook received: checkout.session.completed', {
      sessionId: session.id,
      amount: session.amount_total / 100
    });

    // IDEMPOTENCY: Check if order already exists for this session
    const existingOrder = await Order.findOne({
      where: { stripeSessionId: session.id },
      transaction
    });

    if (existingOrder) {
      logger.info('Order already exists for session (idempotent)', {
        sessionId: session.id,
        orderId: existingOrder.id
      });
      await transaction.commit();
      return;
    }

    const { userId, addressId, cartId, subtotal, shipping, tax, total } = session.metadata;

    // Get cart items with CURRENT database prices
    const cart = await Cart.findOne({
      where: { id: cartId },
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

    if (!cart || !cart.items || cart.items.length === 0) {
      logger.warn('Cart not found or empty for webhook', { sessionId: session.id, cartId });
      await transaction.commit();
      return;
    }

    // Get address
    const address = await Address.findByPk(addressId, { transaction });

    if (!address) {
      logger.error('Address not found for webhook', { addressId });
      await transaction.rollback();
      return;
    }

    // Reserve stock for all items (with locking to prevent overselling)
    const stockReservations = [];
    for (const item of cart.items) {
      const reservation = await StockService.reserveStock(
        item.productId,
        item.quantity,
        transaction
      );
      if (!reservation.success) {
        logger.error('Stock reservation failed during payment', {
          productId: item.productId,
          quantity: item.quantity,
          message: reservation.message
        });
        await transaction.rollback();
        // Note: Payment already processed - would need manual refund
        return;
      }
      stockReservations.push(reservation);
    }

    // Generate unique order number
    const lastOrder = await Order.findOne({
      order: [['id', 'DESC']],
      attributes: ['id'],
      transaction
    });
    const nextId = lastOrder ? lastOrder.id + 1 : 1;
    const orderNumber = `TH-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

    // Create order
    const order = await Order.create({
      orderNumber,
      userId: parseInt(userId),
      addressId: parseInt(addressId),
      subtotal: parseFloat(subtotal),
      shippingCost: parseFloat(shipping),
      taxAmount: parseFloat(tax),
      totalAmount: parseFloat(total),
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      shippingAddress: JSON.stringify({
        fullName: address.fullName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        phoneNumber: address.phoneNumber
      })
    }, { transaction });

    // Create order items using CURRENT database prices
    for (const item of cart.items) {
      const currentPrice = parseFloat(item.product.price);
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: currentPrice,
        productName: item.product.name,
        productSku: item.product.sku,
        productImage: item.product.imageUrl,
        totalPrice: currentPrice * item.quantity
      }, { transaction });
    }

    // Clear the cart
    await CartItem.destroy({ where: { cartId: cart.id }, transaction });

    await transaction.commit();

    logger.info('Order created from webhook', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.totalAmount
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('handleSuccessfulPayment', error, { sessionId: session.id });
  }
};

// Handle Failed Payment
const handleFailedPayment = async (paymentIntent) => {
  logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });
  // TODO: Send failure notification email
};

// Verify Payment Session (called from frontend after redirect)
// This is a backup order creation in case webhook didn't fire
const verifySession = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if payment was successful
    const isTestMode = session.id.startsWith('cs_test_');
    const isPaymentSuccessful = session.payment_status === 'paid' ||
                                 (isTestMode && session.payment_status === 'unpaid' && session.status === 'complete');

    if (!isPaymentSuccessful) {
      await transaction.rollback();
      return res.json({
        success: false,
        message: 'Payment was not completed',
        session: {
          id: session.id,
          paymentStatus: session.payment_status,
          status: session.status,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total / 100
        },
        order: null
      });
    }

    logger.info('Payment verified', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      isTestMode
    });

    // IDEMPOTENCY: Find existing order first
    let order = await Order.findOne({
      where: { stripeSessionId: sessionId },
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
      transaction
    });

    // If order already exists, return it (idempotent)
    if (order) {
      await transaction.commit();
      logger.info('Returning existing order (idempotent)', { orderId: order.id });
      return res.json({
        success: true,
        session: {
          id: session.id,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total / 100
        },
        order: order
      });
    }

    // Order doesn't exist - create it (backup for webhook)
    const { userId, addressId, cartId, subtotal, shipping, tax, total } = session.metadata;

    // Get address
    const address = await Address.findByPk(addressId, { transaction });
    if (!address) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Get cart with CURRENT database prices
    const cart = await Cart.findOne({
      where: { id: parseInt(cartId) },
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

    // Generate unique order number
    const lastOrder = await Order.findOne({
      order: [['id', 'DESC']],
      attributes: ['id'],
      transaction
    });
    const nextId = lastOrder ? lastOrder.id + 1 : 1;
    const orderNumber = `TH-${new Date().getFullYear()}-${String(nextId).padStart(5, '0')}`;

    // Create order
    order = await Order.create({
      orderNumber,
      userId: parseInt(userId),
      addressId: parseInt(addressId),
      subtotal: parseFloat(subtotal),
      shippingCost: parseFloat(shipping),
      taxAmount: parseFloat(tax),
      totalAmount: parseFloat(total),
      status: 'pending',
      paymentStatus: 'paid',
      paymentMethod: 'card',
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent,
      shippingAddress: JSON.stringify({
        fullName: address.fullName,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        phoneNumber: address.phoneNumber
      })
    }, { transaction });

    if (cart && cart.items && cart.items.length > 0) {
      // Reserve stock and create order items using CURRENT database prices
      for (const item of cart.items) {
        // Reserve stock
        const reservation = await StockService.reserveStock(
          item.productId,
          item.quantity,
          transaction
        );

        if (!reservation.success) {
          await transaction.rollback();
          logger.warn('Stock reservation failed in verifySession', {
            productId: item.productId,
            message: reservation.message
          });
          // Order already paid - return partial success
          return res.json({
            success: true,
            message: 'Order created but some items may be out of stock',
            session: {
              id: session.id,
              paymentStatus: session.payment_status,
              customerEmail: session.customer_email,
              amountTotal: session.amount_total / 100
            },
            order: null
          });
        }

        // Use CURRENT database price
        const currentPrice = parseFloat(item.product.price);
        await OrderItem.create({
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtPurchase: currentPrice,
          productName: item.product.name,
          productSku: item.product.sku,
          totalPrice: currentPrice * item.quantity
        }, { transaction });
      }

      // Clear the cart
      await CartItem.destroy({ where: { cartId: parseInt(cartId) }, transaction });
    }

    await transaction.commit();

    // Reload order with associations
    await order.reload({
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

    logger.info('Order created via verifySession', { orderId: order.id, orderNumber });

    res.json({
      success: true,
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_email,
        amountTotal: session.amount_total / 100
      },
      order: order
    });

  } catch (error) {
    await transaction.rollback();
    logger.logError('verifySession', error, { sessionId: req.params.sessionId });
    res.status(500).json({
      success: false,
      message: 'Failed to verify session. Please contact support.'
    });
  }
};

// Request Refund - with idempotency
const requestRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    // Find the order
    const order = await Order.findOne({
      where: {
        id: orderId,
        userId: userId
      },
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // IDEMPOTENCY: Already refunded
    if (order.paymentStatus === 'refunded') {
      return res.json({
        success: true,
        message: 'Order has already been refunded',
        refund: { status: 'already_refunded' }
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only paid orders can be refunded'
      });
    }

    // Create Stripe refund with idempotency key
    const idempotencyKey = `refund-${orderId}-${userId}`;
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        orderId: order.id.toString(),
        reason: reason || 'Customer requested refund'
      }
    }, {
      idempotencyKey
    });

    // Update order status
    await order.update({
      paymentStatus: 'refunded',
      status: 'refunded',
      adminNotes: `Refund requested: ${reason || 'No reason provided'}\nRefund ID: ${refund.id}`
    });

    // Release reserved stock
    for (const item of order.items) {
      await StockService.releaseReservedStock(item.productId, item.quantity);
    }

    logger.info('Refund processed', {
      orderId: order.id,
      refundId: refund.id,
      amount: refund.amount / 100
    });

    res.json({
      success: true,
      message: 'Refund has been processed',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });

  } catch (error) {
    logger.logError('requestRefund', error, { orderId: req.params.orderId });
    res.status(500).json({
      success: false,
      message: 'Failed to process refund. Please contact support.'
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  verifySession,
  requestRefund
};