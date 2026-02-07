const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { cartValidation } = require('../middleware/validation');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

// All cart routes require authentication
router.use(verifyToken);

// Get user's cart
router.get('/', getCart);

// Add item to cart
router.post('/items', cartValidation.addItem, addToCart);

// Update cart item quantity
router.put('/items/:itemId', cartValidation.updateItem, updateCartItem);

// Remove item from cart
router.delete('/items/:itemId', cartValidation.removeItem, removeFromCart);

// Clear entire cart
router.delete('/', clearCart);

module.exports = router;
