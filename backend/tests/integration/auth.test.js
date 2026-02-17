// ============================================
// AUTH API INTEGRATION TESTS
// ============================================

const request = require('supertest');
const express = require('express');
const path = require('path');

// Load test env
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.test') });

const { sequelize } = require('../../config/database');
const { generateTestToken, createTestUser } = require('../helpers/testUtils');

let app;

beforeAll(async () => {
  // Build a minimal Express app with auth routes
  app = express();
  app.use(express.json());

  // Mock Redis for integration tests (avoid connection issues)
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

  const authRoutes = require('../../routes/authRoutes');
  const { notFoundHandler, globalErrorHandler } = require('../../middleware/errorHandler');

  app.use('/api/auth', authRoutes);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  // Connect to test DB and sync
  await sequelize.authenticate();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

describe('POST /api/auth/register', () => {
  test('registers a new user successfully', async () => {
    const user = createTestUser();

    const res = await request(app)
      .post('/api/auth/register')
      .send(user);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  test('rejects duplicate email', async () => {
    const user = createTestUser({ email: 'duplicate@test.com' });

    // First registration
    await request(app).post('/api/auth/register').send(user);

    // Second registration with same email
    const res = await request(app)
      .post('/api/auth/register')
      .send(user);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@test.com' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  const loginUser = createTestUser({ email: 'login@test.com' });

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(loginUser);
  });

  test('logs in with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginUser.email, password: loginUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  test('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: loginUser.email, password: 'WrongPassword123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  test('returns user with valid token', async () => {
    // Register and get token
    const user = createTestUser({ email: 'me@test.com' });
    const regRes = await request(app).post('/api/auth/register').send(user);
    const token = regRes.body.data.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(user.email);
  });

  test('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
