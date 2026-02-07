// ============================================
// ADMIN LOG MODEL - TRACKS ALL ADMIN ACTIVITIES
// ============================================
// This model logs every action performed by admins
// for audit trail and accountability purposes.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AdminLog = sequelize.define('AdminLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Who performed the action
    adminId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'admin_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },

    // What type of action was performed
    actionType: {
      type: DataTypes.ENUM(
        // User management
        'user_create',
        'user_update',
        'user_delete',
        'user_role_change',
        'user_suspend',
        'user_activate',

        // Inventory management
        'inventory_add',
        'inventory_adjust',
        'inventory_damage',
        'inventory_transfer',

        // Product management
        'product_create',
        'product_update',
        'product_delete',
        'product_price_change',

        // Order management
        'order_status_change',
        'order_cancel',
        'refund_approve',
        'refund_reject',

        // System settings
        'settings_update',
        'admin_login',
        'admin_logout'
      ),
      allowNull: false,
      field: 'action_type'
    },

    // Human-readable description of the action
    description: {
      type: DataTypes.STRING(500),
      allowNull: false
    },

    // The entity type affected (user, product, order, etc.)
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'entity_type'
    },

    // The ID of the affected entity
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'entity_id'
    },

    // Previous value (for tracking changes)
    previousValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'previous_value'
    },

    // New value (for tracking changes)
    newValue: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'new_value'
    },

    // IP address of the admin
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

    // Session ID for linking related actions
    sessionId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'session_id'
    }
  }, {
    tableName: 'admin_logs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false, // Logs are immutable
    indexes: [
      { fields: ['admin_id'] },
      { fields: ['action_type'] },
      { fields: ['entity_type', 'entity_id'] },
      { fields: ['created_at'] },
      { fields: ['session_id'] }
    ]
  });

  return AdminLog;
};
