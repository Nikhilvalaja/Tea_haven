const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { authValidation } = require('../middleware/validation');

const router = express.Router();

// Auth routes with centralized validation
router.post('/register', authValidation.register, authController.register);
router.post('/login', authValidation.login, authController.login);
router.post('/logout', verifyToken, authController.logout);
router.get('/me', verifyToken, authController.getCurrentUser);
router.get('/sessions', verifyToken, authController.getMySessions);
router.post('/sessions/invalidate-others', verifyToken, authController.invalidateOtherSessions);

// Password management
router.post('/forgot-password', authValidation.forgotPassword, authController.forgotPassword);
router.post('/reset-password', authValidation.resetPassword, authController.resetPassword);
router.put('/update-password', verifyToken, authValidation.updatePassword, authController.updatePassword);

// Email verification
router.post('/verify-email/request', verifyToken, authController.requestEmailVerification);
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
