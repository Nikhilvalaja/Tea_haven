const { Address } = require('../models');
const { body, validationResult } = require('express-validator');

// Get all addresses for user
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.userId;

    const addresses = await Address.findAll({
      where: { userId },
      order: [['isDefault', 'DESC'], ['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch addresses',
      error: error.message
    });
  }
};

// Get single address
const getAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch address',
      error: error.message
    });
  }
};

// Create new address
const createAddress = async (req, res) => {
  try {
    console.log('\n=== CREATE ADDRESS REQUEST ===');
    console.log('User from token:', req.user);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    const userId = req.user.userId;

    if (!userId) {
      console.error('❌ No userId found!');
      return res.status(400).json({
        success: false,
        message: 'User ID not found in token'
      });
    }

    console.log('✓ User ID:', userId);

    const {
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country = 'USA',
      latitude,
      longitude,
      placeId,
      isDefault = false,
      addressType = 'home'
    } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !addressLine1 || !city || !state || !zipCode) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
        missing: {
          fullName: !fullName,
          phoneNumber: !phoneNumber,
          addressLine1: !addressLine1,
          city: !city,
          state: !state,
          zipCode: !zipCode
        }
      });
    }

    console.log('✓ All required fields present');

    // If this is set as default, unset other defaults
    if (isDefault) {
      console.log('Setting as default, unsetting other defaults...');
      await Address.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    console.log('Creating address with data:', {
      userId,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2: addressLine2 || '(none)',
      city,
      state,
      zipCode,
      country,
      latitude: latitude || '(none)',
      longitude: longitude || '(none)',
      placeId: placeId || '(none)',
      isDefault,
      addressType
    });

    const address = await Address.create({
      userId,
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      placeId,
      isDefault,
      addressType
    });

    console.log('✅ Address created successfully!', address.id);
    console.log('=== END ===\n');

    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    console.error('\n❌ CREATE ADDRESS ERROR:');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===\n');

    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message,
      errorType: error.name
    });
  }
};

// Update address
const updateAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    const {
      fullName,
      phoneNumber,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      placeId,
      isDefault,
      addressType
    } = req.body;

    // If this is set as default, unset other defaults
    if (isDefault && !address.isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId } }
      );
    }

    await address.update({
      fullName: fullName || address.fullName,
      phoneNumber: phoneNumber || address.phoneNumber,
      addressLine1: addressLine1 || address.addressLine1,
      addressLine2: addressLine2 !== undefined ? addressLine2 : address.addressLine2,
      city: city || address.city,
      state: state || address.state,
      zipCode: zipCode || address.zipCode,
      country: country || address.country,
      latitude: latitude !== undefined ? latitude : address.latitude,
      longitude: longitude !== undefined ? longitude : address.longitude,
      placeId: placeId !== undefined ? placeId : address.placeId,
      isDefault: isDefault !== undefined ? isDefault : address.isDefault,
      addressType: addressType || address.addressType
    });

    res.json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
};

// Delete address
const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    await address.destroy();

    res.json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
};

// Set default address
const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const address = await Address.findOne({
      where: { id, userId }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    // Unset all other defaults
    await Address.update(
      { isDefault: false },
      { where: { userId } }
    );

    // Set this as default
    address.isDefault = true;
    await address.save();

    res.json({
      success: true,
      message: 'Default address updated',
      data: address
    });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
};

// Validation rules
const addressValidationRules = () => {
  return [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('addressLine1').trim().notEmpty().withMessage('Address line 1 is required'),
    body('city').trim().notEmpty().withMessage('City is required'),
    body('state').trim().notEmpty().withMessage('State is required'),
    body('zipCode').trim().notEmpty().withMessage('ZIP code is required')
  ];
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  addressValidationRules,
  validate
};
