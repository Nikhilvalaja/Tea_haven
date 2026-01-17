const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

// Customer routes (require authentication)
router.post('/', verifyToken, createOrder);
router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);

// Admin routes
router.get('/admin/all', verifyToken, isAdmin, getAllOrders);
router.patch('/admin/:id/status', verifyToken, isAdmin, updateOrderStatus);

module.exports = router;
