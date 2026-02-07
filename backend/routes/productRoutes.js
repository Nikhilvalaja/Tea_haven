const express = require('express');
const productController = require('../controllers/productController');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { productValidation, queryValidation } = require('../middleware/validation');

const router = express.Router();

// Admin routes MUST come before /:id to avoid route conflicts
router.get('/admin/all', verifyToken, isAdmin, queryValidation.pagination, productController.getAllProductsAdmin);
router.get('/admin/enums', verifyToken, isAdmin, productController.getProductEnums);
router.get('/admin/inventory/overview', verifyToken, isAdmin, productController.getInventoryOverview);
router.get('/admin/inventory/low-stock', verifyToken, isAdmin, productController.getLowStockAlerts);
router.get('/admin/inventory/alerts', verifyToken, isAdmin, productController.getStockAlerts);
router.get('/admin/barcode/:code', verifyToken, isAdmin, productController.findByBarcode);
router.get('/admin/:id/edit', verifyToken, isAdmin, productController.getProductForEdit);
router.patch('/admin/inventory/:id/stock', verifyToken, isAdmin, productController.updateStock);
router.post('/admin/inventory/:id/add-stock', verifyToken, isAdmin, productController.addStock);
router.post('/admin/inventory/:id/remove-stock', verifyToken, isAdmin, productController.removeStock);
router.patch('/admin/:id/toggle-status', verifyToken, isAdmin, productController.toggleProductStatus);

// Public routes
router.get('/', queryValidation.pagination, productController.getAllProducts);
router.get('/categories', productController.getCategories);
router.get('/:id', productValidation.getById, productController.getProductById);

// Admin product management (CRUD)
router.post('/admin', verifyToken, isAdmin, productController.createProduct);
router.put('/admin/:id', verifyToken, isAdmin, productController.updateProduct);
router.delete('/admin/:id', verifyToken, isAdmin, productValidation.getById, productController.deleteProduct);

module.exports = router;
