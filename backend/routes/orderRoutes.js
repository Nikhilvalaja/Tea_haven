const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { orderValidation, queryValidation } = require('../middleware/validation');
const {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
  getOrdersByDateRange
} = require('../controllers/orderController');

// Admin routes (MUST come before parameterized routes)
router.get('/admin/stats', verifyToken, isAdmin, getOrderStats);
router.get('/admin/all', verifyToken, isAdmin, queryValidation.pagination, getAllOrders);
router.get('/admin/by-date', verifyToken, isAdmin, queryValidation.dateRange, getOrdersByDateRange);
router.patch('/admin/:id/status', verifyToken, isAdmin, orderValidation.updateStatus, updateOrderStatus);

// Customer routes (require authentication)
router.post('/', verifyToken, orderValidation.create, createOrder);
router.get('/', verifyToken, queryValidation.pagination, getOrders);
router.get('/:id', verifyToken, orderValidation.getById, getOrder);
router.patch('/:id/cancel', verifyToken, orderValidation.getById, cancelOrder);

module.exports = router;
