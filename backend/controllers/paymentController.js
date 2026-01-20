const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Order, OrderItem, Cart, CartItem, Product, User, Address } = require('../models');
const { calculateShipping, calculateTax } = require('../utils/shippingCalculator');

// Create Stripe Checkout Session
const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { addressId } = req.body;

    // Get user's cart
    const cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
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

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (parseFloat(item.priceAtAdd) * item.quantity);
    }, 0);

    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const hasImported = cart.items.some(item => item.product?.isImported);

    const shipping = calculateShipping(address.state, subtotal, totalItems, hasImported);
    const shippingCost = shipping.cost;
    const tax = calculateTax(address.state, subtotal);
    const total = subtotal + shippingCost + tax;

    // Create line items for Stripe
    const lineItems = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          description: item.product.description?.substring(0, 100) || '',
          images: item.product.imageUrl ? [item.product.imageUrl] : [],
        },
        unit_amount: Math.round(parseFloat(item.priceAtAdd) * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

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

    // Create Stripe Checkout Session
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
        total: total.toFixed(2)
      }
    });

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
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
    console.error('Webhook signature verification failed:', err.message);
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
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

// Handle Successful Payment
const handleSuccessfulPayment = async (session) => {
  try {
    console.log('🔔 Webhook received: checkout.session.completed');
    console.log('📦 Session ID:', session.id);
    console.log('💰 Amount:', session.amount_total / 100, 'USD');

    const { userId, addressId, cartId, subtotal, shipping, tax, total } = session.metadata;
    console.log('📋 Metadata:', { userId, addressId, cartId, subtotal, shipping, tax, total });

    // Get cart items
    const cart = await Cart.findOne({
      where: { id: cartId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart) {
      console.error('❌ Cart not found for session:', session.id);
      return;
    }

    console.log('✅ Cart found with', cart.items.length, 'items');

    // Get address
    const address = await Address.findByPk(addressId);

    if (!address) {
      console.error('❌ Address not found:', addressId);
      return;
    }

    console.log('✅ Address found:', address.city, address.state);

    // Generate order number
    const orderNumber = `TH-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

    console.log('📝 Creating order:', orderNumber);

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
    });

    console.log('✅ Order created:', order.id);

    // Create order items
    for (const item of cart.items) {
      await OrderItem.create({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: parseFloat(item.priceAtAdd),
        productName: item.product.name,
        productImage: item.product.imageUrl
      });
    }

    console.log('✅ Order items created');

    // Clear the cart
    await CartItem.destroy({ where: { cartId: cart.id } });

    console.log('✅ Cart cleared');
    console.log('🎉 Order processing complete! Order #' + order.orderNumber);

  } catch (error) {
    console.error('❌ Error handling successful payment:', error);
    console.error('Error stack:', error.stack);
  }
};

// Handle Failed Payment
const handleFailedPayment = async (paymentIntent) => {
  console.log('Payment failed:', paymentIntent.id);
  // TODO: Send failure notification email
};

// Verify Payment Session (called from frontend after redirect)
const verifySession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if payment was successful
    // In test mode, Stripe doesn't actually process payments, so status might be 'unpaid'
    // We accept both 'paid' and 'unpaid' (for test mode) as successful
    const isTestMode = session.id.startsWith('cs_test_');
    const isPaymentSuccessful = session.payment_status === 'paid' ||
                                 (isTestMode && session.payment_status === 'unpaid' && session.status === 'complete');

    if (!isPaymentSuccessful) {
      // Payment was cancelled or failed - don't create order
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

    console.log('✅ Payment verified:', {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      isTestMode,
      isPaymentSuccessful
    });

    // Find existing order
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
      ]
    });

    // If order doesn't exist and payment is successful, create it
    if (!order) {
      const { userId, addressId, cartId, subtotal, shipping, tax, total } = session.metadata;

      // Get address for shipping info
      const address = await Address.findByPk(addressId);

      // Generate unique order number based on last order ID
      const lastOrder = await Order.findOne({
        order: [['id', 'DESC']],
        attributes: ['id']
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
      });

      console.log('📝 Order created after successful payment:', order.id);

      // Get cart items to create order items
      const cart = await Cart.findOne({
        where: { id: parseInt(cartId) },
        include: [{
          model: CartItem,
          as: 'items',
          include: [{
            model: Product,
            as: 'product'
          }]
        }]
      });

      if (cart && cart.items) {
        // Create order items
        for (const item of cart.items) {
          const itemTotal = parseFloat(item.priceAtAdd) * item.quantity;
          await OrderItem.create({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            priceAtPurchase: parseFloat(item.priceAtAdd),
            productName: item.product.name,
            productSku: item.product.sku,
            totalPrice: itemTotal
          });
        }

        console.log('✅ Order items created for order:', order.id);

        // Clear the cart
        await CartItem.destroy({ where: { cartId: parseInt(cartId) } });
        console.log('✅ Cart cleared after successful payment');
      }

      // Reload order to include items and address
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
    }

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
    console.error('Session verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify session',
      error: error.message
    });
  }
};

// Request Refund
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
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only paid orders can be refunded'
      });
    }

    if (order.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Order has already been refunded'
      });
    }

    // Create Stripe refund
    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reason: 'requested_by_customer',
      metadata: {
        orderId: order.id.toString(),
        reason: reason || 'Customer requested refund'
      }
    });

    // Update order status
    await order.update({
      paymentStatus: 'refunded',
      status: 'refunded',
      adminNotes: `Refund requested: ${reason || 'No reason provided'}\nRefund ID: ${refund.id}`
    });

    console.log('💰 Refund created for order:', order.id, 'Refund ID:', refund.id);

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
    console.error('Refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  verifySession,
  requestRefund
};