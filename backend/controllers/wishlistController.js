// ============================================
// WISHLIST CONTROLLER - Wishlist Management
// ============================================

const { Wishlist, Product } = require('../models');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');

// Get user's wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;

  const wishlistItems = await Wishlist.findAll({
    where: { userId },
    include: [{
      model: Product,
      as: 'product',
      attributes: ['id', 'name', 'price', 'imageUrl', 'stockQuantity', 'isActive', 'category', 'averageRating', 'reviewCount']
    }],
    order: [['created_at', 'DESC']]
  });

  // Filter out items where product was deleted or deactivated
  const activeItems = wishlistItems.filter(item => item.product && item.product.isActive);

  successResponse(res, {
    items: activeItems,
    count: activeItems.length
  });
});

// Add product to wishlist
const addToWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { productId } = req.body;

  // Check if product exists and is active
  const product = await Product.findOne({
    where: { id: productId, isActive: true }
  });

  if (!product) {
    return errorResponse(res, 'Product not found or unavailable', 404);
  }

  // Check if already in wishlist
  const existing = await Wishlist.findOne({
    where: { userId, productId }
  });

  if (existing) {
    return errorResponse(res, 'Product already in wishlist', 409);
  }

  // Add to wishlist
  const wishlistItem = await Wishlist.create({
    userId,
    productId
  });

  // Return with product details
  const itemWithProduct = await Wishlist.findByPk(wishlistItem.id, {
    include: [{
      model: Product,
      as: 'product',
      attributes: ['id', 'name', 'price', 'imageUrl', 'stockQuantity', 'category']
    }]
  });

  successResponse(res, itemWithProduct, 'Product added to wishlist', 201);
});

// Remove product from wishlist
const removeFromWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { productId } = req.params;

  const wishlistItem = await Wishlist.findOne({
    where: { userId, productId }
  });

  if (!wishlistItem) {
    return errorResponse(res, 'Product not in wishlist', 404);
  }

  await wishlistItem.destroy();

  successResponse(res, null, 'Product removed from wishlist');
});

// Check if product is in wishlist
const checkWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { productId } = req.params;

  const wishlistItem = await Wishlist.findOne({
    where: { userId, productId }
  });

  successResponse(res, {
    inWishlist: !!wishlistItem
  });
});

// Clear entire wishlist
const clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;

  const deleted = await Wishlist.destroy({
    where: { userId }
  });

  successResponse(res, { removed: deleted }, 'Wishlist cleared');
});

// Move wishlist item to cart
const moveToCart = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { productId } = req.params;

  // Check if in wishlist
  const wishlistItem = await Wishlist.findOne({
    where: { userId, productId },
    include: [{ model: Product, as: 'product' }]
  });

  if (!wishlistItem) {
    return errorResponse(res, 'Product not in wishlist', 404);
  }

  if (!wishlistItem.product || !wishlistItem.product.isActive) {
    return errorResponse(res, 'Product no longer available', 400);
  }

  if (wishlistItem.product.stockQuantity < 1) {
    return errorResponse(res, 'Product out of stock', 400);
  }

  // Note: Cart addition logic would be handled by cart controller
  // This endpoint just returns the product info for the frontend to add to cart

  successResponse(res, {
    product: wishlistItem.product,
    message: 'Ready to add to cart'
  });
});

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
  clearWishlist,
  moveToCart
};
