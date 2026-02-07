// ============================================
// SERVICES INDEX - Export all services
// ============================================

const AuthService = require('./AuthService');
const CartService = require('./CartService');
const OrderService = require('./OrderService');
const StockService = require('./StockService');
const ReviewService = require('./ReviewService');

module.exports = {
  AuthService,
  CartService,
  OrderService,
  StockService,
  ReviewService
};
