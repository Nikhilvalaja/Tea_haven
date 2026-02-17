// ============================================
// PRODUCTS API INTEGRATION TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const path = require('path');

// Load test env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

const { sequelize } = require('../../config/database');
const Product = require('../../models/Product');
const { createTestProduct, generateAdminToken } = require('../helpers/testUtils');

let app;

beforeAll(async () => {
  app = express();
  app.use(express.json());

  // Mock Redis
  jest.mock('../../config/redis', () => ({
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
    ping: jest.fn().mockResolvedValue('PONG'),
    connect: jest.fn().mockResolvedValue(),
    quit: jest.fn().mockResolvedValue(),
    on: jest.fn()
  }));

  const productRoutes = require('../../routes/productRoutes');
  const { notFoundHandler, globalErrorHandler } = require('../../middleware/errorHandler');

  app.use('/api/products', productRoutes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  await sequelize.authenticate();
  await sequelize.sync({ force: true });

  // Seed test products
  await Product.bulkCreate([
    createTestProduct({ name: 'Green Tea Classic', category: 'green_tea', price: 15.99 }),
    createTestProduct({ name: 'Black Tea Bold', category: 'black_tea', price: 12.99 }),
    createTestProduct({ name: 'Herbal Chamomile', category: 'herbal_tea', price: 9.99 }),
    createTestProduct({ name: 'Inactive Tea', isActive: false, category: 'green_tea', price: 8.99 })
  ]);
});

afterAll(async () => {
  await sequelize.close();
});

describe('GET /api/products', () => {
  test('returns active products', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(3); // excludes inactive
    expect(res.body.count).toBe(3);
  });

  test('filters by category', async () => {
    const res = await request(app).get('/api/products?category=green_tea');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].category).toBe('green_tea');
  });

  test('searches by name', async () => {
    const res = await request(app).get('/api/products?search=Chamomile');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toContain('Chamomile');
  });

  test('filters by price range', async () => {
    const res = await request(app).get('/api/products?minPrice=10&maxPrice=20');

    expect(res.status).toBe(200);
    res.body.data.forEach(product => {
      expect(parseFloat(product.price)).toBeGreaterThanOrEqual(10);
      expect(parseFloat(product.price)).toBeLessThanOrEqual(20);
    });
  });
});

describe('GET /api/products/:id', () => {
  test('returns a product by ID', async () => {
    const products = await Product.findAll({ where: { isActive: true }, limit: 1 });
    const productId = products[0].id;

    const res = await request(app).get(`/api/products/${productId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(productId);
  });

  test('returns 404 for non-existent product', async () => {
    const res = await request(app).get('/api/products/99999');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('returns 404 for inactive product', async () => {
    const inactive = await Product.findOne({ where: { isActive: false } });

    const res = await request(app).get(`/api/products/${inactive.id}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/products/categories', () => {
  test('returns distinct active categories', async () => {
    const res = await request(app).get('/api/products/categories');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
