import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Running migration: create-website-config-table');
    
    await client.query('BEGIN');
    
    // Create website_config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS website_config (
        id char(26) PRIMARY KEY DEFAULT generate_ulid(),
        logo_url VARCHAR(500),
        site_name VARCHAR(200) NOT NULL DEFAULT 'Product Price Comparison',
        tagline VARCHAR(500),
        theme JSONB DEFAULT '{"primaryColor": "#3B82F6", "secondaryColor": "#10B981", "fontFamily": "Inter"}',
        branding JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    console.log('✓ Created website_config table');
    
    // Check if default config exists
    const checkResult = await client.query('SELECT COUNT(*) as count FROM website_config');
    const count = parseInt(checkResult.rows[0].count);
    
    if (count === 0) {
      // Insert default configuration
      await client.query(`
        INSERT INTO website_config (site_name, tagline, theme, branding)
        VALUES (
          'Product Price Comparison',
          'So sánh giá sản phẩm từ nhiều nguồn',
          '{"primaryColor": "#3B82F6", "secondaryColor": "#10B981", "fontFamily": "Inter"}'::jsonb,
          '{}'::jsonb
        )
      `);
      
      console.log('✓ Inserted default website configuration');
    } else {
      console.log('✓ Default website configuration already exists');
    }
    
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
