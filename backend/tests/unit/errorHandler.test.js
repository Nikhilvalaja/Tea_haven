// ============================================
// ERROR HANDLER UNIT TESTS
// ============================================

const {
  ApiError,
  successResponse,
  errorResponse
} = require('../../middleware/errorHandler');

describe('ApiError', () => {
  test('creates error with status code and message', () => {
    const error = new ApiError(400, 'Bad request');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Bad request');
    expect(error.isOperational).toBe(true);
    expect(error.success).toBe(false);
    expect(error instanceof Error).toBe(true);
  });

  test('badRequest factory', () => {
    const error = ApiError.badRequest('Invalid input');
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Invalid input');
  });

  test('unauthorized factory', () => {
    const error = ApiError.unauthorized('Not authenticated');
    expect(error.statusCode).toBe(401);
    expect(error.message).toBe('Not authenticated');
  });

  test('forbidden factory', () => {
    const error = ApiError.forbidden();
    expect(error.statusCode).toBe(403);
  });

  test('notFound factory', () => {
    const error = ApiError.notFound('Product not found');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Product not found');
  });

  test('conflict factory', () => {
    const error = ApiError.conflict('Email already exists');
    expect(error.statusCode).toBe(409);
  });

  test('internal factory', () => {
    const error = ApiError.internal();
    expect(error.statusCode).toBe(500);
  });
});

describe('successResponse', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('sends success response with default values', () => {
    successResponse(res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Success'
      })
    );
  });

  test('sends success response with custom data and message', () => {
    successResponse(res, { id: 1 }, 'Created', 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Created',
        data: { id: 1 }
      })
    );
  });
});

describe('errorResponse', () => {
  let res;

  beforeEach(() => {
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  test('sends error response with default values', () => {
    errorResponse(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Error'
      })
    );
  });

  test('sends error with custom message and status', () => {
    errorResponse(res, 'Not found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: 'Not found'
      })
    );
  });
});
