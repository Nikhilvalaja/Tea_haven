require('dotenv').config();
const { Sequelize } = require('sequelize');
const { sequelizeLogger } = require('../utils/logger');

const isDevelopment = process.env.NODE_ENV === 'development';

const sequelize = new Sequelize(
  process.env.DB_NAME || 'teahaven',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'teahaven123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: isDevelopment ? sequelizeLogger : false,
    benchmark: isDevelopment, // Track query duration
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
