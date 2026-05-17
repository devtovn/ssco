const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Creating website_config table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS website_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        config_data JSONB NOT NULL DEFAULT '{"logo":"","siteName":"Price Comparison","tagline":"So sánh giá tốt nhất","primaryColor":"#3B82F6","secondaryColor":"#10B981","font":"Inter","metadata":{}}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT website_config_single_row CHECK (id = 1)
      )
    `);
    
    console.log('Inserting default configuration...');
    
    await pool.query(`
      INSERT INTO website_config (id, config_data)
      VALUES (1, '{"logo":"","siteName":"Price Comparison","tagline":"So sánh giá tốt nhất","primaryColor":"#3B82F6","secondaryColor":"#10B981","font":"Inter","metadata":{}}'::jsonb)
      ON CONFLICT (id) DO NOTHING
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
