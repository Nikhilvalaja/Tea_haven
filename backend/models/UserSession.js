// ============================================
// USER SESSION MODEL - TRACKS LOGIN/LOGOUT
// ============================================
// This model tracks all user sessions including
// login times, logout times, and session status.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // User who owns this session
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },

    // Unique session identifier
    sessionToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'session_token'
    },

    // Login timestamp
    loginAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'login_at'
    },

    // Logout timestamp (null if still active)
    logoutAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'logout_at'
    },

    // Session expiry time
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },

    // Session status
    status: {
      type: DataTypes.ENUM('active', 'expired', 'logged_out', 'invalidated'),
      allowNull: false,
      defaultValue: 'active'
    },

    // IP address at login
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },

    // User agent/browser info
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent'
    },

    // Device type (desktop, mobile, tablet)
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'device_type'
    },

    // Geographic location (optional)
    location: {
      type: DataTypes.STRING(200),
      allowNull: true
    },

    // Last activity timestamp
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_activity_at'
    }
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['user_id'] },
      { fields: ['session_token'] },
      { fields: ['status'] },
      { fields: ['login_at'] },
      { fields: ['expires_at'] }
    ]
  });

  return UserSession;
};
