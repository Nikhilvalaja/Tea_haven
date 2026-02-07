// ============================================
// WISHLIST MODEL - User Product Wishlists
// ============================================

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'product_id',
    references: {
      model: 'products',
      key: 'id'
    }
  }
}, {
  tableName: 'wishlists',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    // Prevent duplicate wishlist entries
    { unique: true, fields: ['user_id', 'product_id'] }
  ]
});

module.exports = Wishlist;
