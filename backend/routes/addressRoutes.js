const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} = require('../controllers/addressController');

// All address routes require authentication
router.use(verifyToken);

// Get all addresses
router.get('/', getAddresses);

// Get single address
router.get('/:id', getAddress);

// Create new address (validation temporarily disabled for debugging)
router.post('/', createAddress);

// Update address
router.put('/:id', updateAddress);

// Delete address
router.delete('/:id', deleteAddress);

// Set default address
router.patch('/:id/default', setDefaultAddress);

module.exports = router;
