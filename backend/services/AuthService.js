// ============================================
// AUTH SERVICE - Authentication & Authorization
// ============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, UserSession, AdminLog } = require('../models');
const { Op } = require('sequelize');

class AuthService {
  /**
   * Hash password using bcrypt
   * @param {string} password
   * @returns {string} hashed password
   */
  static async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Verify password against hash
   * @param {string} password
   * @param {string} hash
   * @returns {boolean}
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   * @param {Object} user
   * @returns {string} token
   */
  static generateToken(user) {
    return jwt.sign(
      { id: user.id, userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   * @param {string} token
   * @returns {Object|null} decoded payload or null
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse device type from user agent
   * @param {string} userAgent
   * @returns {string} device type
   */
  static parseDeviceType(userAgent) {
    if (!userAgent) return 'desktop';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet/i.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  /**
   * Create user session
   * @param {number} userId
   * @param {string} token
   * @param {Object} req - Express request object
   * @returns {Object} session
   */
  static async createSession(userId, token, req) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const userAgent = req.get('user-agent') || '';

    return await UserSession.create({
      userId,
      sessionToken: token,
      loginAt: new Date(),
      expiresAt,
      status: 'active',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: userAgent.substring(0, 500),
      deviceType: this.parseDeviceType(userAgent),
      lastActivityAt: new Date()
    });
  }

  /**
   * Log admin action
   * @param {number} adminId
   * @param {string} actionType
   * @param {string} description
   * @param {Object} req - Express request
   */
  static async logAdminAction(adminId, actionType, description, req) {
    try {
      await AdminLog.create({
        adminId,
        actionType,
        description,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: (req.get('user-agent') || '').substring(0, 500)
      });
    } catch (error) {
      console.error('Failed to log admin action:', error.message);
    }
  }

  /**
   * Register new user
   * @param {Object} userData - { email, password, firstName, lastName }
   * @param {Object} req - Express request
   * @returns {Object} { success, user, token, message }
   */
  static async register(userData, req) {
    const { email, password, firstName, lastName } = userData;

    // Check existing user
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return { success: false, message: 'Email already registered' };
    }

    // Create user - pass raw password, model's beforeCreate hook will hash it
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: 'customer'
    });

    // Generate token and session
    const token = this.generateToken(user);
    await this.createSession(user.id, token, req);

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      token
    };
  }

  /**
   * Login user
   * @param {string} email
   * @param {string} password
   * @param {Object} req - Express request
   * @returns {Object} { success, user, token, message }
   */
  static async login(email, password, req) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!user.isActive) {
      return { success: false, message: 'Your account has been suspended. Please contact support.', suspended: true };
    }

    const isValid = await this.verifyPassword(password, user.password);
    if (!isValid) {
      return { success: false, message: 'Invalid email or password' };
    }

    // Generate token and session
    const token = this.generateToken(user);
    await this.createSession(user.id, token, req);

    // Update login info
    await user.update({
      lastLoginAt: new Date(),
      loginCount: (user.loginCount || 0) + 1
    });

    // Log admin login
    if (['manager', 'admin', 'super_admin'].includes(user.role)) {
      await this.logAdminAction(user.id, 'admin_login', `${user.firstName} ${user.lastName} logged in`, req);
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLoginAt: user.lastLoginAt
      },
      token
    };
  }

  /**
   * Logout user
   * @param {string} token
   * @param {Object} req - Express request
   * @returns {Object} { success }
   */
  static async logout(token, req) {
    const session = await UserSession.findOne({
      where: { sessionToken: token, status: 'active' }
    });

    if (session) {
      await session.update({
        status: 'logged_out',
        logoutAt: new Date()
      });

      // Log admin logout
      const user = await User.findByPk(session.userId);
      if (user && ['manager', 'admin', 'super_admin'].includes(user.role)) {
        await this.logAdminAction(user.id, 'admin_logout', `${user.firstName} ${user.lastName} logged out`, req);
      }
    }

    return { success: true };
  }

  /**
   * Get user sessions
   * @param {number} userId
   * @param {number} limit
   * @returns {Array} sessions
   */
  static async getUserSessions(userId, limit = 20) {
    return await UserSession.findAll({
      where: { userId },
      order: [['loginAt', 'DESC']],
      limit
    });
  }

  /**
   * Invalidate all other sessions
   * @param {number} userId
   * @param {string} currentToken
   * @returns {Object} { success }
   */
  static async invalidateOtherSessions(userId, currentToken) {
    await UserSession.update(
      { status: 'invalidated', logoutAt: new Date() },
      {
        where: {
          userId,
          sessionToken: { [Op.ne]: currentToken },
          status: 'active'
        }
      }
    );

    return { success: true };
  }

  /**
   * Generate password reset token
   * @param {string} email
   * @returns {Object} { success, token, user, message }
   */
  static async generatePasswordResetToken(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      // Return success anyway for security (don't reveal if email exists)
      return { success: true, message: 'If the email exists, a reset link will be sent' };
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpiry
    });

    return {
      success: true,
      token: resetToken,
      user: { email: user.email, firstName: user.firstName },
      message: 'Reset token generated'
    };
  }

  /**
   * Reset password with token
   * @param {string} token
   * @param {string} newPassword
   * @returns {Object} { success, message }
   */
  static async resetPassword(token, newPassword) {
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        passwordResetToken: resetTokenHash,
        passwordResetExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return { success: false, message: 'Invalid or expired reset token' };
    }

    // Pass raw password - the User model's beforeUpdate hook will hash it
    await user.update({
      password: newPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    // Invalidate all sessions for security
    await UserSession.update(
      { status: 'invalidated', logoutAt: new Date() },
      { where: { userId: user.id, status: 'active' } }
    );

    return { success: true, message: 'Password reset successful' };
  }

  /**
   * Verify email token
   * @param {string} token
   * @returns {Object} { success, message }
   */
  static async verifyEmail(token) {
    const emailTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: emailTokenHash,
        emailVerified: false
      }
    });

    if (!user) {
      return { success: false, message: 'Invalid or expired verification token' };
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null
    });

    return { success: true, message: 'Email verified successfully' };
  }

  /**
   * Generate email verification token
   * @param {number} userId
   * @returns {Object} { success, token }
   */
  static async generateEmailVerificationToken(userId) {
    const user = await User.findByPk(userId);

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email already verified' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');

    await user.update({
      emailVerificationToken: tokenHash
    });

    return {
      success: true,
      token: verificationToken,
      user: { email: user.email, firstName: user.firstName }
    };
  }
}

module.exports = AuthService;
