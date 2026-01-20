// ============================================
// MODEL INDEX - CENTRAL MODEL EXPORT
// ============================================
// This file imports all models and sets up their associations.
// It provides a single place to import all models from.

const User = require('./User');
const Product = require('./Product');
const Cart = require('./Cart');
const CartItem = require('./CartItem');
const Address = require('./Address');
const Order = require('./Order');
const OrderItem = require('./OrderItem');

// ============================================
// MODEL ASSOCIATIONS
// ============================================

// User has many Carts (one active cart)
User.hasMany(Cart, {
  foreignKey: 'userId',
  as: 'carts',
  onDelete: 'CASCADE'
});
Cart.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Cart has many CartItems
Cart.hasMany(CartItem, {
  foreignKey: 'cartId',
  as: 'items',
  onDelete: 'CASCADE'
});
CartItem.belongsTo(Cart, {
  foreignKey: 'cartId',
  as: 'cart'
});

// CartItem belongs to Product
CartItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});
Product.hasMany(CartItem, {
  foreignKey: 'productId',
  as: 'cartItems'
});

// User has many Addresses
User.hasMany(Address, {
  foreignKey: 'userId',
  as: 'addresses',
  onDelete: 'CASCADE'
});
Address.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// User has many Orders
User.hasMany(Order, {
  foreignKey: 'userId',
  as: 'orders',
  onDelete: 'CASCADE'
});
Order.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Order has many OrderItems
Order.hasMany(OrderItem, {
  foreignKey: 'orderId',
  as: 'items',
  onDelete: 'CASCADE'
});
OrderItem.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

// OrderItem belongs to Product
OrderItem.belongsTo(Product, {
  foreignKey: 'productId',
  as: 'product'
});
Product.hasMany(OrderItem, {
  foreignKey: 'productId',
  as: 'orderItems'
});

// Order belongs to Address
Order.belongsTo(Address, {
  foreignKey: 'addressId',
  as: 'address'
});
Address.hasMany(Order, {
  foreignKey: 'addressId',
  as: 'orders'
});

// ============================================
// EXPORT ALL MODELS
// ============================================

module.exports = {
  User,
  Product,
  Cart,
  CartItem,
  Address,
  Order,
  OrderItem
};
