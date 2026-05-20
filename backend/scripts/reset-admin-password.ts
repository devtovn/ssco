import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const email = process.env.ADMIN_EMAIL || 'admin@pricecompare.vn';
const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://pricecompare:pricecompare_dev_password@localhost:5432/price_comparison',
  });

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING email',
    [passwordHash, email]
  );

  if (result.rowCount === 0) {
    console.error(`No user found for ${email}. Run migrations first (npm run migrate:up).`);
    process.exit(1);
  }

  console.log(`Password reset for ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
