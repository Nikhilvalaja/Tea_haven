// Migration to add Stripe payment fields to orders table
// Run this with: node migrations/addStripeFields.js

require('dotenv').config();
const { sequelize } = require('../config/database');

async function addStripeFields() {
  try {
    console.log('🔄 Adding Stripe payment fields to orders table...');

    await sequelize.authenticate();
    console.log('✅ Database connected');

    const queryInterface = sequelize.getQueryInterface();

    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('orders');

    // Add stripe_session_id if it doesn't exist
    if (!tableDescription.stripe_session_id) {
      await queryInterface.addColumn('orders', 'stripe_session_id', {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      });
      console.log('✅ Added stripe_session_id column');
    } else {
      console.log('ℹ️  stripe_session_id already exists');
    }

    // Add stripe_payment_intent_id if it doesn't exist
    if (!tableDescription.stripe_payment_intent_id) {
      await queryInterface.addColumn('orders', 'stripe_payment_intent_id', {
        type: sequelize.Sequelize.STRING(255),
        allowNull: true
      });
      console.log('✅ Added stripe_payment_intent_id column');
    } else {
      console.log('ℹ️  stripe_payment_intent_id already exists');
    }

    // Add shipping_address if it doesn't exist
    if (!tableDescription.shipping_address) {
      await queryInterface.addColumn('orders', 'shipping_address', {
        type: sequelize.Sequelize.JSON,
        allowNull: true
      });
      console.log('✅ Added shipping_address column');
    } else {
      console.log('ℹ️  shipping_address already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\nStripe payment fields:');
    console.log('  - stripe_session_id (VARCHAR 255)');
    console.log('  - stripe_payment_intent_id (VARCHAR 255)');
    console.log('  - shipping_address (JSON)');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database is running');
    console.error('2. Database credentials in .env are correct');
    console.error('3. Orders table exists');
    process.exit(1);
  }
}

addStripeFields();
