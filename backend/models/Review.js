// ============================================
// REVIEW MODEL - Product Reviews & Ratings
// ============================================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Review = sequelize.define('Review', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'order_id',
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isVerifiedPurchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified_purchase'
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_approved'
  },
  helpfulCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'helpful_count'
  },
  // Admin response to review
  adminResponse: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'admin_response'
  },
  adminResponseAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'admin_response_at'
  }
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['product_id'] },
    { fields: ['user_id'] },
    { fields: ['rating'] },
    { fields: ['is_approved'] },
    { fields: ['created_at'] },
    // Prevent duplicate reviews per user per product
    { unique: true, fields: ['product_id', 'user_id'] }
  ]
});

module.exports = Review;
