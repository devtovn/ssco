import { MigrationBuilder } from 'node-pg-migrate';
import * as bcrypt from 'bcrypt';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Hash the default admin password
  const defaultPassword = 'Admin@123456';
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  // Insert default Administrator account
  pgm.sql(`
    INSERT INTO users (email, password_hash, role, permissions, is_active)
    VALUES (
      'admin@pricecompare.vn',
      $hash$${passwordHash}$hash$,
      'Administrator',
      '{"full_access": true, "manage_users": true, "manage_content": true, "manage_ads": true, "manage_affiliates": true, "view_analytics": true}'::jsonb,
      true
    )
    ON CONFLICT (email) DO NOTHING
  `);

  // Log the default credentials (for development only)
  console.log('='.repeat(80));
  console.log('DEFAULT ADMINISTRATOR ACCOUNT CREATED');
  console.log('='.repeat(80));
  console.log('Email:    admin@pricecompare.vn');
  console.log('Password: Admin@123456');
  console.log('Role:     Administrator');
  console.log('='.repeat(80));
  console.log('IMPORTANT: Change this password immediately in production!');
  console.log('='.repeat(80));
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the default administrator account
  pgm.sql(`
    DELETE FROM users 
    WHERE email = 'admin@pricecompare.vn'
  `);
}
