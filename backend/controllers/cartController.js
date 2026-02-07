// ============================================
// CART CONTROLLER - HTTP Request Handlers
// ============================================

const CartService = require('../services/CartService');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');

// Get user's cart with all items
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await CartService.getCartWithTotals(userId);

  successResponse(res, {
    cart: result.cart,
    subtotal: result.subtotal.toFixed(2),
    totalItems: result.totalItems
  });
});

// Add item to cart
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { productId, quantity = 1 } = req.body;

  const result = await CartService.addItem(userId, productId, quantity);

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  successResponse(res, {
    cart: result.cart,
    subtotal: result.subtotal.toFixed(2),
    totalItems: result.totalItems
  }, result.message);
});

// Update cart item quantity
const updateCartItem = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { itemId } = req.params;
  const { quantity } = req.body;

  const result = await CartService.updateItemQuantity(userId, itemId, quantity);

  if (!result.success) {
    return errorResponse(res, result.message, result.message.includes('not found') ? 404 : 400);
  }

  successResponse(res, {
    cart: result.cart,
    subtotal: result.subtotal.toFixed(2),
    totalItems: result.totalItems
  }, result.message);
});

// Remove item from cart
const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { itemId } = req.params;

  const result = await CartService.removeItem(userId, itemId);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, {
    cart: result.cart,
    subtotal: result.subtotal.toFixed(2),
    totalItems: result.totalItems
  }, result.message);
});

// Clear entire cart
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const result = await CartService.clearCart(userId);

  successResponse(res, { items: [] }, result.message);
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
