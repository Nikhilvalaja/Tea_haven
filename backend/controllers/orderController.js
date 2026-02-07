// ============================================
// ORDER CONTROLLER - HTTP Request Handlers
// ============================================

const OrderService = require('../services/OrderService');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');

// Create order from cart (checkout)
const createOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { addressId, customerNotes } = req.body;

  const result = await OrderService.createFromCart(userId, addressId, customerNotes);

  if (!result.success) {
    const statusCode = result.message.includes('not found') ? 404 : 400;
    return errorResponse(res, result.message, statusCode);
  }

  successResponse(res, result.order, 'Order created successfully', 201);
});

// Get user's orders
const getOrders = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { status, limit = 20, offset = 0 } = req.query;

  const result = await OrderService.getUserOrders(userId, { status, limit, offset });

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
});

// Get single order
const getOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const order = await OrderService.getOrderById(id, userId);

  if (!order) {
    return errorResponse(res, 'Order not found', 404);
  }

  successResponse(res, order);
});

// Cancel order (only if pending)
const cancelOrder = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { id } = req.params;

  const result = await OrderService.cancelOrder(id, userId);

  if (!result.success) {
    const statusCode = result.message.includes('not found') ? 404 : 400;
    return errorResponse(res, result.message, statusCode);
  }

  successResponse(res, result.order, 'Order cancelled successfully');
});

// Admin: Get all orders
const getAllOrders = asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;

  // Use date range method without dates
  const result = await OrderService.getByDateRange({ status, limit, page: 1 });

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
});

// Admin: Update order status
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, adminNotes } = req.body;

  const result = await OrderService.updateStatus(id, { status, trackingNumber, adminNotes });

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, result.order, 'Order updated successfully');
});

// Admin: Get order stats for dashboard
const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await OrderService.getStats();

  res.json({
    success: true,
    stats
  });
});

// Admin: Get orders by date range for reporting/auditing
const getOrdersByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, page = 1, limit = 50 } = req.query;

  const result = await OrderService.getByDateRange({ startDate, endDate, status, page, limit });

  res.json({
    success: true,
    data: result.orders,
    summary: result.summary,
    pagination: result.pagination
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
  getOrdersByDateRange
};
