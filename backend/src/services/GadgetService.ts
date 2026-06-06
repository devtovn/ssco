/**
 * GadgetService — CRUD for gadget_brands and gadget_devices.
 *
 * Architecture (product-as-primary):
 *   - Every crawled gadget creates a row in `products` (source_type='gadget')
 *     THEN a row in `gadget_devices` (product_id NOT NULL for crawled devices).
 *   - Specs are stored in the 14 typed spec tables (gadget_network, gadget_display, …)
 *     keyed by product_id.  gadget_devices no longer holds a specs jsonb column.
 *   - Manual link/unlink (linkProduct) is still supported for edge-case re-linking;
 *     it migrates spec rows from the old product_id to the new one.
 */
import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

export interface GadgetBrand {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  country?: string;
  isActive: boolean;
  sortOrder: number;
  deviceCount?: number;
}

export interface GadgetDevice {
  id: string;
  brandId: string;
  brandName?: string;
  brandSlug?: string;
  name: string;
  slug: string;
  category: 'mobile' | 'tablet' | 'smartwatch';
  imageUrl?: string;
  gsmarenaUrl?: string;
  announced?: string;
  released?: string;
  status?: string;
  specs: GadgetSpecs;
  isPublished: boolean;
  /** Linked product ID in the products table (for price lookup & spec storage) */
  productId?: string;
  /** Linked product slug (for navigation to /san-pham/:slug) */
  productSlug?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GadgetSpecs {
  network?:       Record<string, string>;
  launch?:        Record<string, string>;
  body?:          Record<string, string>;
  display?:       Record<string, string>;
  platform?:      Record<string, string>;
  memory?:        Record<string, string>;
  main_camera?:   Record<string, string>;
  selfie_camera?: Record<string, string>;
  sound?:         Record<string, string>;
  comms?:         Record<string, string>;
  features?:      Record<string, string>;
  battery?:       Record<string, string>;
  misc?:          Record<string, string>;
  [section: string]: Record<string, string> | undefined;
}

// ── Category slug map ─────────────────────────────────────────────────────────

const DEVICE_CATEGORY_TO_PRODUCT_CATEGORY: Record<string, string> = {
  mobile:     'dien-thoai',
  tablet:     'may-tinh-bang',
  smartwatch: 'phu-kien-dien-tu',
};

// ── Spec table write mapping ──────────────────────────────────────────────────
// For each GadgetSpecs section key, defines the target table and how to map
// spec dict entries to DB columns (with optional parsing for typed columns).

interface WriteDef {
  specKey: string;
  dbCol: string;
  parse?: (v: string) => any;
}

interface TableWriter {
  table: string;
  cols: WriteDef[];
}

const SPEC_WRITERS: Record<string, TableWriter> = {
  network: {
    table: 'gadget_network',
    cols: [
      { specKey: 'technology',   dbCol: 'technology' },
      // GSMArena crawls "2G bands" → key "2g_bands", not "bands_2g"
      { specKey: 'bands_2g',     dbCol: 'bands_2g' },
      { specKey: '2g_bands',     dbCol: 'bands_2g' },
      { specKey: 'bands_2g_r1',  dbCol: 'bands_2g_r1' },
      { specKey: '2g_bands_r1',  dbCol: 'bands_2g_r1' },
      { specKey: 'bands_3g',     dbCol: 'bands_3g' },
      { specKey: '3g_bands',     dbCol: 'bands_3g' },
      { specKey: 'bands_3g_r1',  dbCol: 'bands_3g_r1' },
      { specKey: '3g_bands_r1',  dbCol: 'bands_3g_r1' },
      { specKey: 'bands_4g',     dbCol: 'bands_4g' },
      { specKey: '4g_bands',     dbCol: 'bands_4g' },
      { specKey: 'bands_4g_r1',  dbCol: 'bands_4g_r1' },
      { specKey: '4g_bands_r1',  dbCol: 'bands_4g_r1' },
      { specKey: 'bands_4g_r2',  dbCol: 'bands_4g_r2' },
      { specKey: '4g_bands_r2',  dbCol: 'bands_4g_r2' },
      { specKey: 'bands_4g_r3',  dbCol: 'bands_4g_r3' },
      { specKey: '4g_bands_r3',  dbCol: 'bands_4g_r3' },
      { specKey: 'bands_5g',     dbCol: 'bands_5g' },
      { specKey: '5g_bands',     dbCol: 'bands_5g' },
      { specKey: 'bands_5g_r1',  dbCol: 'bands_5g_r1' },
      { specKey: '5g_bands_r1',  dbCol: 'bands_5g_r1' },
      { specKey: 'bands_5g_r2',  dbCol: 'bands_5g_r2' },
      { specKey: '5g_bands_r2',  dbCol: 'bands_5g_r2' },
      { specKey: 'bands_5g_r3',  dbCol: 'bands_5g_r3' },
      { specKey: '5g_bands_r3',  dbCol: 'bands_5g_r3' },
      { specKey: 'speed',        dbCol: 'speed' },
    ],
  },
  launch: {
    table: 'gadget_launch',
    cols: [
      { specKey: 'announced', dbCol: 'announced' },
      { specKey: 'status',    dbCol: 'status' },
    ],
  },
  body: {
    table: 'gadget_body',
    cols: [
      { specKey: 'dimensions',       dbCol: 'dimensions' },
      { specKey: 'weight',           dbCol: 'weight_grams', parse: parseGrams },
      { specKey: 'build',            dbCol: 'build' },
      // sim (base) + r1..r4 continuation rows stored as separate columns
      // r1: eSIM USA / tablet stylus / watch IP6X
      // r2: Nano-SIM China
      // r3: IP68 rating (mobile)
      // r4: Apple Pay (mobile)
      { specKey: 'sim',              dbCol: 'sim' },
      { specKey: 'sim_r1',           dbCol: 'sim_r1' },
      { specKey: 'sim_r2',           dbCol: 'sim_r2' },
      { specKey: 'sim_r3',           dbCol: 'sim_r3' },
      { specKey: 'sim_r4',           dbCol: 'sim_r4' },
      // water_resistance: only populated when GSMArena has an explicit labeled row (some Android devices)
      { specKey: 'water_resistance', dbCol: 'water_resistance' },
    ],
  },
  display: {
    table: 'gadget_display',
    cols: [
      { specKey: 'type',         dbCol: 'type' },
      { specKey: 'size',         dbCol: 'size_inches',     parse: parseInches },
      { specKey: 'resolution',   dbCol: 'resolution' },
      { specKey: 'protection',    dbCol: 'protection' },
      { specKey: 'protection_r1', dbCol: 'protection_r1' },
      { specKey: 'features',      dbCol: 'features' },
      { specKey: 'refresh_rate', dbCol: 'refresh_rate_hz', parse: parseInteger },
      { specKey: 'density',      dbCol: 'ppi',             parse: parseInteger },
      // refresh_rate_hz and ppi are extracted in post-processing from type/resolution text
      // cover_display: foldable's cover screen appears as labeled row in some devices
    ],
  },
  platform: {
    table: 'gadget_platform',
    cols: [
      { specKey: 'os',      dbCol: 'os' },
      { specKey: 'chipset', dbCol: 'chipset' },
      { specKey: 'cpu',     dbCol: 'cpu' },
      { specKey: 'gpu',     dbCol: 'gpu' },
    ],
  },
  memory: {
    table: 'gadget_memory',
    cols: [
      { specKey: 'card_slot',    dbCol: 'card_slot' },
      { specKey: 'internal',     dbCol: 'internal' },
      // internal_r1: storage type continuation row ("NVMe", "UFS 4.0")
      { specKey: 'internal_r1',  dbCol: 'internal_r1' },
      { specKey: 'ram',          dbCol: 'ram_gb',          parse: parseInteger },
      { specKey: 'storage',      dbCol: 'storage_min_gb',  parse: parseInteger },
      // storage_type extracted in post-processing from internal_r1 or internal text
      { specKey: 'storage_type', dbCol: 'storage_type' },
    ],
  },
  main_camera: {
    table: 'gadget_main_camera',
    cols: [
      { specKey: 'specs',      dbCol: 'modules' },
      { specKey: 'modules',    dbCol: 'modules' },
      // GSMArena uses "dual" / "triple" / "quad" / "single" as the label
      { specKey: 'single',     dbCol: 'modules' },
      { specKey: 'dual',       dbCol: 'modules' },
      { specKey: 'triple',     dbCol: 'modules' },
      { specKey: 'quad',       dbCol: 'modules' },
      // <br>-split continuation modules → modules_r1, r2, r3
      { specKey: 'single_r1',  dbCol: 'modules_r1' },
      { specKey: 'dual_r1',    dbCol: 'modules_r1' },
      { specKey: 'dual_r2',    dbCol: 'modules_r2' },
      { specKey: 'triple_r1',  dbCol: 'modules_r1' },
      { specKey: 'triple_r2',  dbCol: 'modules_r2' },
      { specKey: 'triple_r3',  dbCol: 'modules_r3' },
      { specKey: 'quad_r1',    dbCol: 'modules_r1' },
      { specKey: 'quad_r2',    dbCol: 'modules_r2' },
      { specKey: 'quad_r3',    dbCol: 'modules_r3' },
      { specKey: 'specs_r1',   dbCol: 'modules_r1' },
      { specKey: 'specs_r2',   dbCol: 'modules_r2' },
      { specKey: 'specs_r3',   dbCol: 'modules_r3' },
      { specKey: 'aperture',   dbCol: 'aperture_main' },
      { specKey: 'features',   dbCol: 'features' },
      { specKey: 'video',      dbCol: 'video' },
      { specKey: 'megapixels', dbCol: 'megapixels_main', parse: parseInteger },
    ],
  },
  selfie_camera: {
    table: 'gadget_selfie_camera',
    cols: [
      { specKey: 'modules',    dbCol: 'modules' },
      { specKey: 'single',     dbCol: 'modules' },
      { specKey: 'dual',       dbCol: 'modules' },
      // depth sensor / secondary selfie lens continuation
      { specKey: 'single_r1',  dbCol: 'modules_r1' },
      { specKey: 'dual_r1',    dbCol: 'modules_r1' },
      { specKey: 'modules_r1', dbCol: 'modules_r1' },
      { specKey: 'features',   dbCol: 'features' },
      { specKey: 'video',      dbCol: 'video' },
      { specKey: 'megapixels', dbCol: 'megapixels', parse: parseInteger },
    ],
  },
  sound: {
    table: 'gadget_sound',
    cols: [
      // loudspeaker: full text ("Yes, with stereo speakers", "Yes, with dual speakers (86-decibel)")
      { specKey: 'loudspeaker',   dbCol: 'loudspeaker' },
      { specKey: 'loudspeaker_r1', dbCol: 'loudspeaker_r1' },
      // jack_3_5mm + r1: e.g. "32-bit/384kHz" hi-res audio (Samsung)
      { specKey: '3_5mm_jack',    dbCol: 'jack_3_5mm' },
      { specKey: '3_5mm_jack_r1', dbCol: 'jack_3_5mm_r1' },
      // has_stereo / has_jack: booleans derived in post-processing
      { specKey: 'has_stereo',  dbCol: 'has_stereo', parse: parseBool },
      { specKey: 'has_jack',    dbCol: 'has_jack',   parse: parseBool },
      // audio_info: removed — hi-res audio info is now merged into jack_3_5mm full text
    ],
  },
  comms: {
    table: 'gadget_comms',
    cols: [
      // wlan: full text ("Wi-Fi 802.11 a/b/g/n/ac/6e/7, tri-band, hotspot")
      { specKey: 'wlan',        dbCol: 'wlan' },
      // bluetooth: full text ("6.0, A2DP, LE") — bt_version derived in post-processing
      { specKey: 'bluetooth',   dbCol: 'bluetooth' },
      { specKey: 'bt_version',  dbCol: 'bt_version', parse: parseFloat_safe },
      { specKey: 'positioning', dbCol: 'positioning' },
      { specKey: 'nfc',         dbCol: 'nfc' },
      { specKey: 'has_nfc',     dbCol: 'has_nfc',    parse: parseBool },
      { specKey: 'radio',       dbCol: 'radio' },
      // usb: full text ("USB Type-C 3.2 Gen 2, DisplayPort")
      { specKey: 'usb',         dbCol: 'usb' },
      // wifi_version / usb_version: removed — no such labeled row in GSMArena, info is in wlan/usb text
    ],
  },
  features: {
    table: 'gadget_features',
    cols: [
      { specKey: 'sensors',    dbCol: 'sensors' },
      { specKey: 'sensors_r1', dbCol: 'sensors_r1' },
      { specKey: 'sensors_r2', dbCol: 'sensors_r2' },
      { specKey: 'other',      dbCol: 'other' },
    ],
  },
  battery: {
    table: 'gadget_battery',
    cols: [
      // GSMArena "Type" row = battery description (may be "Market-dependent versions:")
      // with capacity variants in type_r1, type_r2 (<br>-separated)
      { specKey: 'type',          dbCol: 'type' },
      { specKey: 'type',          dbCol: 'capacity_mah',     parse: parseMah },
      { specKey: 'type_r1',       dbCol: 'type_r1' },
      { specKey: 'type_r1',       dbCol: 'capacity_mah',     parse: parseMah },
      { specKey: 'type_r2',       dbCol: 'type_r2' },
      { specKey: 'capacity',      dbCol: 'capacity_mah',     parse: parseMah },
      // Charging: base = wired, r1 = wireless, r2 = reverse
      { specKey: 'charging',      dbCol: 'charging' },
      { specKey: 'charging',      dbCol: 'charging_wired_w', parse: parseWatts },
      { specKey: 'charging_r1',   dbCol: 'charging_r1' },
      { specKey: 'charging_r2',   dbCol: 'charging_r2' },
      { specKey: 'wired_w',       dbCol: 'charging_wired_w', parse: parseWatts },
      { specKey: 'has_wireless',  dbCol: 'has_wireless',     parse: parseBool },
      { specKey: 'wireless_w',    dbCol: 'wireless_w',       parse: parseWatts },
      { specKey: 'has_reverse',   dbCol: 'has_reverse',      parse: parseBool },
    ],
  },
  misc: {
    table: 'gadget_misc',
    cols: [
      { specKey: 'colors',  dbCol: 'colors' },
      { specKey: 'models',  dbCol: 'models' },
      // GSMArena label "SAR" → key "sar", not "sar_us"
      { specKey: 'sar_us',  dbCol: 'sar_us' },
      { specKey: 'sar',     dbCol: 'sar_us' },
      { specKey: 'sar_eu',  dbCol: 'sar_eu' },
      { specKey: 'price',   dbCol: 'price_usd' },
    ],
  },
  // gadget_tests dropped — test scores not stored
};

// ── Spec table read mapping ───────────────────────────────────────────────────
// When reading back from spec tables, maps DB column name → GadgetSpecs key,
// and optionally formats the value to a display string.

interface ReadDef {
  dbCol: string;
  specKey: string;
  format?: (v: any) => string;
}

interface TableReader {
  section: string;
  cols: ReadDef[];
}

const SPEC_READERS: Record<string, TableReader> = {
  gadget_network: {
    section: 'network',
    cols: [
      { dbCol: 'technology',  specKey: 'technology' },
      { dbCol: 'bands_2g',    specKey: 'bands_2g' },
      { dbCol: 'bands_2g_r1', specKey: 'bands_2g_r1' },
      { dbCol: 'bands_3g',    specKey: 'bands_3g' },
      { dbCol: 'bands_3g_r1', specKey: 'bands_3g_r1' },
      { dbCol: 'bands_4g',    specKey: 'bands_4g' },
      { dbCol: 'bands_4g_r1', specKey: 'bands_4g_r1' },
      { dbCol: 'bands_4g_r2', specKey: 'bands_4g_r2' },
      { dbCol: 'bands_4g_r3', specKey: 'bands_4g_r3' },
      { dbCol: 'bands_5g',    specKey: 'bands_5g' },
      { dbCol: 'bands_5g_r1', specKey: 'bands_5g_r1' },
      { dbCol: 'bands_5g_r2', specKey: 'bands_5g_r2' },
      { dbCol: 'bands_5g_r3', specKey: 'bands_5g_r3' },
      { dbCol: 'speed',       specKey: 'speed' },
    ],
  },
  gadget_launch: {
    section: 'launch',
    cols: [
      { dbCol: 'announced', specKey: 'announced' },
      { dbCol: 'status',    specKey: 'status' },
    ],
  },
  gadget_body: {
    section: 'body',
    cols: [
      { dbCol: 'dimensions',       specKey: 'dimensions' },
      { dbCol: 'weight_grams',     specKey: 'weight',           format: (v) => `${v} g` },
      { dbCol: 'build',            specKey: 'build' },
      { dbCol: 'sim',              specKey: 'sim' },
      { dbCol: 'sim_r1',          specKey: 'sim_r1' },
      { dbCol: 'sim_r2',          specKey: 'sim_r2' },
      { dbCol: 'sim_r3',          specKey: 'sim_r3' },
      { dbCol: 'sim_r4',          specKey: 'sim_r4' },
      { dbCol: 'water_resistance', specKey: 'water_resistance' },
    ],
  },
  gadget_display: {
    section: 'display',
    cols: [
      { dbCol: 'type',          specKey: 'type' },
      { dbCol: 'size_inches',   specKey: 'size',        format: (v) => `${v} inches` },
      { dbCol: 'resolution',    specKey: 'resolution' },
      { dbCol: 'protection',    specKey: 'protection' },
      { dbCol: 'protection_r1', specKey: 'protection_r1' },
      { dbCol: 'features',      specKey: 'features' },
      { dbCol: 'cover_display', specKey: 'cover_display' },
      // refresh_rate_hz, ppi: derived cols kept in DB for search, not shown in spec table
    ],
  },
  gadget_platform: {
    section: 'platform',
    cols: [
      { dbCol: 'os',      specKey: 'os' },
      { dbCol: 'chipset', specKey: 'chipset' },
      { dbCol: 'cpu',     specKey: 'cpu' },
      { dbCol: 'gpu',     specKey: 'gpu' },
    ],
  },
  gadget_memory: {
    section: 'memory',
    cols: [
      { dbCol: 'card_slot',   specKey: 'card_slot' },
      { dbCol: 'internal',    specKey: 'internal' },
      { dbCol: 'internal_r1', specKey: 'internal_r1' },
      // storage_type: derived col kept in DB for search, shown via internal_r1 text
    ],
  },
  gadget_main_camera: {
    section: 'main_camera',
    cols: [
      { dbCol: 'modules',    specKey: 'specs' },
      { dbCol: 'modules_r1', specKey: 'specs_r1' },
      { dbCol: 'modules_r2', specKey: 'specs_r2' },
      { dbCol: 'modules_r3', specKey: 'specs_r3' },
      { dbCol: 'features',   specKey: 'features' },
      { dbCol: 'video',      specKey: 'video' },
      // aperture_main, megapixels_main: derived for search, info is in modules text
    ],
  },
  gadget_selfie_camera: {
    section: 'selfie_camera',
    cols: [
      { dbCol: 'modules',    specKey: 'modules' },
      { dbCol: 'modules_r1', specKey: 'modules_r1' },
      { dbCol: 'features',   specKey: 'features' },
      { dbCol: 'video',      specKey: 'video' },
      // megapixels: derived for search, info is in modules text
    ],
  },
  gadget_sound: {
    section: 'sound',
    cols: [
      { dbCol: 'loudspeaker',    specKey: 'loudspeaker' },
      { dbCol: 'loudspeaker_r1', specKey: 'loudspeaker_r1' },
      { dbCol: 'jack_3_5mm',     specKey: '3_5mm_jack' },
      { dbCol: 'jack_3_5mm_r1',  specKey: '3_5mm_jack_r1' },
      // has_stereo, has_jack: derived booleans for search only, not displayed
    ],
  },
  gadget_comms: {
    section: 'comms',
    cols: [
      { dbCol: 'wlan',        specKey: 'wlan' },
      { dbCol: 'bluetooth',   specKey: 'bluetooth' },
      { dbCol: 'positioning', specKey: 'positioning' },
      { dbCol: 'nfc',         specKey: 'nfc' },
      { dbCol: 'radio',       specKey: 'radio' },
      { dbCol: 'usb',         specKey: 'usb' },
      // bt_version, has_nfc: derived for search only, info in bluetooth/nfc text
    ],
  },
  gadget_features: {
    section: 'features',
    cols: [
      { dbCol: 'sensors',    specKey: 'sensors' },
      { dbCol: 'sensors_r1', specKey: 'sensors_r1' },
      { dbCol: 'sensors_r2', specKey: 'sensors_r2' },
      { dbCol: 'other',      specKey: 'other' },
    ],
  },
  gadget_battery: {
    section: 'battery',
    cols: [
      { dbCol: 'type',       specKey: 'type' },
      { dbCol: 'type_r1',    specKey: 'type_r1' },
      { dbCol: 'type_r2',    specKey: 'type_r2' },
      { dbCol: 'charging',   specKey: 'charging' },
      { dbCol: 'charging_r1', specKey: 'charging_r1' },
      { dbCol: 'charging_r2', specKey: 'charging_r2' },
      // capacity_mah, charging_wired_w, has_wireless, wireless_w, has_reverse: derived for search only
    ],
  },
  gadget_misc: {
    section: 'misc',
    cols: [
      { dbCol: 'colors',    specKey: 'colors' },
      { dbCol: 'models',    specKey: 'models' },
      { dbCol: 'sar_us',    specKey: 'sar_us' },
      { dbCol: 'sar_eu',    specKey: 'sar_eu' },
      { dbCol: 'price_usd', specKey: 'price' },
    ],
  },
  // gadget_tests removed
};

// ── Parse helpers ─────────────────────────────────────────────────────────────

function parseGrams(v: string): number | null {
  const m = v.match(/([\d.]+)\s*g/i);
  return m ? parseFloat(m[1]) : null;
}

function parseInches(v: string): number | null {
  const m = v.match(/([\d.]+)\s*inch/i) || v.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function parseMah(v: string): number | null {
  const m = v.match(/([\d,]+)\s*mah/i);
  return m ? parseInt(m[1].replace(',', ''), 10) : null;
}

function parseWatts(v: string): number | null {
  const m = v.match(/([\d.]+)\s*w/i);
  return m ? parseInt(m[1], 10) : null;
}

function parseInteger(v: string): number | null {
  const m = v.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function parseFloat_safe(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function parseBool(v: string): boolean | null {
  if (typeof v === 'boolean') return v;
  const lower = String(v).toLowerCase();
  if (lower === 'yes' || lower === 'true' || lower === '1') return true;
  if (lower === 'no' || lower === 'false' || lower === '0') return false;
  return null;
}

// ── Spec table upsert ─────────────────────────────────────────────────────────

async function upsertSpecTables(
  client: PoolClient,
  productId: string,
  specs: GadgetSpecs
): Promise<void> {
  for (const [sectionKey, sectionData] of Object.entries(specs)) {
    const writer = SPEC_WRITERS[sectionKey];
    if (!writer || !sectionData) continue;

    const colValues: Record<string, any> = {};

    for (const def of writer.cols) {
      const raw = sectionData[def.specKey];
      if (raw == null) continue;
      const val = def.parse ? def.parse(raw) : (raw || null);
      if (val != null) {
        colValues[def.dbCol] = val;
      }
    }

    // ── Post-processing: extract fields embedded inside raw text ─────────────
    // All post-processing uses `merged` (continuation rows already folded in).

    // Display: extract refresh_rate_hz from type text ("AMOLED, 120Hz, HDR10+")
    if (sectionKey === 'display' && !colValues['refresh_rate_hz']) {
      const typeText: string = sectionData['type'] ?? '';
      const hzMatch = typeText.match(/(\d{2,3})\s*Hz/i);
      if (hzMatch) colValues['refresh_rate_hz'] = parseInt(hzMatch[1]);
    }

    // Display: extract ppi from resolution text ("~397 ppi density")
    if (sectionKey === 'display' && !colValues['ppi']) {
      const resText: string = sectionData['resolution'] ?? '';
      const ppiMatch = resText.match(/~?(\d+)\s*ppi/i);
      if (ppiMatch) colValues['ppi'] = parseInt(ppiMatch[1]);
    }

    // Main camera: extract megapixels from "dual"/"triple"/"quad"/"single" raw text
    if (sectionKey === 'main_camera' && !colValues['megapixels_main']) {
      const camText: string =
        sectionData['dual'] ?? sectionData['triple'] ?? sectionData['quad'] ?? sectionData['single'] ?? sectionData['specs'] ?? '';
      const mpMatch = camText.match(/(\d+)\s*MP/i);
      if (mpMatch) colValues['megapixels_main'] = parseInt(mpMatch[1]);
      if (!colValues['aperture_main']) {
        const apMatch = camText.match(/f\/([\d.]+)/i);
        if (apMatch) colValues['aperture_main'] = `f/${apMatch[1]}`;
      }
    }

    // Selfie camera: extract megapixels from "single"/"dual" raw text
    if (sectionKey === 'selfie_camera' && !colValues['megapixels']) {
      const camText: string = sectionData['single'] ?? sectionData['dual'] ?? sectionData['modules'] ?? '';
      const mpMatch = camText.match(/(\d+)\s*MP/i);
      if (mpMatch) colValues['megapixels'] = parseInt(mpMatch[1]);
    }

    // Memory: storage_type — check internal_r1 first (dedicated continuation row),
    // then fall back to extracting from the base internal text
    if (sectionKey === 'memory' && !colValues['storage_type']) {
      const r1Text: string = sectionData['internal_r1'] ?? '';
      const baseText: string = sectionData['internal'] ?? '';
      const searchText = r1Text || baseText;
      const m = searchText.match(/NVMe|UFS\s*[\d.]+|eMMC\s*[\d.]+/i);
      if (m) colValues['storage_type'] = m[0];
    }

    // Battery: derive charging_wired_w, has_wireless, wireless_w, has_reverse
    // from charging text + _rN continuation lines (each <br>-split line is now its own field)
    if (sectionKey === 'battery') {
      const chargingLines = [
        sectionData['charging'] ?? '',
        sectionData['charging_r1'] ?? '',
        sectionData['charging_r2'] ?? '',
      ];
      for (const line of chargingLines) {
        if (!line) continue;
        if (!colValues['charging_wired_w']) {
          const wMatch = line.match(/(\d+(?:\.\d+)?)\s*W\s*wired/i)
            ?? line.match(/Wired[^,\n]*?(\d+(?:\.\d+)?)\s*W/i);
          if (wMatch) colValues['charging_wired_w'] = parseInt(wMatch[1]);
        }
        if (!colValues['wireless_w']) {
          const wMatch = line.match(/(\d+(?:\.\d+)?)\s*W\s*wireless/i);
          if (wMatch) colValues['wireless_w'] = parseInt(wMatch[1]);
        }
        if (!colValues['has_wireless'] && /wireless|magsafe|qi2?/i.test(line)) {
          colValues['has_wireless'] = true;
        }
        if (!colValues['has_reverse'] && /reverse/i.test(line)) {
          colValues['has_reverse'] = true;
        }
      }
    }

    // Sound: detect stereo from loudspeaker text
    if (sectionKey === 'sound' && colValues['has_stereo'] == null) {
      const lsText: string = sectionData['loudspeaker'] ?? '';
      if (/stereo/i.test(lsText)) colValues['has_stereo'] = true;
    }

    // Sound: detect 3.5mm jack
    if (sectionKey === 'sound' && colValues['has_jack'] == null) {
      const jackText: string = sectionData['3_5mm_jack'] ?? '';
      if (jackText) colValues['has_jack'] = !/no/i.test(jackText);
    }

    // Comms: extract NFC boolean
    if (sectionKey === 'comms' && colValues['has_nfc'] == null) {
      const nfcText: string = sectionData['nfc'] ?? '';
      if (nfcText) colValues['has_nfc'] = /yes/i.test(nfcText);
    }

    if (Object.keys(colValues).length === 0) continue;

    const cols = Object.keys(colValues);
    const vals = Object.values(colValues);
    const setClauses = cols.map((c, i) => `${c} = $${i + 2}`).join(', ');
    const colList = cols.join(', ');
    const placeholders = cols.map((_, i) => `$${i + 2}`).join(', ');

    await client.query(
      `INSERT INTO ${writer.table} (product_id, ${colList}, updated_at)
       VALUES ($1, ${placeholders}, NOW())
       ON CONFLICT (product_id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
      [productId, ...vals]
    );
  }
}

// ── Spec table read ───────────────────────────────────────────────────────────

async function loadSpecsByProductId(
  db: Pool | PoolClient,
  productId: string
): Promise<GadgetSpecs> {
  const specs: GadgetSpecs = {};

  for (const [tableName, reader] of Object.entries(SPEC_READERS)) {
    const { rows } = await (db as any).query(
      `SELECT * FROM ${tableName} WHERE product_id = $1`,
      [productId]
    );
    if (!rows.length) continue;

    const row = rows[0];
    const section: Record<string, string> = {};

    for (const def of reader.cols) {
      const val = row[def.dbCol];
      if (val == null) continue;
      const str = def.format ? def.format(val) : String(val);
      if (str) section[def.specKey] = str;
    }

    if (Object.keys(section).length > 0) {
      specs[reader.section] = section;
    }
  }

  return specs;
}

// ── Migrate spec rows between product_ids ─────────────────────────────────────

const ALL_SPEC_TABLES = Object.keys(SPEC_READERS);

async function migrateSpecRows(
  client: PoolClient,
  fromProductId: string,
  toProductId: string
): Promise<void> {
  for (const table of ALL_SPEC_TABLES) {
    // Delete any existing spec rows for destination (to avoid PK conflict)
    await client.query(`DELETE FROM ${table} WHERE product_id = $1`, [toProductId]);
    // Move rows from source to destination
    await client.query(
      `UPDATE ${table} SET product_id = $1, updated_at = NOW() WHERE product_id = $2`,
      [toProductId, fromProductId]
    );
  }
}

// ── Map helpers ───────────────────────────────────────────────────────────────

function mapBrand(row: any): GadgetBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url ?? undefined,
    description: row.description ?? undefined,
    country: row.country ?? undefined,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    deviceCount: row.device_count !== undefined ? parseInt(row.device_count) : undefined,
  };
}

function mapDevice(row: any): GadgetDevice {
  return {
    id: row.id,
    brandId: row.brand_id,
    brandName: row.brand_name ?? undefined,
    brandSlug: row.brand_slug ?? undefined,
    name: row.name,
    slug: row.slug,
    category: row.category,
    imageUrl: row.image_url ?? undefined,
    gsmarenaUrl: row.gsmarena_url ?? undefined,
    announced: row.announced ?? undefined,
    released: row.released ?? undefined,
    status: row.status ?? undefined,
    specs: {},  // populated separately by loadSpecsByProductId
    isPublished: row.is_published,
    productId: row.product_id ?? undefined,
    productSlug: row.product_slug ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ── Service class ─────────────────────────────────────────────────────────────

export class GadgetService {
  constructor(private db: Pool = pool) {}

  // ── Brands ──────────────────────────────────────────────────────────────────

  async listBrands(includeInactive = false): Promise<GadgetBrand[]> {
    const { rows } = await this.db.query(
      `SELECT b.*,
              COUNT(d.id) FILTER (WHERE d.is_published = true) AS device_count
       FROM gadget_brands b
       LEFT JOIN gadget_devices d ON d.brand_id = b.id
       ${includeInactive ? '' : 'WHERE b.is_active = true'}
       GROUP BY b.id
       ORDER BY b.sort_order ASC, b.name ASC`
    );
    return rows.map(mapBrand);
  }

  async getBrandBySlug(slug: string): Promise<GadgetBrand | null> {
    const { rows } = await this.db.query(
      `SELECT b.*,
              COUNT(d.id) FILTER (WHERE d.is_published = true) AS device_count
       FROM gadget_brands b
       LEFT JOIN gadget_devices d ON d.brand_id = b.id
       WHERE b.slug = $1
       GROUP BY b.id`,
      [slug]
    );
    return rows[0] ? mapBrand(rows[0]) : null;
  }

  async upsertBrand(input: Partial<GadgetBrand> & { name: string; slug: string }): Promise<GadgetBrand> {
    const { rows } = await this.db.query(
      `INSERT INTO gadget_brands (name, slug, logo_url, description, country, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         logo_url = COALESCE(EXCLUDED.logo_url, gadget_brands.logo_url),
         description = COALESCE(EXCLUDED.description, gadget_brands.description),
         country = COALESCE(EXCLUDED.country, gadget_brands.country),
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()
       RETURNING *`,
      [
        input.name,
        input.slug,
        input.logoUrl ?? null,
        input.description ?? null,
        input.country ?? null,
        input.isActive ?? true,
        input.sortOrder ?? 0,
      ]
    );
    return mapBrand(rows[0]);
  }

  // ── Devices ─────────────────────────────────────────────────────────────────

  async listDevices(opts: {
    brandSlug?: string;
    category?: string;
    published?: boolean;
    q?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ devices: GadgetDevice[]; total: number }> {
    const conditions: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (opts.brandSlug) {
      conditions.push(`b.slug = $${i++}`);
      values.push(opts.brandSlug);
    }
    if (opts.category) {
      conditions.push(`d.category = $${i++}`);
      values.push(opts.category);
    }
    if (opts.published !== undefined) {
      conditions.push(`d.is_published = $${i++}`);
      values.push(opts.published);
    }
    if (opts.q) {
      conditions.push(`d.name ILIKE $${i++}`);
      values.push(`%${opts.q}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = opts.limit ?? 24;
    const offset = opts.offset ?? 0;

    const countRes = await this.db.query(
      `SELECT COUNT(*) FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id ${where}`,
      values
    );

    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       ${where}
       ORDER BY d.name ASC
       LIMIT $${i++} OFFSET $${i++}`,
      [...values, limit, offset]
    );

    // List views don't load specs (not needed, would be N+1)
    return {
      devices: rows.map(mapDevice),
      total: parseInt(countRes.rows[0].count),
    };
  }

  async getDeviceBySlug(slug: string): Promise<GadgetDevice | null> {
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.slug = $1`,
      [slug]
    );
    if (!rows[0]) return null;

    const device = mapDevice(rows[0]);
    if (device.productId) {
      device.specs = await loadSpecsByProductId(this.db, device.productId);
    }
    return device;
  }

  async getDevicesByIds(ids: string[]): Promise<GadgetDevice[]> {
    if (!ids.length) return [];
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.id = ANY($1) AND d.is_published = true`,
      [ids]
    );
    return this._enrichSpecs(rows.map(mapDevice));
  }

  async getDevicesBySlugs(slugs: string[]): Promise<GadgetDevice[]> {
    if (!slugs.length) return [];
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       LEFT JOIN products p ON p.id = d.product_id
       WHERE d.slug = ANY($1) AND d.is_published = true`,
      [slugs]
    );
    const devices = await this._enrichSpecs(rows.map(mapDevice));
    const map = new Map(devices.map((d) => [d.slug, d]));
    return slugs.map((s) => map.get(s)).filter(Boolean) as GadgetDevice[];
  }

  /** Load specs for multiple devices efficiently */
  private async _enrichSpecs(devices: GadgetDevice[]): Promise<GadgetDevice[]> {
    await Promise.all(
      devices
        .filter((d) => d.productId)
        .map(async (d) => {
          d.specs = await loadSpecsByProductId(this.db, d.productId!);
        })
    );
    return devices;
  }

  /**
   * saveFromCrawl — the primary write path for gadget crawling.
   *
   * In a single transaction:
   *  1. Upserts a `products` row (source_type='gadget', device_category=category)
   *  2. Upserts `gadget_devices` row with product_id pointing to (1)
   *  3. Upserts all 14 spec tables keyed by product_id
   */
  async saveFromCrawl(input: {
    brandId: string;
    brandName: string;
    name: string;
    slug: string;
    category: 'mobile' | 'tablet' | 'smartwatch';
    imageUrl?: string;
    gsmarenaUrl?: string;
    announced?: string;
    released?: string;
    status?: string;
    specs: GadgetSpecs;
    isPublished?: boolean;
    /** If true, product is visible on the public site */
    publishProduct?: boolean;
    /** Category ID to link the product to (product_categories) */
    categoryId?: string;
  }): Promise<GadgetDevice> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      const productCategory = DEVICE_CATEGORY_TO_PRODUCT_CATEGORY[input.category] ?? 'gadget';

      const productIsActive = input.publishProduct !== false;

      // 1. Upsert product
      const productRes = await client.query<{ id: string }>(
        `INSERT INTO products
           (name, slug, category, brand, images, source_type, device_category, is_active, keywords)
         VALUES ($1, $2, $3, $4, $5, 'gadget', $6, $7, $8)
         ON CONFLICT (slug) DO UPDATE SET
           name            = EXCLUDED.name,
           brand           = EXCLUDED.brand,
           images          = EXCLUDED.images,
           source_type     = 'gadget',
           device_category = EXCLUDED.device_category,
           is_active       = EXCLUDED.is_active,
           updated_at      = NOW()
         RETURNING id`,
        [
          input.name,
          input.slug,
          productCategory,
          input.brandName,
          input.imageUrl ? [input.imageUrl] : null,
          input.category,
          productIsActive,
          input.name.split(/\s+/).slice(0, 10),
        ]
      );
      const productId = productRes.rows[0].id;

      // 1b. Link category if provided and publishing
      if (productIsActive && input.categoryId) {
        await client.query(
          `INSERT INTO product_categories (product_id, category_id, is_primary)
           VALUES ($1, $2, true)
           ON CONFLICT (product_id, category_id) DO NOTHING`,
          [productId, input.categoryId]
        );
      }

      // 2. Upsert gadget_devices (no specs column)
      await client.query(
        `INSERT INTO gadget_devices
           (brand_id, product_id, name, slug, category, image_url, gsmarena_url,
            announced, released, status, is_published)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (slug) DO UPDATE SET
           brand_id    = EXCLUDED.brand_id,
           product_id  = EXCLUDED.product_id,
           name        = EXCLUDED.name,
           category    = EXCLUDED.category,
           image_url   = COALESCE(EXCLUDED.image_url, gadget_devices.image_url),
           gsmarena_url= COALESCE(EXCLUDED.gsmarena_url, gadget_devices.gsmarena_url),
           announced   = COALESCE(EXCLUDED.announced, gadget_devices.announced),
           released    = COALESCE(EXCLUDED.released, gadget_devices.released),
           status      = COALESCE(EXCLUDED.status, gadget_devices.status),
           is_published= EXCLUDED.is_published,
           updated_at  = NOW()`,
        [
          input.brandId,
          productId,
          input.name,
          input.slug,
          input.category,
          input.imageUrl ?? null,
          input.gsmarenaUrl ?? null,
          input.announced ?? null,
          input.released ?? null,
          input.status ?? null,
          input.isPublished ?? false,
        ]
      );

      // 3. Upsert spec tables
      await upsertSpecTables(client, productId, input.specs);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Return full device with specs loaded
    return (await this.getDeviceBySlug(input.slug))!;
  }

  /** Get specs for a product_id (used by detail + compare pages) */
  async getSpecsByProductId(productId: string): Promise<GadgetSpecs> {
    return loadSpecsByProductId(this.db, productId);
  }

  /**
   * updateSpecs — writes to the 14 spec tables via the device's product_id.
   * Used by the admin PUT /devices/:id route.
   */
  async updateSpecs(deviceId: string, specs: GadgetSpecs): Promise<void> {
    const { rows } = await this.db.query(
      'SELECT product_id FROM gadget_devices WHERE id = $1',
      [deviceId]
    );
    if (!rows[0]?.product_id) {
      throw new Error(`Device ${deviceId} has no linked product — save via crawl first`);
    }
    const productId: string = rows[0].product_id;

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await upsertSpecTables(client, productId, specs);
      await client.query(
        'UPDATE gadget_devices SET updated_at = NOW() WHERE id = $1',
        [deviceId]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async setPublished(id: string, published: boolean): Promise<void> {
    await this.db.query(
      `UPDATE gadget_devices SET is_published = $1, updated_at = NOW() WHERE id = $2`,
      [published, id]
    );
  }

  async deleteDevice(id: string, deleteProduct = false): Promise<void> {
    if (deleteProduct) {
      const { rows } = await this.db.query(
        'SELECT product_id FROM gadget_devices WHERE id = $1',
        [id]
      );
      const productId: string | null = rows[0]?.product_id ?? null;
      await this.db.query('DELETE FROM gadget_devices WHERE id = $1', [id]);
      if (productId) {
        await this.db.query('DELETE FROM products WHERE id = $1', [productId]);
      }
    } else {
      await this.db.query('DELETE FROM gadget_devices WHERE id = $1', [id]);
    }
  }

  /** Find the gadget device linked to a given product slug */
  async getDeviceByProductSlug(productSlug: string): Promise<GadgetDevice | null> {
    const { rows } = await this.db.query(
      `SELECT d.*, b.name AS brand_name, b.slug AS brand_slug, p.slug AS product_slug
       FROM gadget_devices d
       JOIN gadget_brands b ON b.id = d.brand_id
       JOIN products p ON p.id = d.product_id
       WHERE p.slug = $1
       LIMIT 1`,
      [productSlug]
    );
    if (!rows[0]) return null;
    const device = mapDevice(rows[0]);
    if (device.productId) {
      device.specs = await loadSpecsByProductId(this.db, device.productId);
    }
    return device;
  }

  /** Get price entries for the product linked to a gadget device */
  async getPricesForDevice(deviceSlug: string): Promise<{
    productId: string;
    productSlug: string;
    productName: string;
    prices: Array<{
      id: string; source: string; sourceUrl: string; affiliateUrl?: string;
      price: number; currency: string; isAvailable: boolean;
    }>;
  } | null> {
    const device = await this.getDeviceBySlug(deviceSlug);
    if (!device?.productId) return null;

    const { rows } = await this.db.query(
      `SELECT pe.id, pe.source_name AS source, pe.source_url, pe.affiliate_url,
              pe.price, pe.currency, pe.is_available,
              p.slug AS product_slug, p.name AS product_name
       FROM price_entries pe
       JOIN products p ON p.id = pe.product_id
       WHERE pe.product_id = $1
       ORDER BY pe.price ASC`,
      [device.productId]
    );

    if (!rows.length) return null;

    return {
      productId: device.productId,
      productSlug: rows[0].product_slug,
      productName: rows[0].product_name,
      prices: rows.map((r: any) => ({
        id: r.id,
        source: r.source,
        sourceUrl: r.source_url,
        affiliateUrl: r.affiliate_url ?? undefined,
        price: parseFloat(r.price),
        currency: r.currency,
        isAvailable: r.is_available,
      })),
    };
  }

  /**
   * linkProduct — manually re-link a gadget device to a different product.
   *
   * Also migrates spec rows from the old product to the new one, so specs
   * remain accessible after re-linking. The old product keeps its other data
   * (name, prices, etc.) but loses its gadget spec rows.
   */
  async linkProduct(deviceId: string, productId: string | null): Promise<void> {
    const { rows } = await this.db.query(
      'SELECT product_id FROM gadget_devices WHERE id = $1',
      [deviceId]
    );
    const oldProductId: string | null = rows[0]?.product_id ?? null;

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE gadget_devices SET product_id = $1, updated_at = NOW() WHERE id = $2`,
        [productId, deviceId]
      );

      // Migrate spec rows if re-linking to a different (non-null) product
      if (oldProductId && productId && oldProductId !== productId) {
        await migrateSpecRows(client, oldProductId, productId);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * resyncDevice — re-crawl GSMArena and overwrite specs + device meta.
   * Returns the updated device, or throws if the device has no gsmarenaUrl.
   */
  async resyncDevice(
    deviceId: string,
    crawlFn: (url: string) => Promise<{
      specs: GadgetSpecs;
      announced?: string;
      released?: string;
      status?: string;
      imageUrl?: string;
    }>
  ): Promise<void> {
    const { rows } = await this.db.query(
      `SELECT product_id, gsmarena_url FROM gadget_devices WHERE id = $1`,
      [deviceId]
    );
    const row = rows[0];
    if (!row?.gsmarena_url) throw new Error('Device không có gsmarenaUrl — không thể resync');
    if (!row?.product_id)   throw new Error('Device chưa có product_id — save lại từ crawl trước');

    const result = await crawlFn(row.gsmarena_url);

    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Update device meta fields if crawl returned new values
      await client.query(
        `UPDATE gadget_devices
         SET announced  = COALESCE($1, announced),
             released   = COALESCE($2, released),
             status     = COALESCE($3, status),
             image_url  = COALESCE($4, image_url),
             updated_at = NOW()
         WHERE id = $5`,
        [
          result.announced ?? null,
          result.released  ?? null,
          result.status    ?? null,
          result.imageUrl  ?? null,
          deviceId,
        ]
      );

      // Overwrite all spec tables
      await upsertSpecTables(client, row.product_id, result.specs);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /** Update brand metadata (logo, description, active state) */
  async updateBrand(
    id: string,
    updates: { logoUrl?: string; description?: string; isActive?: boolean; sortOrder?: number }
  ): Promise<void> {
    await this.db.query(
      `UPDATE gadget_brands
       SET logo_url    = COALESCE($1, logo_url),
           description = COALESCE($2, description),
           is_active   = COALESCE($3, is_active),
           sort_order  = COALESCE($4, sort_order),
           updated_at  = NOW()
       WHERE id = $5`,
      [
        updates.logoUrl ?? null,
        updates.description ?? null,
        updates.isActive ?? null,
        updates.sortOrder ?? null,
        id,
      ]
    );
  }
}

export const gadgetService = new GadgetService();
