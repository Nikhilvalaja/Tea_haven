const express = require('express');
const productController = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middleware/auth');

const router = express.Router();

// Admin routes MUST come before /:id to avoid route conflicts
router.get('/admin/inventory/overview', verifyToken, isAdmin, productController.getInventoryOverview);
router.get('/admin/inventory/low-stock', verifyToken, isAdmin, productController.getLowStockAlerts);
router.get('/admin/barcode/:code', verifyToken, isAdmin, productController.findByBarcode);
router.patch('/admin/inventory/:id/stock', verifyToken, isAdmin, productController.updateStock);

// Public routes
router.get('/', productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productController.getProductById);

// Admin product management
router.post('/', verifyToken, isAdmin, productController.createProduct);
router.put('/:id', verifyToken, isAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, isAdmin, productController.deleteProduct);

module.exports = router;
