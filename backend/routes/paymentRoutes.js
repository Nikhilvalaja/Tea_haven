const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  createCheckoutSession,
  handleWebhook,
  verifySession,
  requestRefund
} = require('../controllers/paymentController');

// Create Stripe Checkout Session
router.post('/create-checkout-session', verifyToken, createCheckoutSession);

// Stripe Webhook (NO auth middleware - Stripe calls this)
// Webhook needs raw body for signature verification
router.post('/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// Verify payment session after redirect
router.get('/verify-session/:sessionId', verifyToken, verifySession);

// Request refund for an order
router.post('/refund/:orderId', verifyToken, requestRefund);

module.exports = router;