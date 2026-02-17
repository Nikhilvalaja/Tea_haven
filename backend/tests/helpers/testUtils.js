// ============================================
// TEST UTILITIES
// ============================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

/**
 * Generate a valid JWT token for testing
 */
const generateTestToken = (user = {}) => {
  const payload = {
    id: user.id || 1,
    userId: user.id || 1,
    email: user.email || 'test@example.com',
    role: user.role || 'customer'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

/**
 * Generate admin JWT token
 */
const generateAdminToken = (user = {}) => {
  return generateTestToken({
    id: user.id || 999,
    email: user.email || 'admin@teahaven.com',
    role: 'super_admin',
    ...user
  });
};

/**
 * Test user data factory
 */
const createTestUser = (overrides = {}) => ({
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  ...overrides
});

/**
 * Test product data factory
 */
const createTestProduct = (overrides = {}) => ({
  name: `Test Tea ${Date.now()}`,
  description: 'A delicious test tea',
  category: 'green_tea',
  price: 19.99,
  mrp: 24.99,
  teaType: 'loose_leaf',
  packetSize: '100g',
  packetSizeGrams: 100,
  originCountry: 'India',
  stockQuantity: 50,
  isActive: true,
  ...overrides
});

module.exports = {
  generateTestToken,
  generateAdminToken,
  createTestUser,
  createTestProduct
};
