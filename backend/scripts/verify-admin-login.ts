import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

async function main(): Promise<void> {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://kombe:kombe_dev_password@localhost:5432/kombe',
  });

  const { rows } = await pool.query(
    'SELECT email, password_hash FROM users WHERE email = $1',
    ['admin']
  );

  if (!rows.length) {
    console.log('NO_USER');
    process.exit(1);
  }

  const match = await bcrypt.compare('Admin@123456', rows[0].password_hash);
  console.log('PASSWORD_MATCH', match);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
