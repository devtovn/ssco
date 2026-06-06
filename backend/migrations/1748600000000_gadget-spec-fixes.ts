/**
 * Gadget spec fixes migration
 * - Drop gadget_tests table (test scores not stored)
 * - Add cover_display column to gadget_display (foldables)
 * - Add audio_info column to gadget_sound
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Drop gadget_tests — test scores (AnTuTu, LUFS, battery hours) not stored
  pgm.dropTable('gadget_tests', { ifExists: true });

  // gadget_display: add cover_display for foldables
  pgm.addColumns('gadget_display', {
    cover_display: { type: 'text' },
  });

  // gadget_sound: add audio_info for "32-bit/384kHz audio" etc.
  pgm.addColumns('gadget_sound', {
    audio_info: { type: 'text' },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Recreate gadget_tests if rolling back
  pgm.createTable('gadget_tests', {
    product_id: { type: 'text', primaryKey: true, references: 'products(id)', onDelete: 'CASCADE' },
    display_score:    { type: 'text' },
    loudspeaker_lufs: { type: 'text' },
    battery_hours:    { type: 'numeric(5,1)' },
    updated_at: { type: 'timestamptz', default: pgm.func('NOW()') },
  });
  pgm.dropColumns('gadget_display', ['cover_display']);
  pgm.dropColumns('gadget_sound', ['audio_info']);
}
