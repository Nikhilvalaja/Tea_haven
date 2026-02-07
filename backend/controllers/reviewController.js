// ============================================
// REVIEW CONTROLLER - HTTP Request Handlers
// ============================================

const ReviewService = require('../services/ReviewService');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');

// Get reviews for a product
const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page, limit, sortBy, sortOrder, rating, verifiedOnly } = req.query;

  const result = await ReviewService.getProductReviews(productId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'DESC',
    rating: rating ? parseInt(rating) : null,
    verifiedOnly: verifiedOnly === 'true'
  });

  successResponse(res, result);
});

// Create a review
const createReview = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  const { rating, title, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return errorResponse(res, 'Rating must be between 1 and 5', 400);
  }

  const result = await ReviewService.createReview(userId, productId, {
    rating,
    title,
    comment
  });

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  successResponse(res, { review: result.review }, result.message, 201);
});

// Update own review
const updateReview = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { reviewId } = req.params;
  const { rating, title, comment } = req.body;

  if (rating && (rating < 1 || rating > 5)) {
    return errorResponse(res, 'Rating must be between 1 and 5', 400);
  }

  const result = await ReviewService.updateReview(userId, reviewId, {
    rating,
    title,
    comment
  });

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, { review: result.review }, result.message);
});

// Delete own review
const deleteReview = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { reviewId } = req.params;

  const result = await ReviewService.deleteReview(userId, reviewId);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, null, result.message);
});

// Get user's own reviews
const getMyReviews = asyncHandler(async (req, res) => {
  const userId = req.user.userId;
  const { page, limit } = req.query;

  const result = await ReviewService.getUserReviews(userId, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10
  });

  successResponse(res, result);
});

// Mark a review as helpful
const markHelpful = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const result = await ReviewService.markHelpful(reviewId, req.user?.userId);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, { helpfulCount: result.helpfulCount });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get all reviews (admin)
const getAllReviews = asyncHandler(async (req, res) => {
  const { page, limit, status, sortBy, sortOrder } = req.query;

  const result = await ReviewService.getAllReviews({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 20,
    status: status || 'all',
    sortBy: sortBy || 'createdAt',
    sortOrder: sortOrder || 'DESC'
  });

  successResponse(res, result);
});

// Add admin response to review
const addAdminResponse = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;
  const { response } = req.body;

  if (!response || !response.trim()) {
    return errorResponse(res, 'Response is required', 400);
  }

  const result = await ReviewService.addAdminResponse(reviewId, response);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, { review: result.review }, result.message);
});

// Toggle review approval
const toggleApproval = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const result = await ReviewService.toggleApproval(reviewId);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, { isApproved: result.isApproved }, result.message);
});

// Admin delete review
const adminDeleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const result = await ReviewService.deleteReview(null, reviewId, true);

  if (!result.success) {
    return errorResponse(res, result.message, 404);
  }

  successResponse(res, null, result.message);
});

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getMyReviews,
  markHelpful,
  getAllReviews,
  addAdminResponse,
  toggleApproval,
  adminDeleteReview
};
