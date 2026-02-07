// ============================================
// CREATE SUPER ADMIN SCRIPT
// ============================================
// Run this script to create or promote a super admin
//
// Usage options:
// 1. Interactive: node scripts/createSuperAdmin.js
// 2. With args:   node scripts/createSuperAdmin.js --email admin@example.com --password secret123 --name "John Doe"
// 3. From env:    Set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME in .env, then run: node scripts/createSuperAdmin.js --env

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index !== -1 ? args[index + 1] : null;
};
const hasFlag = (name) => args.includes(name);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function createFromArgs() {
  const email = getArg('--email');
  const password = getArg('--password');
  const name = getArg('--name');

  if (!email || !password || !name) {
    console.error('❌ Missing required arguments');
    console.log('Usage: node scripts/createSuperAdmin.js --email admin@example.com --password secret123 --name "John Doe"');
    process.exit(1);
  }

  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'Admin';

  return { email, password, firstName, lastName };
}

async function createFromEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
    process.exit(1);
  }

  const [firstName, ...lastParts] = name.split(' ');
  const lastName = lastParts.join(' ') || 'Admin';

  return { email, password, firstName, lastName };
}

async function createOrPromoteAdmin(email, password, firstName, lastName) {
  // Check if email exists
  const [existing] = await sequelize.query(
    'SELECT id, role FROM users WHERE email = ?',
    { replacements: [email] }
  );

  if (existing.length > 0) {
    // Promote existing user
    if (existing[0].role === 'super_admin') {
      console.log('ℹ️  User is already a Super Admin');
      return;
    }
    await sequelize.query(
      'UPDATE users SET role = ?, promoted_at = NOW() WHERE id = ?',
      { replacements: ['super_admin', existing[0].id] }
    );
    console.log('✅ Existing user promoted to Super Admin!');
  } else {
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    await sequelize.query(
      `INSERT INTO users (email, password, first_name, last_name, role, is_active, promoted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'super_admin', 1, NOW(), NOW(), NOW())`,
      { replacements: [email, hashedPassword, firstName, lastName] }
    );
    console.log('✅ Super Admin created successfully!');
  }

  console.log(`   Email: ${email}`);
  console.log(`   Name: ${firstName} ${lastName}`);
  console.log(`   Role: Super Admin`);
}

async function interactiveMode() {
  console.log('Choose an option:');
  console.log('1. Promote existing user to Super Admin');
  console.log('2. Create new Super Admin account');
  console.log('');

  const choice = await question('Enter choice (1 or 2): ');

  if (choice === '1') {
    // Promote existing user
    const email = await question('Enter user email to promote: ');

    const [results] = await sequelize.query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE email = ?',
      { replacements: [email] }
    );

    if (results.length === 0) {
      console.log('\n❌ User not found with that email');
      return;
    }

    const user = results[0];
    console.log(`\nFound user: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    const confirm = await question('\nPromote to Super Admin? (yes/no): ');

    if (confirm.toLowerCase() === 'yes') {
      await sequelize.query(
        'UPDATE users SET role = ?, promoted_at = NOW() WHERE id = ?',
        { replacements: ['super_admin', user.id] }
      );
      console.log('\n✅ User promoted to Super Admin!');
      console.log(`   ${user.first_name} ${user.last_name} is now a Super Admin`);
    } else {
      console.log('\n❌ Operation cancelled');
    }

  } else if (choice === '2') {
    // Create new super admin
    const email = await question('Enter email: ');
    const firstName = await question('Enter first name: ');
    const lastName = await question('Enter last name: ');
    const password = await question('Enter password: ');

    await createOrPromoteAdmin(email, password, firstName, lastName);
  } else {
    console.log('\n❌ Invalid choice');
  }
}

async function main() {
  try {
    console.log('\n===========================================');
    console.log('  TEAHAVEN - CREATE SUPER ADMIN');
    console.log('===========================================\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Check for command line mode
    if (hasFlag('--env')) {
      console.log('📋 Creating from environment variables...\n');
      const { email, password, firstName, lastName } = await createFromEnv();
      await createOrPromoteAdmin(email, password, firstName, lastName);
    } else if (getArg('--email')) {
      console.log('📋 Creating from command line arguments...\n');
      const { email, password, firstName, lastName } = await createFromArgs();
      await createOrPromoteAdmin(email, password, firstName, lastName);
    } else {
      // Interactive mode
      await interactiveMode();
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
    await sequelize.close();
    process.exit(0);
  }
}

main();
