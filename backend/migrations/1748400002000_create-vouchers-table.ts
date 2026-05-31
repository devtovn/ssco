import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('vouchers', {
    id:          { type: 'char(26)', primaryKey: true, default: pgm.func('generate_ulid()') },
    code:        { type: 'varchar(100)', notNull: true },
    description: { type: 'text', notNull: true },
    source:      { type: 'varchar(50)', notNull: true },
    type:        { type: 'varchar(20)', notNull: true, check: "type IN ('cashback', 'shipping', 'discount')" },
    expires_at:  { type: 'date', notNull: true },
    is_active:   { type: 'boolean', notNull: true, default: true },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:  { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint('vouchers', 'vouchers_code_source_uidx', { unique: ['code', 'source'] });
  pgm.createIndex('vouchers', 'source',     { name: 'vouchers_source_idx' });
  pgm.createIndex('vouchers', 'expires_at', { name: 'vouchers_expires_idx' });

  pgm.sql(`
    INSERT INTO vouchers (code, description, source, type, expires_at) VALUES
      ('TIKIBACK10', 'Hoàn 10% tối đa 100k cho đơn từ 500k',       'tiki',   'cashback', '2026-12-31'),
      ('FREESHIP99', 'Miễn phí vận chuyển toàn quốc',               'tiki',   'shipping', '2026-12-31'),
      ('DEAL15OFF',  'Giảm 15% tối đa 200k cho Điện thoại',         'tiki',   'discount', '2026-12-31'),
      ('LAZSAVE50K', 'Giảm 50k cho đơn từ 500k',                    'lazada', 'discount', '2026-12-31'),
      ('LAZFS0',     'Freeship không giới hạn',                      'lazada', 'shipping', '2026-12-31'),
      ('SPBACK15',   'Hoàn xu 15% tối đa 150k',                     'shopee', 'cashback', '2026-12-31'),
      ('SPSAVE200',  'Giảm 200k cho đơn từ 1 triệu',                'shopee', 'discount', '2026-12-31'),
      ('TTKNEW30',   'Giảm 30% cho lần đầu mua trên TikTok Shop',   'tiktok', 'discount', '2026-12-31')
    ON CONFLICT (code, source) DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('vouchers', { ifExists: true, cascade: true });
}
