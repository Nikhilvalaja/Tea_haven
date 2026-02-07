// ============================================
// WISHLIST ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { verifyToken } = require('../middleware/auth');
const { body, param } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  next();
};

const productIdValidation = [
  body('productId')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
  validate
];

const productIdParamValidation = [
  param('productId')
    .isInt({ min: 1 })
    .withMessage('Invalid product ID')
    .toInt(),
  validate
];

// All routes require authentication
router.use(verifyToken);

// GET /api/wishlist - Get user's wishlist
router.get('/', wishlistController.getWishlist);

// POST /api/wishlist - Add product to wishlist
router.post('/', productIdValidation, wishlistController.addToWishlist);

// DELETE /api/wishlist/:productId - Remove product from wishlist
router.delete('/:productId', productIdParamValidation, wishlistController.removeFromWishlist);

// GET /api/wishlist/check/:productId - Check if product is in wishlist
router.get('/check/:productId', productIdParamValidation, wishlistController.checkWishlist);

// DELETE /api/wishlist - Clear entire wishlist
router.delete('/', wishlistController.clearWishlist);

// POST /api/wishlist/:productId/move-to-cart - Move item to cart
router.post('/:productId/move-to-cart', productIdParamValidation, wishlistController.moveToCart);

module.exports = router;
