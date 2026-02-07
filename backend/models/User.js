const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'last_name'
  },
  role: {
    type: DataTypes.ENUM('customer', 'manager', 'admin', 'super_admin'),
    defaultValue: 'customer',
    allowNull: false
  },

  // Admin-specific fields
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },

  // Who promoted this user to admin/manager
  promotedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'promoted_by'
  },

  // When they were promoted
  promotedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'promoted_at'
  },

  // Last login timestamp
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login_at'
  },

  // Total login count
  loginCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_count'
  },

  // Phone number for admin contact
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },

  // Email verification
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'email_verified'
  },
  emailVerificationToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'email_verification_token'
  },

  // Password reset
  passwordResetToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'password_reset_token'
  },
  passwordResetExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'password_reset_expires'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;
