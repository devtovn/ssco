/**
 * Add _rN continuation columns to gadget spec tables.
 *
 * GSMArena stores multiple unlabeled continuation rows under a single labeled
 * row (e.g. SIM has 4 continuation rows on iPhone 17 Pro Max, bands_4g has 3
 * model-variant rows). Instead of merging them into one text blob, each row
 * gets its own column: sim_r1, sim_r2, … bands_4g_r1, bands_4g_r2, …
 *
 * Columns are pre-created to cover the maximum observed across mobile,
 * tablet, and smartwatch so all 3 device types share one table.
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── gadget_body ────────────────────────────────────────────────────────────
  // sim_r0 = base "sim" column (already exists), r1..r4 cover:
  //   r1: eSIM-only USA / tablet "Stylus support" / watch "IP6X dust tight"
  //   r2: Nano-SIM + Nano-SIM China
  //   r3: IP68 rating (mobile)
  //   r4: Apple Pay (mobile)
  pgm.addColumns('gadget_body', {
    sim_r1: { type: 'text' },
    sim_r2: { type: 'text' },
    sim_r3: { type: 'text' },
    sim_r4: { type: 'text' },
  });

  // ── gadget_network ─────────────────────────────────────────────────────────
  // bands_4g / bands_5g: iPhone 17 Pro Max has 4 model variants → base + r1..r3
  // bands_2g / bands_3g: 1 continuation row (CDMA / regional variant)
  pgm.addColumns('gadget_network', {
    bands_2g_r1: { type: 'text' },
    bands_3g_r1: { type: 'text' },
    bands_4g_r1: { type: 'text' },
    bands_4g_r2: { type: 'text' },
    bands_4g_r3: { type: 'text' },
    bands_5g_r1: { type: 'text' },
    bands_5g_r2: { type: 'text' },
    bands_5g_r3: { type: 'text' },
  });

  // ── gadget_display ─────────────────────────────────────────────────────────
  // protection_r1: "Anti-reflective coating" (mobile) / "Wide-angle OLED" (watch)
  pgm.addColumns('gadget_display', {
    protection_r1: { type: 'text' },
  });

  // ── gadget_memory ──────────────────────────────────────────────────────────
  // internal_r1: storage type row — "NVMe" (Apple), "UFS 4.0" (Samsung)
  pgm.addColumns('gadget_memory', {
    internal_r1: { type: 'text' },
  });

  // ── gadget_sound ──────────────────────────────────────────────────────────
  // jack_3_5mm_r1: "32-bit/384kHz" hi-res audio info (Samsung)
  // loudspeaker_r1: safety column for edge-case continuation rows
  pgm.addColumns('gadget_sound', {
    loudspeaker_r1: { type: 'text' },
    jack_3_5mm_r1:  { type: 'text' },
  });

  // ── gadget_features ───────────────────────────────────────────────────────
  // sensors_r1: "Ultra Wideband chip / Emergency SOS..." (mobile)
  //             "Temperature sensing (0.01° accuracy)" (watch)
  pgm.addColumns('gadget_features', {
    sensors_r1: { type: 'text' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('gadget_body',     ['sim_r1', 'sim_r2', 'sim_r3', 'sim_r4']);
  pgm.dropColumns('gadget_network',  ['bands_2g_r1', 'bands_3g_r1',
                                      'bands_4g_r1', 'bands_4g_r2', 'bands_4g_r3',
                                      'bands_5g_r1', 'bands_5g_r2', 'bands_5g_r3']);
  pgm.dropColumns('gadget_display',  ['protection_r1']);
  pgm.dropColumns('gadget_memory',   ['internal_r1']);
  pgm.dropColumns('gadget_sound',    ['loudspeaker_r1', 'jack_3_5mm_r1']);
  pgm.dropColumns('gadget_features', ['sensors_r1']);
}
