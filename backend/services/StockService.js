// ============================================
// STOCK SERVICE - Inventory Management with Locking
// ============================================
// Uses row-level locking (SELECT FOR UPDATE) to prevent overselling
// All stock operations are atomic and race-condition safe

const { Product, InventoryLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { logger } = require('../utils/logger');

class StockService {
  // ============================================
  // LOCKING UTILITIES
  // ============================================

  /**
   * Get product with row-level lock (FOR UPDATE)
   * Prevents race conditions during stock operations
   * @param {number} productId
   * @param {Object} transaction - Required transaction
   * @returns {Object} product or null
   */
  static async getProductWithLock(productId, transaction) {
    if (!transaction) {
      throw new Error('Transaction required for locking');
    }

    return await Product.findByPk(productId, {
      transaction,
      lock: transaction.LOCK.UPDATE // SELECT FOR UPDATE
    });
  }

  /**
   * Get multiple products with row-level locks
   * @param {Array} productIds
   * @param {Object} transaction
   * @returns {Array} products
   */
  static async getProductsWithLock(productIds, transaction) {
    if (!transaction) {
      throw new Error('Transaction required for locking');
    }

    return await Product.findAll({
      where: { id: productIds },
      transaction,
      lock: transaction.LOCK.UPDATE
    });
  }

  // ============================================
  // STOCK AVAILABILITY CHECKS
  // ============================================

  /**
   * Check if product has sufficient available stock (no lock)
   * Use this for display purposes only, not for reservations
   */
  static async checkAvailability(productId, quantity) {
    const product = await Product.findByPk(productId);

    if (!product) {
      return { available: false, message: 'Product not found' };
    }

    if (!product.isActive) {
      return { available: false, product, message: `Product "${product.name}" is no longer available` };
    }

    const availableStock = product.stockQuantity - (product.reservedStock || 0);

    if (availableStock < quantity) {
      return {
        available: false,
        product,
        availableStock,
        message: `Insufficient stock for "${product.name}". Only ${availableStock} available.`
      };
    }

    return { available: true, product, availableStock };
  }

  /**
   * Check availability for multiple products (cart check)
   * @param {Array} items - [{ productId, quantity }]
   * @returns {Object} { allAvailable, unavailableItems }
   */
  static async checkMultipleAvailability(items) {
    const productIds = items.map(i => i.productId);
    const products = await Product.findAll({
      where: { id: productIds }
    });

    const productMap = new Map(products.map(p => [p.id, p]));
    const unavailableItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        unavailableItems.push({
          productId: item.productId,
          reason: 'Product not found'
        });
        continue;
      }

      if (!product.isActive) {
        unavailableItems.push({
          productId: item.productId,
          productName: product.name,
          reason: 'Product is no longer available'
        });
        continue;
      }

      const availableStock = product.stockQuantity - (product.reservedStock || 0);
      if (availableStock < item.quantity) {
        unavailableItems.push({
          productId: item.productId,
          productName: product.name,
          requested: item.quantity,
          available: availableStock,
          reason: `Only ${availableStock} available`
        });
      }
    }

    return {
      allAvailable: unavailableItems.length === 0,
      unavailableItems
    };
  }

  // ============================================
  // ATOMIC STOCK RESERVATION (WITH LOCKING)
  // ============================================

  /**
   * Reserve stock atomically with row-level locking
   * Prevents overselling via SELECT FOR UPDATE
   * @param {number} productId
   * @param {number} quantity
   * @param {Object} existingTransaction - Optional existing transaction
   * @returns {Object} { success, product, message }
   */
  static async reserveStock(productId, quantity, existingTransaction = null) {
    const shouldCommit = !existingTransaction;
    const transaction = existingTransaction || await sequelize.transaction();

    try {
      // Lock the row to prevent concurrent access
      const product = await this.getProductWithLock(productId, transaction);

      if (!product) {
        if (shouldCommit) await transaction.rollback();
        return { success: false, message: 'Product not found' };
      }

      if (!product.isActive) {
        if (shouldCommit) await transaction.rollback();
        return { success: false, message: 'Product is no longer available' };
      }

      const availableStock = product.stockQuantity - (product.reservedStock || 0);

      if (availableStock < quantity) {
        if (shouldCommit) await transaction.rollback();
        return {
          success: false,
          message: `Insufficient stock. Only ${availableStock} available.`,
          availableStock
        };
      }

      // Reserve the stock
      product.reservedStock = (product.reservedStock || 0) + quantity;
      await product.save({ transaction });

      if (shouldCommit) await transaction.commit();

      logger.info('Stock reserved', {
        productId,
        quantity,
        newReserved: product.reservedStock,
        available: product.stockQuantity - product.reservedStock
      });

      return { success: true, product };

    } catch (error) {
      if (shouldCommit) await transaction.rollback();
      logger.logError('StockService.reserveStock', error, { productId, quantity });
      throw error;
    }
  }

  /**
   * Reserve stock for multiple products atomically
   * All-or-nothing: if any fails, all are rolled back
   * @param {Array} items - [{ productId, quantity }]
   * @returns {Object} { success, failedItems, message }
   */
  static async reserveMultipleStock(items) {
    const transaction = await sequelize.transaction();

    try {
      const productIds = items.map(i => i.productId);

      // Lock all products at once
      const products = await this.getProductsWithLock(productIds, transaction);
      const productMap = new Map(products.map(p => [p.id, p]));

      const failedItems = [];

      // Validate all items first
      for (const item of items) {
        const product = productMap.get(item.productId);

        if (!product) {
          failedItems.push({ productId: item.productId, reason: 'Product not found' });
          continue;
        }

        if (!product.isActive) {
          failedItems.push({ productId: item.productId, productName: product.name, reason: 'Product unavailable' });
          continue;
        }

        const availableStock = product.stockQuantity - (product.reservedStock || 0);
        if (availableStock < item.quantity) {
          failedItems.push({
            productId: item.productId,
            productName: product.name,
            requested: item.quantity,
            available: availableStock,
            reason: `Only ${availableStock} available`
          });
        }
      }

      // If any failed, rollback
      if (failedItems.length > 0) {
        await transaction.rollback();
        return { success: false, failedItems, message: 'Some items have insufficient stock' };
      }

      // Reserve all
      for (const item of items) {
        const product = productMap.get(item.productId);
        product.reservedStock = (product.reservedStock || 0) + item.quantity;
        await product.save({ transaction });
      }

      await transaction.commit();

      logger.info('Multiple stock reserved', { itemCount: items.length });

      return { success: true };

    } catch (error) {
      await transaction.rollback();
      logger.logError('StockService.reserveMultipleStock', error);
      throw error;
    }
  }

  /**
   * Release reserved stock (order cancelled/failed)
   */
  static async releaseReservedStock(productId, quantity, existingTransaction = null) {
    const shouldCommit = !existingTransaction;
    const transaction = existingTransaction || await sequelize.transaction();

    try {
      const product = await this.getProductWithLock(productId, transaction);

      if (!product) {
        if (shouldCommit) await transaction.rollback();
        return { success: false, message: 'Product not found' };
      }

      product.reservedStock = Math.max(0, (product.reservedStock || 0) - quantity);
      await product.save({ transaction });

      if (shouldCommit) await transaction.commit();

      logger.info('Stock released', { productId, quantity, newReserved: product.reservedStock });

      return { success: true, product };

    } catch (error) {
      if (shouldCommit) await transaction.rollback();
      logger.logError('StockService.releaseReservedStock', error);
      throw error;
    }
  }

  /**
   * Release reserved stock for multiple products
   */
  static async releaseMultipleStock(items) {
    const transaction = await sequelize.transaction();

    try {
      const productIds = items.map(i => i.productId);
      const products = await this.getProductsWithLock(productIds, transaction);
      const productMap = new Map(products.map(p => [p.id, p]));

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (product) {
          product.reservedStock = Math.max(0, (product.reservedStock || 0) - item.quantity);
          await product.save({ transaction });
        }
      }

      await transaction.commit();
      return { success: true };

    } catch (error) {
      await transaction.rollback();
      logger.logError('StockService.releaseMultipleStock', error);
      throw error;
    }
  }

  // ============================================
  // STOCK DEDUCTION (ORDER CONFIRMED/SHIPPED)
  // ============================================

  /**
   * Deduct stock (finalize sale - reduces both stock and reserved)
   */
  static async deductStock(productId, quantity, existingTransaction = null) {
    const shouldCommit = !existingTransaction;
    const transaction = existingTransaction || await sequelize.transaction();

    try {
      const product = await this.getProductWithLock(productId, transaction);

      if (!product) {
        if (shouldCommit) await transaction.rollback();
        return { success: false, message: 'Product not found' };
      }

      const previousStock = product.stockQuantity;

      // Reduce both stock quantity and reserved stock
      product.stockQuantity = Math.max(0, product.stockQuantity - quantity);
      product.reservedStock = Math.max(0, (product.reservedStock || 0) - quantity);
      await product.save({ transaction });

      // Log the deduction
      await InventoryLog.create({
        productId,
        action: 'sale_out',
        quantityChange: -quantity,
        previousStock,
        newStock: product.stockQuantity,
        reason: 'Order fulfilled'
      }, { transaction });

      if (shouldCommit) await transaction.commit();

      logger.business('Stock deducted', {
        productId,
        quantity,
        previousStock,
        newStock: product.stockQuantity
      });

      return { success: true, product };

    } catch (error) {
      if (shouldCommit) await transaction.rollback();
      logger.logError('StockService.deductStock', error);
      throw error;
    }
  }

  // ============================================
  // STOCK ADDITION (RESTOCK)
  // ============================================

  /**
   * Add stock (restock/delivery)
   */
  static async addStock(productId, quantity, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const product = await this.getProductWithLock(productId, transaction);

      if (!product) {
        await transaction.rollback();
        return { success: false, message: 'Product not found' };
      }

      // Validate quantity
      if (quantity <= 0) {
        await transaction.rollback();
        return { success: false, message: 'Quantity must be positive' };
      }

      const previousStock = product.stockQuantity;
      product.stockQuantity += quantity;
      await product.save({ transaction });

      // Create inventory log
      const log = await InventoryLog.create({
        productId,
        action: 'stock_in',
        quantityChange: quantity,
        previousStock,
        newStock: product.stockQuantity,
        reason: options.reason || 'Stock addition',
        userId: options.userId,
        referenceNumber: options.referenceNumber,
        unitCost: options.unitCost,
        totalValue: options.unitCost ? options.unitCost * quantity : null
      }, { transaction });

      await transaction.commit();

      logger.business('Stock added', {
        productId,
        quantity,
        previousStock,
        newStock: product.stockQuantity
      });

      return { success: true, product, log };

    } catch (error) {
      await transaction.rollback();
      logger.logError('StockService.addStock', error);
      throw error;
    }
  }

  /**
   * Adjust stock (manual correction)
   */
  static async adjustStock(productId, newQuantity, options = {}) {
    const transaction = await sequelize.transaction();

    try {
      const product = await this.getProductWithLock(productId, transaction);

      if (!product) {
        await transaction.rollback();
        return { success: false, message: 'Product not found' };
      }

      // Validate quantity
      if (newQuantity < 0) {
        await transaction.rollback();
        return { success: false, message: 'Stock quantity cannot be negative' };
      }

      const previousStock = product.stockQuantity;
      const quantityChange = newQuantity - previousStock;

      product.stockQuantity = newQuantity;

      // Ensure reserved doesn't exceed new stock
      if (product.reservedStock > newQuantity) {
        product.reservedStock = newQuantity;
      }

      await product.save({ transaction });

      // Create inventory log
      const log = await InventoryLog.create({
        productId,
        action: quantityChange >= 0 ? 'adjustment_in' : 'adjustment_out',
        quantityChange: Math.abs(quantityChange),
        previousStock,
        newStock: newQuantity,
        reason: options.reason || 'Manual adjustment',
        userId: options.userId
      }, { transaction });

      await transaction.commit();

      logger.business('Stock adjusted', {
        productId,
        previousStock,
        newStock: newQuantity,
        change: quantityChange
      });

      return { success: true, product, log };

    } catch (error) {
      await transaction.rollback();
      logger.logError('StockService.adjustStock', error);
      throw error;
    }
  }

  // ============================================
  // STOCK STATUS UTILITIES
  // ============================================

  /**
   * Get stock status for a product
   */
  static getStockStatus(product) {
    const availableStock = product.stockQuantity - (product.reservedStock || 0);
    const reorderLevel = product.reorderLevel || 10;

    let status;
    if (availableStock <= 0) {
      status = 'out_of_stock';
    } else if (availableStock <= 5) {
      status = 'low_stock';
    } else {
      status = 'in_stock';
    }

    return {
      status,
      stockQuantity: product.stockQuantity,
      reservedStock: product.reservedStock || 0,
      availableStock,
      needsReorder: product.stockQuantity <= reorderLevel
    };
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(threshold = 5) {
    return await Product.findAll({
      where: {
        isActive: true,
        stockQuantity: { [Op.lte]: threshold }
      },
      order: [['stockQuantity', 'ASC']]
    });
  }

  /**
   * Get products needing reorder
   */
  static async getProductsNeedingReorder() {
    return await Product.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          sequelize.where(
            sequelize.col('stock_quantity'),
            Op.lte,
            sequelize.col('reorder_level')
          )
        ]
      },
      order: [['stockQuantity', 'ASC']]
    });
  }
}

module.exports = StockService;
