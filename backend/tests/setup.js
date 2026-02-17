// ============================================
// TEST SETUP
// ============================================

const path = require('path');

// Load test environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

// Suppress console output during tests
if (process.env.NODE_ENV === 'test') {
  global.console.log = jest.fn();
  global.console.warn = jest.fn();
  global.console.error = jest.fn();
}
