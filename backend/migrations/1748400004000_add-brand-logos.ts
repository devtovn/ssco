import { MigrationBuilder } from 'node-pg-migrate';

// Logo URLs from logo.clearbit.com (free, public CDN)
const BRAND_LOGOS: Record<string, string> = {
  apple:    'https://logo.clearbit.com/apple.com',
  samsung:  'https://logo.clearbit.com/samsung.com',
  xiaomi:   'https://logo.clearbit.com/xiaomi.com',
  oppo:     'https://logo.clearbit.com/oppo.com',
  vivo:     'https://logo.clearbit.com/vivo.com',
  realme:   'https://logo.clearbit.com/realme.com',
  google:   'https://logo.clearbit.com/google.com',
  oneplus:  'https://logo.clearbit.com/oneplus.com',
  sony:     'https://logo.clearbit.com/sony.com',
  asus:     'https://logo.clearbit.com/asus.com',
  nokia:    'https://logo.clearbit.com/nokia.com',
  motorola: 'https://logo.clearbit.com/motorola.com',
  huawei:   'https://logo.clearbit.com/huawei.com',
  honor:    'https://logo.clearbit.com/hihonor.com',
  garmin:   'https://logo.clearbit.com/garmin.com',
};

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const [slug, logoUrl] of Object.entries(BRAND_LOGOS)) {
    pgm.sql(`UPDATE gadget_brands SET logo_url = '${logoUrl}' WHERE slug = '${slug}'`);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`UPDATE gadget_brands SET logo_url = NULL`);
}
