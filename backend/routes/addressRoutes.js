const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { verifyToken } = require('../middleware/auth');
const { addressValidation, validate } = require('../middleware/validation');
const {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

// ID param validation for reuse
const idParam = [
  param('id').isInt({ min: 1 }).withMessage('Invalid address ID').toInt(),
  validate
];

// All address routes require authentication
router.use(verifyToken);

// Get all addresses
router.get('/', getAddresses);

// Get single address
router.get('/:id', idParam, getAddress);

// Create new address
router.post('/', addressValidation.create, createAddress);

// Update address
router.put('/:id', addressValidation.update, updateAddress);

// Delete address
router.delete('/:id', idParam, deleteAddress);

// Set default address
router.patch('/:id/default', idParam, setDefaultAddress);

module.exports = router;
