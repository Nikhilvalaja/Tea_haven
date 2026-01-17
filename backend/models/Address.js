const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  fullName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'full_name'
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'phone_number'
  },
  addressLine1: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'address_line1'
  },
  addressLine2: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'address_line2'
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  zipCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'zip_code'
  },
  country: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'USA'
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: true,
    comment: 'For Google Maps integration'
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: true,
    comment: 'For Google Maps integration'
  },
  placeId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'place_id',
    comment: 'Google Maps Place ID'
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_default',
    comment: 'Primary shipping address'
  },
  addressType: {
    type: DataTypes.ENUM('home', 'work', 'other'),
    defaultValue: 'home',
    field: 'address_type'
  }
}, {
  tableName: 'addresses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Address;
