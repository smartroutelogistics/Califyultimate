/**
 * Database Migration Script
 * Run with: node src/database/migrate.js
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigration() {
  console.log('Starting database migration...\n');

  try {
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');

    // Execute schema
    await pool.query(schema);

    console.log('✓ Schema created successfully\n');

    // Verify tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Created tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('\n✓ Migration completed successfully!');

    // Insert sample tenant and user
    console.log('\nCreating sample tenant and admin user...');

    // Check if tenant exists
    const tenantCheck = await pool.query(
      "SELECT id FROM tenants WHERE id = '00000000-0000-0000-0000-000000000001'"
    );

    if (tenantCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO tenants (id, name, company, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Tenant', 'Demo Corp', 'demo@example.com')
      `);
      console.log('✓ Sample tenant created');
    } else {
      console.log('✓ Sample tenant already exists');
    }

    // Check if user exists
    const userCheck = await pool.query(
      "SELECT id FROM users WHERE email = 'admin@test.com'"
    );

    if (userCheck.rows.length === 0) {
      // Password: 'password123'
      await pool.query(`
        INSERT INTO users (email, password_hash, role, tenant_id, first_name, last_name)
        VALUES (
          'admin@test.com',
          '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
          'admin',
          '00000000-0000-0000-0000-000000000001',
          'Admin',
          'User'
        )
      `);
      console.log('✓ Sample admin user created');
      console.log('  Email: admin@test.com');
      console.log('  Password: password123');
    } else {
      console.log('✓ Sample admin user already exists');
    }

    console.log('\n🎉 All done! You can now start the application.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
