import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── gadget_brands ──────────────────────────────────────────────────
  pgm.createTable('gadget_brands', {
    id:          { type: 'char(26)', primaryKey: true, default: pgm.func('generate_ulid()') },
    name:        { type: 'varchar(100)', notNull: true },
    slug:        { type: 'varchar(100)', notNull: true, unique: true },
    logo_url:    { type: 'text' },
    description: { type: 'text' },
    country:     { type: 'varchar(100)' },
    is_active:   { type: 'boolean', notNull: true, default: true },
    sort_order:  { type: 'integer', notNull: true, default: 0 },
    created_at:  { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:  { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  // ── gadget_devices ─────────────────────────────────────────────────
  pgm.createTable('gadget_devices', {
    id:           { type: 'char(26)', primaryKey: true, default: pgm.func('generate_ulid()') },
    brand_id:     { type: 'char(26)', notNull: true, references: 'gadget_brands(id)', onDelete: 'CASCADE' },
    product_id:   { type: 'char(26)', references: 'products(id)', onDelete: 'SET NULL' },
    name:         { type: 'varchar(200)', notNull: true },
    slug:         { type: 'varchar(200)', notNull: true, unique: true },
    category:     { type: 'varchar(50)', notNull: true, default: pgm.func("'mobile'") },
    image_url:    { type: 'text' },
    gsmarena_url: { type: 'text' },
    announced:    { type: 'varchar(100)' },
    released:     { type: 'varchar(100)' },
    status:       { type: 'varchar(100)' },
    specs:        { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    is_published: { type: 'boolean', notNull: true, default: false },
    created_at:   { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    updated_at:   { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.createIndex('gadget_devices', 'brand_id',     { name: 'idx_gadget_devices_brand_id' });
  pgm.createIndex('gadget_devices', 'product_id',   { name: 'idx_gadget_devices_product_id' });
  pgm.createIndex('gadget_devices', 'category',     { name: 'idx_gadget_devices_category' });
  pgm.createIndex('gadget_devices', 'is_published', { name: 'idx_gadget_devices_published' });
  pgm.createIndex('gadget_devices', 'specs',        { name: 'idx_gadget_devices_specs', method: 'gin' });

  // ── products: add source_type + device_category ────────────────────
  pgm.addColumns('products', {
    source_type:     { type: 'varchar(20)', default: pgm.func("'other'") },
    device_category: { type: 'varchar(50)' },
  });
  pgm.createIndex('products', 'source_type',     { name: 'idx_products_source_type' });
  pgm.createIndex('products', 'device_category', { name: 'idx_products_device_category' });

  // ── Gadget spec tables (1-to-1 with products) ─────────────────────

  const specTables: Array<{ name: string; columns: Record<string, any>; indexes?: Array<{ cols: string | string[]; name: string; method?: string }> }> = [
    {
      name: 'gadget_network',
      columns: {
        technology: { type: 'text' }, bands_2g: { type: 'text' }, bands_3g: { type: 'text' },
        bands_4g: { type: 'text' }, bands_5g: { type: 'text' }, speed: { type: 'text' },
      },
    },
    {
      name: 'gadget_launch',
      columns: { announced: { type: 'text' }, status: { type: 'text' } },
    },
    {
      name: 'gadget_body',
      columns: {
        dimensions: { type: 'text' }, weight_grams: { type: 'numeric(7,2)' },
        build: { type: 'text' }, sim: { type: 'text' }, water_resistance: { type: 'text' },
      },
      indexes: [{ cols: 'weight_grams', name: 'idx_gadget_body_weight' }],
    },
    {
      name: 'gadget_display',
      columns: {
        type: { type: 'text' }, size_inches: { type: 'numeric(4,2)' }, resolution: { type: 'text' },
        protection: { type: 'text' }, features: { type: 'text' },
        refresh_rate_hz: { type: 'integer' }, ppi: { type: 'integer' },
      },
      indexes: [
        { cols: 'size_inches', name: 'idx_gadget_display_size' },
        { cols: 'refresh_rate_hz', name: 'idx_gadget_display_refresh' },
      ],
    },
    {
      name: 'gadget_platform',
      columns: { os: { type: 'text' }, chipset: { type: 'text' }, cpu: { type: 'text' }, gpu: { type: 'text' } },
    },
    {
      name: 'gadget_memory',
      columns: {
        card_slot: { type: 'text' }, internal: { type: 'text' },
        ram_gb: { type: 'integer' }, storage_min_gb: { type: 'integer' }, storage_type: { type: 'text' },
      },
      indexes: [
        { cols: 'ram_gb', name: 'idx_gadget_memory_ram' },
        { cols: 'storage_min_gb', name: 'idx_gadget_memory_storage' },
      ],
    },
    {
      name: 'gadget_main_camera',
      columns: {
        modules: { type: 'text' }, megapixels_main: { type: 'integer' },
        aperture_main: { type: 'text' }, features: { type: 'text' }, video: { type: 'text' },
      },
      indexes: [{ cols: 'megapixels_main', name: 'idx_gadget_main_camera_mp' }],
    },
    {
      name: 'gadget_selfie_camera',
      columns: { modules: { type: 'text' }, megapixels: { type: 'integer' }, features: { type: 'text' }, video: { type: 'text' } },
    },
    {
      name: 'gadget_sound',
      columns: {
        loudspeaker: { type: 'text' }, has_stereo: { type: 'boolean' },
        jack_3_5mm: { type: 'text' }, has_jack: { type: 'boolean' },
      },
      indexes: [
        { cols: 'has_jack', name: 'idx_gadget_sound_jack' },
        { cols: 'has_stereo', name: 'idx_gadget_sound_stereo' },
      ],
    },
    {
      name: 'gadget_comms',
      columns: {
        wlan: { type: 'text' }, wifi_version: { type: 'text' },
        bluetooth: { type: 'text' }, bt_version: { type: 'numeric(3,1)' },
        positioning: { type: 'text' }, nfc: { type: 'text' }, has_nfc: { type: 'boolean' },
        radio: { type: 'text' }, usb: { type: 'text' }, usb_version: { type: 'text' },
      },
      indexes: [
        { cols: 'has_nfc', name: 'idx_gadget_comms_nfc' },
        { cols: 'bt_version', name: 'idx_gadget_comms_bt' },
      ],
    },
    {
      name: 'gadget_features',
      columns: { sensors: { type: 'text' }, other: { type: 'text' } },
    },
    {
      name: 'gadget_battery',
      columns: {
        type: { type: 'text' }, capacity_mah: { type: 'integer' }, charging: { type: 'text' },
        charging_wired_w: { type: 'integer' }, has_wireless: { type: 'boolean' },
        wireless_w: { type: 'integer' }, has_reverse: { type: 'boolean' },
      },
      indexes: [
        { cols: 'capacity_mah', name: 'idx_gadget_battery_capacity' },
        { cols: 'has_wireless', name: 'idx_gadget_battery_wireless' },
        { cols: 'charging_wired_w', name: 'idx_gadget_battery_charging_w' },
      ],
    },
    {
      name: 'gadget_misc',
      columns: {
        colors: { type: 'text' }, models: { type: 'text' },
        sar_us: { type: 'text' }, sar_eu: { type: 'text' }, price_usd: { type: 'text' },
      },
    },
    {
      name: 'gadget_tests',
      columns: {
        display_score: { type: 'text' }, loudspeaker_lufs: { type: 'text' },
        battery_hours: { type: 'numeric(5,1)' },
      },
      indexes: [{ cols: 'battery_hours', name: 'idx_gadget_tests_battery' }],
    },
  ];

  for (const t of specTables) {
    pgm.createTable(t.name, {
      product_id: { type: 'char(26)', primaryKey: true, references: 'products(id)', onDelete: 'CASCADE' },
      ...t.columns,
      updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
    });
    if (t.indexes) {
      for (const idx of t.indexes) {
        pgm.createIndex(t.name, idx.cols, { name: idx.name, method: idx.method as any });
      }
    }
  }

  // ── Seed brands ────────────────────────────────────────────────────
  pgm.sql(`
    INSERT INTO gadget_brands (name, slug, country, sort_order) VALUES
      ('Apple',    'apple',    'USA',         1),
      ('Samsung',  'samsung',  'South Korea', 2),
      ('Xiaomi',   'xiaomi',   'China',       3),
      ('OPPO',     'oppo',     'China',       4),
      ('vivo',     'vivo',     'China',       5),
      ('realme',   'realme',   'China',       6),
      ('Google',   'google',   'USA',         7),
      ('OnePlus',  'oneplus',  'China',       8),
      ('Sony',     'sony',     'Japan',       9),
      ('ASUS',     'asus',     'Taiwan',     10),
      ('Nokia',    'nokia',    'Finland',    11),
      ('Motorola', 'motorola', 'USA',        12),
      ('Huawei',   'huawei',   'China',      13),
      ('Honor',    'honor',    'China',      14),
      ('Garmin',   'garmin',   'USA',        15)
    ON CONFLICT (slug) DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  const specTables = [
    'gadget_tests', 'gadget_misc', 'gadget_battery', 'gadget_features',
    'gadget_comms', 'gadget_sound', 'gadget_selfie_camera', 'gadget_main_camera',
    'gadget_memory', 'gadget_platform', 'gadget_display', 'gadget_body',
    'gadget_launch', 'gadget_network',
  ];
  for (const t of specTables) {
    pgm.dropTable(t, { ifExists: true, cascade: true });
  }

  pgm.dropColumns('products', ['source_type', 'device_category'], { ifExists: true });
  pgm.dropTable('gadget_devices', { ifExists: true, cascade: true });
  pgm.dropTable('gadget_brands', { ifExists: true, cascade: true });
}
