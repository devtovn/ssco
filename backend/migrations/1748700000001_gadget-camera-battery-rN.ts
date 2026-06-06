/**
 * Add _rN continuation columns for camera modules and battery variants.
 *
 * Background: GSMArena puts multiple lens specs (Triple camera), battery
 * capacity variants, and charging type lines inside a single .nfo cell
 * separated by <br>. After fixing the crawler to split these, we need
 * dedicated columns to store each part.
 *
 * Also adds sensors_r2 (Features section has 3 sensor rows on iPhone).
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // gadget_main_camera: up to 4 camera modules (wide + telephoto + ultrawide + TOF)
  pgm.addColumns('gadget_main_camera', {
    modules_r1: { type: 'text' },
    modules_r2: { type: 'text' },
    modules_r3: { type: 'text' },
  });

  // gadget_selfie_camera: front camera + depth sensor row
  pgm.addColumns('gadget_selfie_camera', {
    modules_r1: { type: 'text' },
  });

  // gadget_battery:
  //   type_r1, type_r2 — capacity variants (e.g. Nano SIM model / eSIM model)
  //   charging_r1      — wireless charging line
  //   charging_r2      — reverse charging line
  pgm.addColumns('gadget_battery', {
    type_r1:     { type: 'text' },
    type_r2:     { type: 'text' },
    charging_r1: { type: 'text' },
    charging_r2: { type: 'text' },
  });

  // gadget_features: sensors_r2 for 3rd sensor row (Emergency SOS / satellite)
  pgm.addColumns('gadget_features', {
    sensors_r2: { type: 'text' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('gadget_main_camera',  ['modules_r1', 'modules_r2', 'modules_r3']);
  pgm.dropColumns('gadget_selfie_camera', ['modules_r1']);
  pgm.dropColumns('gadget_battery',       ['type_r1', 'type_r2', 'charging_r1', 'charging_r2']);
  pgm.dropColumns('gadget_features',      ['sensors_r2']);
}
