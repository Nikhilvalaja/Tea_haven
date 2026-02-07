// ============================================
// CART SERVICE - Business Logic Layer
// ============================================

const { Cart, CartItem, Product } = require('../models');

class CartService {
  /**
   * Calculate cart totals (subtotal, item count)
   * @param {Array} items - Cart items with priceAtAdd and quantity
   * @returns {Object} { subtotal, totalItems }
   */
  static calculateTotals(items) {
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.priceAtAdd) * item.quantity);
    }, 0);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalItems
    };
  }

  /**
   * Get or create cart for user
   * @param {number} userId
   * @returns {Object} cart with items
   */
  static async getOrCreateCart(userId) {
    let cart = await Cart.findOne({
      where: { userId },
      include: [{
        model: CartItem,
        as: 'items',
        include: [{
          model: Product,
          as: 'product'
        }]
      }]
    });

    if (!cart) {
      cart = await Cart.create({ userId });
      cart.items = [];
    }

    return cart;
  }

  /**
   * Get cart with calculated totals
   * @param {number} userId
   * @returns {Object} { cart, subtotal, totalItems }
   */
  static async getCartWithTotals(userId) {
    const cart = await this.getOrCreateCart(userId);
    const totals = this.calculateTotals(cart.items);

    return {
      cart,
      ...totals
    };
  }

  /**
   * Check product stock availability
   * @param {Object} product
   * @param {number} requestedQuantity
   * @returns {Object} { available: boolean, availableStock: number, message?: string }
   */
  static checkStockAvailability(product, requestedQuantity) {
    const availableStock = product.stockQuantity - (product.reservedStock || 0);

    if (availableStock < requestedQuantity) {
      return {
        available: false,
        availableStock,
        message: `Only ${availableStock} items available in stock`
      };
    }

    return { available: true, availableStock };
  }

  /**
   * Add item to cart
   * @param {number} userId
   * @param {number} productId
   * @param {number} quantity
   * @returns {Object} { success, cart, totals, message }
   */
  static async addItem(userId, productId, quantity = 1) {
    // Validate product
    const product = await Product.findOne({
      where: { id: productId, isActive: true }
    });

    if (!product) {
      return { success: false, message: 'Product not found or inactive' };
    }

    // Check stock
    const stockCheck = this.checkStockAvailability(product, quantity);
    if (!stockCheck.available) {
      return { success: false, message: stockCheck.message };
    }

    // Get or create cart
    let cart = await Cart.findOne({ where: { userId } });
    if (!cart) {
      cart = await Cart.create({ userId });
    }

    // Check existing item
    let cartItem = await CartItem.findOne({
      where: { cartId: cart.id, productId }
    });

    if (cartItem) {
      const newQuantity = cartItem.quantity + quantity;
      const newStockCheck = this.checkStockAvailability(product, newQuantity);

      if (!newStockCheck.available) {
        return { success: false, message: newStockCheck.message };
      }

      cartItem.quantity = newQuantity;
      await cartItem.save();
    } else {
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId,
        quantity,
        priceAtAdd: product.price
      });
    }

    // Return updated cart
    const updatedCart = await this.getCartWithTotals(userId);
    return {
      success: true,
      message: 'Item added to cart',
      ...updatedCart
    };
  }

  /**
   * Update cart item quantity
   * @param {number} userId
   * @param {number} itemId
   * @param {number} quantity
   * @returns {Object} { success, cart, totals, message }
   */
  static async updateItemQuantity(userId, itemId, quantity) {
    if (quantity < 1) {
      return { success: false, message: 'Quantity must be at least 1' };
    }

    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [
        { model: Cart, as: 'cart', where: { userId } },
        { model: Product, as: 'product' }
      ]
    });

    if (!cartItem) {
      return { success: false, message: 'Cart item not found' };
    }

    const stockCheck = this.checkStockAvailability(cartItem.product, quantity);
    if (!stockCheck.available) {
      return { success: false, message: stockCheck.message };
    }

    cartItem.quantity = quantity;
    await cartItem.save();

    const updatedCart = await this.getCartWithTotals(userId);
    return {
      success: true,
      message: 'Cart updated',
      ...updatedCart
    };
  }

  /**
   * Remove item from cart
   * @param {number} userId
   * @param {number} itemId
   * @returns {Object} { success, cart, totals, message }
   */
  static async removeItem(userId, itemId) {
    const cartItem = await CartItem.findOne({
      where: { id: itemId },
      include: [{ model: Cart, as: 'cart', where: { userId } }]
    });

    if (!cartItem) {
      return { success: false, message: 'Cart item not found' };
    }

    await cartItem.destroy();

    const updatedCart = await this.getCartWithTotals(userId);
    return {
      success: true,
      message: 'Item removed from cart',
      ...updatedCart
    };
  }

  /**
   * Clear all items from cart
   * @param {number} userId
   * @returns {Object} { success, message }
   */
  static async clearCart(userId) {
    const cart = await Cart.findOne({ where: { userId } });

    if (cart) {
      await CartItem.destroy({ where: { cartId: cart.id } });
    }

    return { success: true, message: 'Cart cleared' };
  }
}

module.exports = CartService;
