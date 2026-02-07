// ============================================
// ADMIN ROUTES - USER & ROLE MANAGEMENT
// ============================================
// All routes require admin authentication

const express = require('express');
const router = express.Router();
const { param } = require('express-validator');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { adminValidation, queryValidation, validate } = require('../middleware/validation');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  getAdminActivityLog,
  getAdminProfile,
  getAdminDashboardStats,
  getUserStats,
  createStaffMember
} = require('../controllers/adminController');

// ID param validation
const userIdParam = [
  param('id').isInt({ min: 1 }).withMessage('Invalid user ID').toInt(),
  validate
];

// All routes require authentication and admin role
router.use(verifyToken);
router.use(isAdmin);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================

// Get user stats for dashboard (MUST be before /users/:id)
router.get('/users/stats', getUserStats);

// Get all users with pagination and filtering
router.get('/users', queryValidation.pagination, getAllUsers);

// Create new staff member (manager/admin/super_admin)
router.post('/users/create-staff', adminValidation.createStaff, createStaffMember);

// Get user by ID with details
router.get('/users/:id', userIdParam, getUserById);

// Update user role (promote/demote)
router.put('/users/:id/role', adminValidation.updateUserRole, updateUserRole);

// Suspend or activate user
router.put('/users/:id/status', adminValidation.toggleUserStatus, toggleUserStatus);

// ============================================
// ADMIN ACTIVITY & AUDIT ROUTES
// ============================================

// Get admin activity log
router.get('/activity-log', queryValidation.pagination, getAdminActivityLog);

// Get my admin profile with activity
router.get('/my-profile', getAdminProfile);

// Get admin dashboard stats
router.get('/dashboard-stats', getAdminDashboardStats);

module.exports = router;
