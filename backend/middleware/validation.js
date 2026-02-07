// ============================================
// INPUT VALIDATION MIDDLEWARE
// ============================================
// Centralized validation using express-validator
// Prevents wrong data entries and SQL injection

const { body, param, query, validationResult } = require('express-validator');

// ============================================
// VALIDATION RESULT HANDLER
// ============================================

/**
 * Check validation results and return errors if any
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }))
    });
  }
  next();
};

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Sanitize string input - trim and escape
 */
const sanitizeString = (field) => body(field).trim().escape();

/**
 * Sanitize and validate email
 */
const sanitizeEmail = (field = 'email') =>
  body(field)
    .trim()
    .toLowerCase()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail();

/**
 * Sanitize integer ID
 */
const sanitizeId = (field = 'id') =>
  param(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`)
    .toInt();

/**
 * Sanitize positive integer
 */
const sanitizePositiveInt = (field) =>
  body(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`)
    .toInt();

/**
 * Sanitize non-negative integer (0 or more)
 */
const sanitizeNonNegativeInt = (field) =>
  body(field)
    .isInt({ min: 0 })
    .withMessage(`${field} must be a non-negative integer`)
    .toInt();

/**
 * Sanitize decimal/price
 */
const sanitizePrice = (field) =>
  body(field)
    .isFloat({ min: 0 })
    .withMessage(`${field} must be a valid positive number`)
    .toFloat();

// ============================================
// AUTH VALIDATIONS
// ============================================

const authValidation = {
  register: [
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Please provide a valid email')
      .isLength({ max: 255 })
      .withMessage('Email is too long'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be 6-100 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 })
      .withMessage('First name is too long')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('First name contains invalid characters'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 })
      .withMessage('Last name is too long')
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage('Last name contains invalid characters'),
    validate
  ],

  login: [
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    validate
  ],

  forgotPassword: [
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Please provide a valid email'),
    validate
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required')
      .isLength({ min: 64, max: 64 })
      .withMessage('Invalid reset token'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be 6-100 characters'),
    validate
  ],

  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6, max: 100 })
      .withMessage('New password must be 6-100 characters'),
    validate
  ]
};

// ============================================
// PRODUCT VALIDATIONS
// ============================================

const productValidation = {
  create: [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Product name is required')
      .isLength({ max: 255 })
      .withMessage('Product name is too long'),
    body('price')
      .isFloat({ min: 0.01 })
      .withMessage('Price must be greater than 0')
      .toFloat(),
    body('stockQuantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be non-negative')
      .toInt(),
    body('category')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description is too long'),
    body('sku')
      .optional()
      .trim()
      .isLength({ max: 50 }),
    body('barcode')
      .optional()
      .trim()
      .isLength({ max: 50 }),
    validate
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Product name must be 1-255 characters'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Price must be greater than 0')
      .toFloat(),
    body('stockQuantity')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Stock quantity must be non-negative')
      .toInt(),
    validate
  ],

  getById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    validate
  ]
};

// ============================================
// CART VALIDATIONS
// ============================================

const cartValidation = {
  addItem: [
    body('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100')
      .toInt(),
    validate
  ],

  updateItem: [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Invalid item ID')
      .toInt(),
    body('quantity')
      .isInt({ min: 1, max: 100 })
      .withMessage('Quantity must be between 1 and 100')
      .toInt(),
    validate
  ],

  removeItem: [
    param('itemId')
      .isInt({ min: 1 })
      .withMessage('Invalid item ID')
      .toInt(),
    validate
  ]
};

// ============================================
// ORDER VALIDATIONS
// ============================================

const orderValidation = {
  create: [
    body('addressId')
      .isInt({ min: 1 })
      .withMessage('Invalid address ID')
      .toInt(),
    body('customerNotes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    validate
  ],

  getById: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid order ID')
      .toInt(),
    validate
  ],

  updateStatus: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid order ID')
      .toInt(),
    body('status')
      .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid order status'),
    body('trackingNumber')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('adminNotes')
      .optional()
      .trim()
      .isLength({ max: 1000 }),
    validate
  ]
};

// ============================================
// ADDRESS VALIDATIONS
// ============================================

const addressValidation = {
  create: [
    body('fullName')
      .trim()
      .notEmpty()
      .withMessage('Full name is required')
      .isLength({ max: 200 })
      .withMessage('Name is too long'),
    body('phoneNumber')
      .trim()
      .notEmpty()
      .withMessage('Phone number is required')
      .isLength({ max: 20 })
      .matches(/^[\d\s+()-]+$/)
      .withMessage('Invalid phone number format'),
    body('addressLine1')
      .trim()
      .notEmpty()
      .withMessage('Address is required')
      .isLength({ max: 255 }),
    body('addressLine2')
      .optional()
      .trim()
      .isLength({ max: 255 }),
    body('city')
      .trim()
      .notEmpty()
      .withMessage('City is required')
      .isLength({ max: 100 }),
    body('state')
      .trim()
      .notEmpty()
      .withMessage('State is required')
      .isLength({ max: 100 }),
    body('zipCode')
      .trim()
      .notEmpty()
      .withMessage('ZIP code is required')
      .isLength({ max: 20 }),
    body('country')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('isDefault')
      .optional()
      .isBoolean()
      .toBoolean(),
    validate
  ],

  update: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid address ID')
      .toInt(),
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 }),
    body('phoneNumber')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .matches(/^[\d\s+()-]+$/),
    body('addressLine1')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 }),
    body('city')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }),
    body('state')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 }),
    body('zipCode')
      .optional()
      .trim()
      .isLength({ min: 1, max: 20 }),
    validate
  ]
};

// ============================================
// INVENTORY VALIDATIONS
// ============================================

const inventoryValidation = {
  addStock: [
    body('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer')
      .toInt(),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    body('referenceNumber')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('unitCost')
      .optional()
      .isFloat({ min: 0 })
      .toFloat(),
    validate
  ],

  adjustStock: [
    body('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('quantity')
      .isInt()
      .withMessage('Quantity must be an integer')
      .toInt(),
    body('action')
      .optional()
      .isIn(['add', 'subtract', 'set'])
      .withMessage('Invalid action'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    validate
  ],

  recordDamage: [
    body('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer')
      .toInt(),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 }),
    validate
  ]
};

// ============================================
// REVIEW VALIDATIONS
// ============================================

const reviewValidation = {
  create: [
    param('productId')
      .isInt({ min: 1 })
      .withMessage('Invalid product ID')
      .toInt(),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Title is too long'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Comment is too long'),
    validate
  ],

  update: [
    param('reviewId')
      .isInt({ min: 1 })
      .withMessage('Invalid review ID')
      .toInt(),
    body('rating')
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be between 1 and 5')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .isLength({ max: 200 }),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 }),
    validate
  ]
};

// ============================================
// ADMIN VALIDATIONS
// ============================================

const adminValidation = {
  updateUserRole: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID')
      .toInt(),
    body('role')
      .isIn(['customer', 'manager', 'admin', 'super_admin'])
      .withMessage('Invalid role'),
    validate
  ],

  toggleUserStatus: [
    param('id')
      .isInt({ min: 1 })
      .withMessage('Invalid user ID')
      .toInt(),
    body('isActive')
      .isBoolean()
      .withMessage('isActive must be a boolean')
      .toBoolean(),
    validate
  ],

  createStaff: [
    body('email')
      .trim()
      .toLowerCase()
      .isEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6, max: 100 })
      .withMessage('Password must be 6-100 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 }),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 }),
    body('role')
      .isIn(['manager', 'admin', 'super_admin'])
      .withMessage('Invalid staff role'),
    validate
  ]
};

// ============================================
// COMMON QUERY VALIDATIONS
// ============================================

const queryValidation = {
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    validate
  ],

  dateRange: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid end date format'),
    validate
  ]
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  validate,
  sanitizeString,
  sanitizeEmail,
  sanitizeId,
  sanitizePositiveInt,
  sanitizeNonNegativeInt,
  sanitizePrice,
  authValidation,
  productValidation,
  cartValidation,
  orderValidation,
  addressValidation,
  inventoryValidation,
  reviewValidation,
  adminValidation,
  queryValidation
};
