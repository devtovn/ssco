import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Insert 10 default categories for Vietnamese market
  const categories = [
    {
      name: 'Điện lạnh',
      slug: 'dien-lanh',
      description: 'Tủ lạnh, máy lạnh, máy giặt và các thiết bị điện lạnh',
      icon: 'refrigerator',
      parent_id: null,
    },
    {
      name: 'Thiết bị gia dụng',
      slug: 'thiet-bi-gia-dung',
      description: 'Nồi cơm điện, lò vi sóng, máy xay sinh tố và các thiết bị nhà bếp',
      icon: 'kitchen',
      parent_id: null,
    },
    {
      name: 'Điện thoại & Phụ kiện',
      slug: 'dien-thoai-phu-kien',
      description: 'Điện thoại di động, tai nghe, ốp lưng và phụ kiện',
      icon: 'smartphone',
      parent_id: null,
    },
    {
      name: 'Laptop & Máy tính',
      slug: 'laptop-may-tinh',
      description: 'Laptop, PC, màn hình và linh kiện máy tính',
      icon: 'laptop',
      parent_id: null,
    },
    {
      name: 'Tivi & Âm thanh',
      slug: 'tivi-am-thanh',
      description: 'Tivi, loa, dàn âm thanh và thiết bị giải trí',
      icon: 'tv',
      parent_id: null,
    },
    {
      name: 'Máy ảnh & Quay phim',
      slug: 'may-anh-quay-phim',
      description: 'Máy ảnh, máy quay, ống kính và phụ kiện nhiếp ảnh',
      icon: 'camera',
      parent_id: null,
    },
    {
      name: 'Đồng hồ & Phụ kiện',
      slug: 'dong-ho-phu-kien',
      description: 'Đồng hồ đeo tay, vòng tay thông minh và phụ kiện',
      icon: 'watch',
      parent_id: null,
    },
    {
      name: 'Thiết bị thông minh',
      slug: 'thiet-bi-thong-minh',
      description: 'Smart home, camera an ninh, chuông cửa thông minh',
      icon: 'smart-home',
      parent_id: null,
    },
    {
      name: 'Gaming & Console',
      slug: 'gaming-console',
      description: 'Máy chơi game, tay cầm, game và phụ kiện gaming',
      icon: 'gamepad',
      parent_id: null,
    },
    {
      name: 'Thiết bị văn phòng',
      slug: 'thiet-bi-van-phong',
      description: 'Máy in, máy scan, máy chiếu và thiết bị văn phòng',
      icon: 'printer',
      parent_id: null,
    },
  ];

  // Insert categories with ON CONFLICT to avoid duplicates
  for (const category of categories) {
    pgm.sql(`
      INSERT INTO categories (name, slug, description, icon, parent_id, is_active)
      VALUES (
        '${category.name}',
        '${category.slug}',
        '${category.description}',
        '${category.icon}',
        ${category.parent_id || 'NULL'},
        true
      )
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  console.log('='.repeat(80));
  console.log('DEFAULT CATEGORIES SEEDED');
  console.log('='.repeat(80));
  console.log(`Total categories inserted: ${categories.length}`);
  console.log('Categories:', categories.map((c) => c.name).join(', '));
  console.log('='.repeat(80));
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the default categories
  const slugs = [
    'dien-lanh',
    'thiet-bi-gia-dung',
    'dien-thoai-phu-kien',
    'laptop-may-tinh',
    'tivi-am-thanh',
    'may-anh-quay-phim',
    'dong-ho-phu-kien',
    'thiet-bi-thong-minh',
    'gaming-console',
    'thiet-bi-van-phong',
  ];

  pgm.sql(`
    DELETE FROM categories 
    WHERE slug IN (${slugs.map((s) => `'${s}'`).join(', ')})
  `);
}
