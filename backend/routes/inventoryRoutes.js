const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const { inventoryValidation, queryValidation } = require('../middleware/validation');
const {
  addStock,
  adjustStock,
  recordDamage,
  getInventory,
  getInventoryLog,
  getDashboard,
  getSalesAnalytics,
  getStockMovementReport,
  getProductStockHistory,
  getInventoryStats,
  checkStock
} = require('../controllers/inventoryController');

// ============================================
// PUBLIC ROUTES (for frontend stock checks)
// ============================================

// Check stock availability (for cart validation)
router.post('/check-stock', checkStock);

// ============================================
// ADMIN ROUTES (require authentication + admin role)
// ============================================

// Dashboard & Analytics
router.get('/stats', verifyToken, isAdmin, getInventoryStats);
router.get('/dashboard', verifyToken, isAdmin, getDashboard);
router.get('/analytics/sales', verifyToken, isAdmin, queryValidation.dateRange, getSalesAnalytics);
router.get('/analytics/movements', verifyToken, isAdmin, queryValidation.dateRange, getStockMovementReport);

// Inventory management
router.get('/', verifyToken, isAdmin, queryValidation.pagination, getInventory);
router.get('/log', verifyToken, isAdmin, queryValidation.pagination, getInventoryLog);
router.get('/product/:id/history', verifyToken, isAdmin, getProductStockHistory);

// Stock operations
router.post('/add-stock', verifyToken, isAdmin, inventoryValidation.addStock, addStock);
router.post('/adjust-stock', verifyToken, isAdmin, inventoryValidation.adjustStock, adjustStock);
router.post('/record-damage', verifyToken, isAdmin, inventoryValidation.recordDamage, recordDamage);

module.exports = router;
