// ============================================
// REVIEW ROUTES - Product Reviews API
// ============================================

const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { reviewValidation, queryValidation } = require('../middleware/validation');
const reviewController = require('../controllers/reviewController');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get reviews for a product (public)
router.get('/product/:productId', queryValidation.pagination, reviewController.getProductReviews);

// Mark review as helpful (optional auth)
router.post('/:reviewId/helpful', reviewController.markHelpful);

// ============================================
// AUTHENTICATED USER ROUTES
// ============================================

// Get user's own reviews
router.get('/my-reviews', verifyToken, queryValidation.pagination, reviewController.getMyReviews);

// Create a review for a product
router.post('/product/:productId', verifyToken, reviewValidation.create, reviewController.createReview);

// Update own review
router.put('/:reviewId', verifyToken, reviewValidation.update, reviewController.updateReview);

// Delete own review
router.delete('/:reviewId', verifyToken, reviewController.deleteReview);

// ============================================
// ADMIN ROUTES
// ============================================

// Get all reviews for moderation
router.get('/admin/all', verifyToken, isAdmin, queryValidation.pagination, reviewController.getAllReviews);

// Add admin response to review
router.post('/admin/:reviewId/response', verifyToken, isAdmin, reviewController.addAdminResponse);

// Toggle review approval
router.put('/admin/:reviewId/toggle-approval', verifyToken, isAdmin, reviewController.toggleApproval);

// Admin delete review
router.delete('/admin/:reviewId', verifyToken, isAdmin, reviewController.adminDeleteReview);

module.exports = router;
