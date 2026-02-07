const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const InventoryLog = sequelize.define('InventoryLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'product_id',
      references: {
        model: 'products',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM(
        'purchase_in',      // Stock received from supplier
        'sale_out',         // Stock sold to customer
        'adjustment_add',   // Manual stock increase
        'adjustment_sub',   // Manual stock decrease
        'return_in',        // Customer return
        'damage_out',       // Damaged/expired stock removed
        'transfer_in',      // Transfer from another location
        'transfer_out',     // Transfer to another location
        'reservation',      // Stock reserved for pending order
        'reservation_release' // Reserved stock released (order cancelled)
      ),
      allowNull: false
    },
    quantityChange: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'quantity_change',
      comment: 'Positive for stock in, negative for stock out'
    },
    previousStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'previous_stock'
    },
    newStock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'new_stock'
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'order_id',
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'user_id',
      comment: 'Admin who made the adjustment'
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Reason for adjustment or notes'
    },
    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'reference_number',
      comment: 'PO number, invoice number, etc.'
    },
    unitCost: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'unit_cost',
      comment: 'Cost per unit for purchase_in'
    },
    totalValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'total_value',
      comment: 'Total value of stock change'
    }
  }, {
    tableName: 'inventory_logs',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['product_id'] },
      { fields: ['action'] },
      { fields: ['order_id'] },
      { fields: ['created_at'] },
      { fields: ['product_id', 'created_at'] }
    ]
  });

  return InventoryLog;
};
