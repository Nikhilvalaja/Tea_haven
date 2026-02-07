// ============================================
// ADMIN CONTROLLER - USER & ROLE MANAGEMENT
// ============================================
// Handles admin-only operations like user management,
// role assignments, and viewing admin activity logs.

const { User, AdminLog, UserSession, Order } = require('../models');
const { Op } = require('sequelize');

// ============================================
// HELPER: Log Admin Action
// ============================================
const logAdminAction = async (adminId, actionType, description, options = {}) => {
  try {
    await AdminLog.create({
      adminId,
      actionType,
      description,
      entityType: options.entityType || null,
      entityId: options.entityId || null,
      previousValue: options.previousValue || null,
      newValue: options.newValue || null,
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
      sessionId: options.sessionId || null
    });
  } catch (error) {
    console.error('Failed to log admin action:', error.message);
  }
};

// ============================================
// GET ALL USERS (Admin Only)
// ============================================
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, status } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (role) {
      where.role = role;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

// ============================================
// GET USER BY ID (Admin Only)
// ============================================
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: UserSession,
          as: 'sessions',
          limit: 10,
          order: [['loginAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user stats
    const orderCount = await Order.count({ where: { userId: id } });
    const totalSpent = await Order.sum('totalAmount', {
      where: { userId: id, status: { [Op.ne]: 'cancelled' } }
    });

    res.json({
      success: true,
      user,
      stats: {
        orderCount,
        totalSpent: totalSpent || 0
      }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
};

// ============================================
// UPDATE USER ROLE (Admin Only)
// ============================================
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    // Validate role
    const validRoles = ['customer', 'manager', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified'
      });
    }

    // Cannot change your own role
    if (parseInt(id) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Only super_admin can create other super_admins
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create other super admins'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent demoting a super_admin unless you're also super_admin
    if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can modify other super admins'
      });
    }

    const previousRole = user.role;

    // Update user role
    await user.update({
      role,
      promotedBy: adminId,
      promotedAt: new Date()
    });

    // Log the action
    await logAdminAction(adminId, 'user_role_change',
      `Changed ${user.firstName} ${user.lastName}'s role from ${previousRole} to ${role}`, {
        entityType: 'user',
        entityId: user.id,
        previousValue: { role: previousRole },
        newValue: { role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    res.json({
      success: true,
      message: `User role updated to ${role}`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
};

// ============================================
// SUSPEND/ACTIVATE USER (Admin Only)
// ============================================
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const adminId = req.user.id;

    // Cannot suspend yourself
    if (parseInt(id) === adminId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only super_admin can suspend other admins
    if (['admin', 'super_admin'].includes(user.role) && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can modify admin accounts'
      });
    }

    await user.update({ isActive });

    // Log the action
    const actionType = isActive ? 'user_activate' : 'user_suspend';
    await logAdminAction(adminId, actionType,
      `${isActive ? 'Activated' : 'Suspended'} user: ${user.firstName} ${user.lastName}`, {
        entityType: 'user',
        entityId: user.id,
        previousValue: { isActive: !isActive },
        newValue: { isActive },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    // Invalidate all sessions if suspended
    if (!isActive) {
      await UserSession.update(
        { status: 'invalidated', logoutAt: new Date() },
        { where: { userId: id, status: 'active' } }
      );
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'suspended'} successfully`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

// ============================================
// GET ADMIN ACTIVITY LOG
// ============================================
const getAdminActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 50, adminId, actionType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause
    const where = {};

    if (adminId) {
      where.adminId = adminId;
    }

    if (actionType) {
      where.actionType = actionType;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const { count, rows: logs } = await AdminLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      logs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get admin activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activity log'
    });
  }
};

// ============================================
// GET MY ADMIN PROFILE
// ============================================
const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.id;

    const admin = await User.findByPk(adminId, {
      attributes: { exclude: ['password'] }
    });

    // Get recent activity
    const recentActivity = await AdminLog.findAll({
      where: { adminId },
      order: [['createdAt', 'DESC']],
      limit: 20
    });

    // Get session history
    const sessionHistory = await UserSession.findAll({
      where: { userId: adminId },
      order: [['loginAt', 'DESC']],
      limit: 10
    });

    // Get stats
    const totalActions = await AdminLog.count({ where: { adminId } });
    const todayActions = await AdminLog.count({
      where: {
        adminId,
        createdAt: {
          [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    // Get who promoted this admin
    let promotedByUser = null;
    if (admin.promotedBy) {
      promotedByUser = await User.findByPk(admin.promotedBy, {
        attributes: ['id', 'firstName', 'lastName', 'email']
      });
    }

    res.json({
      success: true,
      admin,
      promotedBy: promotedByUser,
      stats: {
        totalActions,
        todayActions,
        totalSessions: sessionHistory.length
      },
      recentActivity,
      sessionHistory
    });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin profile'
    });
  }
};

// ============================================
// GET ADMIN DASHBOARD STATS
// ============================================
const getAdminDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // User stats
    const totalUsers = await User.count();
    const totalAdmins = await User.count({
      where: { role: { [Op.in]: ['manager', 'admin', 'super_admin'] } }
    });
    const newUsersToday = await User.count({
      where: { created_at: { [Op.gte]: today } }
    });

    // Active sessions
    const activeSessions = await UserSession.count({
      where: { status: 'active' }
    });

    // Recent admin activity
    const recentActivity = await AdminLog.findAll({
      include: [{
        model: User,
        as: 'admin',
        attributes: ['id', 'firstName', 'lastName']
      }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    // Currently active admins
    const activeAdminSessions = await UserSession.findAll({
      where: { status: 'active' },
      include: [{
        model: User,
        as: 'user',
        where: { role: { [Op.in]: ['manager', 'admin', 'super_admin'] } },
        attributes: ['id', 'firstName', 'lastName', 'role']
      }],
      order: [['lastActivityAt', 'DESC']]
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalAdmins,
        newUsersToday,
        activeSessions
      },
      recentActivity,
      activeAdmins: activeAdminSessions.map(s => ({
        ...s.user.toJSON(),
        lastActivity: s.lastActivityAt,
        loginAt: s.loginAt
      }))
    });
  } catch (error) {
    console.error('Get admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
};

// ============================================
// CREATE STAFF MEMBER (Admin Only)
// ============================================
const createStaffMember = async (req, res) => {
  try {
    const { email, firstName, lastName, role, phone, password } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!email || !firstName || !lastName || !role || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, first name, last name, role, and password are required'
      });
    }

    // Validate role - only staff roles allowed
    const validStaffRoles = ['manager', 'admin', 'super_admin'];
    if (!validStaffRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Only manager, admin, or super_admin roles can be created here'
      });
    }

    // Only super_admin can create other super_admins or admins
    if (role === 'super_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admins can create other super admins'
      });
    }

    if (role === 'admin' && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins and super admins can create admin accounts'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create the staff member
    const newUser = await User.create({
      email,
      firstName,
      lastName,
      role,
      phone: phone || null,
      password,
      isActive: true,
      promotedBy: adminId,
      promotedAt: new Date()
    });

    // Log the action
    await logAdminAction(adminId, 'staff_created',
      `Created new ${role}: ${firstName} ${lastName} (${email})`, {
        entityType: 'user',
        entityId: newUser.id,
        newValue: { email, firstName, lastName, role },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')} created successfully`,
      user: newUser.toJSON()
    });
  } catch (error) {
    console.error('Create staff member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================
// GET USER STATS (FOR DASHBOARD)
// ============================================
const getUserStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Total users
    const totalUsers = await User.count();

    // Users by role
    const customerCount = await User.count({ where: { role: 'customer' } });
    const managerCount = await User.count({ where: { role: 'manager' } });
    const adminCount = await User.count({ where: { role: 'admin' } });
    const superAdminCount = await User.count({ where: { role: 'super_admin' } });

    // Active vs inactive
    const activeUsers = await User.count({ where: { isActive: true } });
    const suspendedUsers = await User.count({ where: { isActive: false } });

    // New users today
    const newUsersToday = await User.count({
      where: { created_at: { [Op.gte]: today } }
    });

    // New users this month
    const newUsersMonth = await User.count({
      where: { created_at: { [Op.gte]: thirtyDaysAgo } }
    });

    res.json({
      success: true,
      stats: {
        totalUsers,
        byRole: {
          customers: customerCount,
          managers: managerCount,
          admins: adminCount,
          superAdmins: superAdminCount
        },
        activeUsers,
        suspendedUsers,
        newUsersToday,
        newUsersMonth
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user stats. Please try again.'
    });
  }
};

// Export helper for use in other controllers
module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  getAdminActivityLog,
  getAdminProfile,
  getAdminDashboardStats,
  getUserStats,
  createStaffMember,
  logAdminAction
};
