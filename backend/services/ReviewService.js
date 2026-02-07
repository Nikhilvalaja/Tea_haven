// ============================================
// REVIEW SERVICE - Product Reviews Business Logic
// ============================================

const { Review, Product, User, Order, OrderItem } = require('../models');
const { Op } = require('sequelize');

class ReviewService {
  // Check if user has purchased the product
  static async hasUserPurchasedProduct(userId, productId) {
    const order = await Order.findOne({
      where: {
        userId,
        status: 'delivered'
      },
      include: [{
        model: OrderItem,
        as: 'items',
        where: { productId },
        required: true
      }]
    });
    return !!order;
  }

  // Check if user already reviewed this product
  static async hasUserReviewed(userId, productId) {
    const review = await Review.findOne({
      where: { userId, productId }
    });
    return !!review;
  }

  // Create a new review
  static async createReview(userId, productId, reviewData) {
    // Check if product exists
    const product = await Product.findByPk(productId);
    if (!product) {
      return { success: false, message: 'Product not found' };
    }

    // Check if user already reviewed
    const existingReview = await this.hasUserReviewed(userId, productId);
    if (existingReview) {
      return { success: false, message: 'You have already reviewed this product' };
    }

    // Check if verified purchase
    const isVerifiedPurchase = await this.hasUserPurchasedProduct(userId, productId);

    // Find the order if verified purchase
    let orderId = null;
    if (isVerifiedPurchase) {
      const order = await Order.findOne({
        where: {
          userId,
          status: 'delivered'
        },
        include: [{
          model: OrderItem,
          as: 'items',
          where: { productId },
          required: true
        }],
        order: [['createdAt', 'DESC']]
      });
      orderId = order?.id;
    }

    const review = await Review.create({
      userId,
      productId,
      orderId,
      rating: reviewData.rating,
      title: reviewData.title,
      comment: reviewData.comment,
      isVerifiedPurchase,
      isApproved: true // Auto-approve, can change to false for moderation
    });

    // Update product average rating
    await this.updateProductRating(productId);

    return {
      success: true,
      review,
      message: 'Review submitted successfully'
    };
  }

  // Update a review
  static async updateReview(userId, reviewId, updateData) {
    const review = await Review.findOne({
      where: { id: reviewId, userId }
    });

    if (!review) {
      return { success: false, message: 'Review not found or unauthorized' };
    }

    await review.update({
      rating: updateData.rating ?? review.rating,
      title: updateData.title ?? review.title,
      comment: updateData.comment ?? review.comment
    });

    // Update product average rating
    await this.updateProductRating(review.productId);

    return {
      success: true,
      review,
      message: 'Review updated successfully'
    };
  }

  // Delete a review
  static async deleteReview(userId, reviewId, isAdmin = false) {
    const whereClause = isAdmin ? { id: reviewId } : { id: reviewId, userId };
    const review = await Review.findOne({ where: whereClause });

    if (!review) {
      return { success: false, message: 'Review not found or unauthorized' };
    }

    const productId = review.productId;
    await review.destroy();

    // Update product average rating
    await this.updateProductRating(productId);

    return { success: true, message: 'Review deleted successfully' };
  }

  // Get reviews for a product
  static async getProductReviews(productId, options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      rating = null,
      verifiedOnly = false
    } = options;

    const whereClause = {
      productId,
      isApproved: true
    };

    if (rating) {
      whereClause.rating = rating;
    }

    if (verifiedOnly) {
      whereClause.isVerifiedPurchase = true;
    }

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where: whereClause,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [[sortBy, sortOrder]],
      limit,
      offset: (page - 1) * limit
    });

    // Get rating distribution
    const ratingDistribution = await this.getRatingDistribution(productId);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      ratingDistribution
    };
  }

  // Get rating distribution for a product
  static async getRatingDistribution(productId) {
    const reviews = await Review.findAll({
      where: { productId, isApproved: true },
      attributes: ['rating']
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => {
      distribution[r.rating]++;
    });

    return distribution;
  }

  // Update product's average rating
  static async updateProductRating(productId) {
    const result = await Review.findAll({
      where: { productId, isApproved: true },
      attributes: [
        [Review.sequelize.fn('AVG', Review.sequelize.col('rating')), 'avgRating'],
        [Review.sequelize.fn('COUNT', Review.sequelize.col('id')), 'reviewCount']
      ],
      raw: true
    });

    const avgRating = parseFloat(result[0]?.avgRating) || 0;
    const reviewCount = parseInt(result[0]?.reviewCount) || 0;

    await Product.update(
      {
        averageRating: Math.round(avgRating * 10) / 10,
        reviewCount
      },
      { where: { id: productId } }
    );

    return { avgRating, reviewCount };
  }

  // Get user's reviews
  static async getUserReviews(userId, options = {}) {
    const { page = 1, limit = 10 } = options;

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where: { userId },
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'imageUrl']
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Mark review as helpful
  static async markHelpful(reviewId, userId) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return { success: false, message: 'Review not found' };
    }

    // In a real app, you'd track which users marked helpful to prevent duplicates
    await review.increment('helpfulCount');

    return { success: true, helpfulCount: review.helpfulCount + 1 };
  }

  // Admin: Add response to review
  static async addAdminResponse(reviewId, response) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return { success: false, message: 'Review not found' };
    }

    await review.update({
      adminResponse: response,
      adminResponseAt: new Date()
    });

    return { success: true, review, message: 'Response added successfully' };
  }

  // Admin: Toggle review approval
  static async toggleApproval(reviewId) {
    const review = await Review.findByPk(reviewId);
    if (!review) {
      return { success: false, message: 'Review not found' };
    }

    await review.update({ isApproved: !review.isApproved });

    // Update product rating
    await this.updateProductRating(review.productId);

    return {
      success: true,
      isApproved: review.isApproved,
      message: review.isApproved ? 'Review approved' : 'Review hidden'
    };
  }

  // Admin: Get all reviews for moderation
  static async getAllReviews(options = {}) {
    const {
      page = 1,
      limit = 20,
      status = 'all', // all, approved, pending
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = options;

    const whereClause = {};
    if (status === 'approved') {
      whereClause.isApproved = true;
    } else if (status === 'pending') {
      whereClause.isApproved = false;
    }

    const { rows: reviews, count: total } = await Review.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'name', 'imageUrl']
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset: (page - 1) * limit
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}

module.exports = ReviewService;
