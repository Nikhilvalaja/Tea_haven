// ============================================
// AUTH CONTROLLER - HTTP Request Handlers
// ============================================

const AuthService = require('../services/AuthService');
const EmailService = require('../services/EmailService');
const { User, UserSession } = require('../models');
const { asyncHandler, successResponse, errorResponse } = require('../middleware/errorHandler');

// Register new user
const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  // Validate input
  if (!email || !password || !firstName || !lastName) {
    return errorResponse(res, 'All fields are required', 400);
  }

  const result = await AuthService.register({ email, password, firstName, lastName }, req);

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  successResponse(res, {
    user: result.user,
    token: result.token
  }, 'User registered successfully', 201);
});

// Login user
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorResponse(res, 'Email and password are required', 400);
  }

  const result = await AuthService.login(email, password, req);

  if (!result.success) {
    const statusCode = result.suspended ? 403 : 401;
    return errorResponse(res, result.message, statusCode);
  }

  successResponse(res, {
    user: result.user,
    token: result.token
  }, 'Login successful');
});

// Logout user
const logout = asyncHandler(async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await AuthService.logout(token, req);
  }

  successResponse(res, null, 'Logged out successfully');
});

// Get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findByPk(req.user.userId || req.user.id, {
    attributes: { exclude: ['password', 'passwordResetToken', 'emailVerificationToken'] }
  });

  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  // Update session last activity
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    await UserSession.update(
      { lastActivityAt: new Date() },
      { where: { sessionToken: token, status: 'active' } }
    );
  }

  successResponse(res, user);
});

// Get my sessions
const getMySessions = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const sessions = await AuthService.getUserSessions(userId);

  res.json({ success: true, sessions });
});

// Invalidate all other sessions (security feature)
const invalidateOtherSessions = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const currentToken = req.headers['authorization'].split(' ')[1];

  await AuthService.invalidateOtherSessions(userId, currentToken);

  successResponse(res, null, 'All other sessions have been logged out');
});

// Forgot password - request reset
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return errorResponse(res, 'Email is required', 400);
  }

  const result = await AuthService.generatePasswordResetToken(email);

  // If no token, the email doesn't exist in our database
  if (!result.token) {
    return errorResponse(res, 'No account found with this email address', 404);
  }

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Send password reset email
  const emailResult = await EmailService.sendPasswordResetEmail(email, result.token, baseUrl);

  if (emailResult.success) {
    console.log('Password reset email sent to:', email);
    successResponse(res, null, 'Password reset link has been sent to your email');
  } else {
    console.log('Email send failed:', emailResult.message);
    return errorResponse(res, 'Failed to send email. Please try again later.', 500);
  }
});

// Reset password with token
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return errorResponse(res, 'Token and new password are required', 400);
  }

  if (password.length < 6) {
    return errorResponse(res, 'Password must be at least 6 characters', 400);
  }

  const result = await AuthService.resetPassword(token, password);

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  successResponse(res, null, 'Password reset successful. Please login with your new password.');
});

// Request email verification
const requestEmailVerification = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;

  const result = await AuthService.generateEmailVerificationToken(userId);

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  // TODO: Integrate email service
  if (process.env.NODE_ENV === 'development') {
    console.log('Email verification token:', result.token);
    console.log('Verification link: http://localhost:3000/verify-email/' + result.token);
  }

  successResponse(res, null, 'Verification email sent');
});

// Verify email with token
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.params;

  if (!token) {
    return errorResponse(res, 'Verification token is required', 400);
  }

  const result = await AuthService.verifyEmail(token);

  if (!result.success) {
    return errorResponse(res, result.message, 400);
  }

  successResponse(res, null, 'Email verified successfully');
});

// Update password (while logged in)
const updatePassword = asyncHandler(async (req, res) => {
  const userId = req.user.userId || req.user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return errorResponse(res, 'Current and new password are required', 400);
  }

  if (newPassword.length < 6) {
    return errorResponse(res, 'New password must be at least 6 characters', 400);
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const isValid = await AuthService.verifyPassword(currentPassword, user.password);
  if (!isValid) {
    return errorResponse(res, 'Current password is incorrect', 400);
  }

  const hashedPassword = await AuthService.hashPassword(newPassword);
  await user.update({ password: hashedPassword });

  successResponse(res, null, 'Password updated successfully');
});

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getMySessions,
  invalidateOtherSessions,
  forgotPassword,
  resetPassword,
  requestEmailVerification,
  verifyEmail,
  updatePassword
};
