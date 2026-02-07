// ============================================
// MIGRATION: Add Email Verification & Password Reset Fields
// ============================================

const { sequelize } = require('../config/database');

async function runMigration() {
  try {
    console.log('Starting migration: Adding auth fields to users table...');

    // Add email verification fields
    await sequelize.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires DATETIME
    `).catch(err => {
      // Handle SQLite syntax (IF NOT EXISTS might not work)
      console.log('Trying alternative syntax...');
    });

    // Try individual columns for better compatibility
    const columns = [
      ['email_verified', 'BOOLEAN DEFAULT FALSE'],
      ['email_verification_token', 'VARCHAR(255)'],
      ['password_reset_token', 'VARCHAR(255)'],
      ['password_reset_expires', 'DATETIME']
    ];

    for (const [columnName, columnType] of columns) {
      try {
        await sequelize.query(`ALTER TABLE users ADD COLUMN ${columnName} ${columnType}`);
        console.log(`Added column: ${columnName}`);
      } catch (err) {
        if (err.message.includes('duplicate column') || err.message.includes('already exists')) {
          console.log(`Column ${columnName} already exists, skipping...`);
        } else {
          console.error(`Error adding ${columnName}:`, err.message);
        }
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
