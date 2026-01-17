const { sequelize } = require('./config/database');
const { Address, User } = require('./models');

async function testAddressCreation() {
  try {
    console.log('\n🧪 TESTING ADDRESS FUNCTIONALITY\n');

    // Test 1: Database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Test 2: Sync models
    console.log('2️⃣ Syncing models...');
    await sequelize.sync();
    console.log('✅ Models synced\n');

    // Test 3: Check if users exist
    console.log('3️⃣ Checking for users...');
    const users = await User.findAll();
    console.log(`✅ Found ${users.length} users`);

    if (users.length === 0) {
      console.log('⚠️  No users found! Please register a user first.\n');
      process.exit(0);
    }

    const testUser = users[0];
    console.log(`Using user: ${testUser.email} (ID: ${testUser.id})\n`);

    // Test 4: Try to create an address directly
    console.log('4️⃣ Creating test address...');
    const testAddress = {
      userId: testUser.id,
      fullName: 'Test User',
      phoneNumber: '555-1234',
      addressLine1: '123 Test Street',
      addressLine2: 'Apt 4B',
      city: 'Test City',
      state: 'OH',
      zipCode: '12345',
      country: 'USA',
      addressType: 'home',
      isDefault: false
    };

    console.log('Address data:', JSON.stringify(testAddress, null, 2));

    const address = await Address.create(testAddress);
    console.log('✅ Address created successfully!');
    console.log('Address ID:', address.id);
    console.log('Address details:', JSON.stringify(address.toJSON(), null, 2));
    console.log('\n');

    // Test 5: Retrieve the address
    console.log('5️⃣ Retrieving addresses for user...');
    const addresses = await Address.findAll({
      where: { userId: testUser.id }
    });
    console.log(`✅ Found ${addresses.length} addresses for user\n`);

    // Test 6: Check table structure
    console.log('6️⃣ Checking addresses table structure...');
    const [results] = await sequelize.query('DESCRIBE addresses');
    console.log('✅ Table structure:');
    console.table(results);

    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log('- Database: Connected ✓');
    console.log('- Models: Working ✓');
    console.log('- Address Creation: Working ✓');
    console.log('- Address Retrieval: Working ✓');
    console.log('\nIf addresses still not saving from frontend:');
    console.log('1. Check if user is logged in');
    console.log('2. Check browser console for errors');
    console.log('3. Check backend logs when submitting form');
    console.log('4. Verify JWT token is being sent\n');

    // Cleanup
    console.log('Cleaning up test data...');
    await address.destroy();
    console.log('✅ Test address deleted\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    console.error('Error type:', error.name);
    console.error('Full error:', error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

testAddressCreation();
