'use client';

import type { GadgetSpecs } from '@/lib/api/gadget';

/**
 * GSMArena-style specs table.
 * Each section: section label (red, left) | field rows (label | value).
 */

const SECTIONS: { key: string; label: string }[] = [
  { key: 'network',       label: 'NETWORK' },
  { key: 'launch',        label: 'LAUNCH' },
  { key: 'body',          label: 'BODY' },
  { key: 'display',       label: 'DISPLAY' },
  { key: 'platform',      label: 'PLATFORM' },
  { key: 'memory',        label: 'MEMORY' },
  { key: 'main_camera',   label: 'MAIN CAMERA' },
  { key: 'selfie_camera', label: 'SELFIE CAMERA' },
  { key: 'sound',         label: 'SOUND' },
  { key: 'comms',         label: 'COMMS' },
  { key: 'features',      label: 'FEATURES' },
  { key: 'battery',       label: 'BATTERY' },
  { key: 'misc',          label: 'MISC' },
  { key: 'tests',         label: 'TESTS' },
];

const FIELD_LABELS: Record<string, string> = {
  technology: 'Technology', announced: 'Announced', status: 'Status',
  dimensions: 'Dimensions', weight: 'Weight', build: 'Build', sim: 'SIM',
  water_resistance: 'Water resistance',
  type: 'Type', size: 'Size', resolution: 'Resolution', protection: 'Protection',
  features: 'Features', refresh_rate: 'Refresh rate',
  os: 'OS', chipset: 'Chipset', cpu: 'CPU', gpu: 'GPU',
  card_slot: 'Card slot', internal: 'Internal',
  specs: 'Specs', modules: 'Modules', video: 'Video',
  loudspeaker: 'Loudspeaker', '3_5mm_jack': '3.5mm jack',
  wlan: 'WLAN', bluetooth: 'Bluetooth', positioning: 'Positioning',
  gps: 'Positioning', nfc: 'NFC', radio: 'Radio', usb: 'USB',
  sensors: 'Sensors', other: 'Other',
  capacity: 'Capacity', charging: 'Charging',
  colors: 'Colors', models: 'Models',
  sar_us: 'SAR', sar_eu: 'SAR EU', price: 'Price',
  speed: 'Speed', bands_2g: '2G bands', bands_3g: '3G bands',
  bands_4g: '4G bands', bands_5g: '5G bands',
};

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SpecsTableProps {
  specs: GadgetSpecs;
  brandName?: string;
}

export function SpecsTable({ specs }: SpecsTableProps) {
  const knownKeys = SECTIONS.map((s) => s.key);
  const orderedSections = [
    ...SECTIONS.filter((s) => specs[s.key] && Object.keys(specs[s.key]).length),
    ...Object.keys(specs)
      .filter((k) => !knownKeys.includes(k) && specs[k] && Object.keys(specs[k]).length)
      .map((k) => ({ key: k, label: k.replace(/_/g, ' ').toUpperCase() })),
  ];

  if (!orderedSections.length) {
    return <p className="text-sm text-slate-500">Chưa có thông số kỹ thuật.</p>;
  }

  return (
    <div>
      {orderedSections.map((section, sIdx) => {
        const fields = specs[section.key];
        if (!fields) return null;
        const entries = Object.entries(fields);

        return (
          <table
            key={section.key}
            className="w-full border-collapse text-sm"
            style={{ tableLayout: 'fixed' }}
          >
            <colgroup>
              <col className="w-[140px]" />
              <col className="w-[140px]" />
              <col />
            </colgroup>
            <tbody>
              {entries.map(([fieldKey, value], fIdx) => (
                <tr
                  key={fieldKey}
                  className={`border-b border-slate-200${fIdx % 2 === 1 ? ' bg-slate-50/50' : ''} hover:bg-amber-50/40 transition-colors`}
                >
                  {/* Section label — first row only, rowSpan */}
                  {fIdx === 0 && (
                    <td
                      rowSpan={entries.length}
                      className={`border-r border-slate-200 px-4 py-2.5 align-top font-black text-[13px] tracking-wider${sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''}`}
                      style={{ color: '#a0192d', verticalAlign: 'top' }}
                    >
                      {section.label}
                    </td>
                  )}
                  {/* Field label */}
                  <td className={`border-r border-slate-100 px-4 py-2.5 align-top font-semibold text-slate-700${fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''}`}>
                    {labelFor(fieldKey)}
                  </td>
                  {/* Value */}
                  <td className={`px-4 py-2.5 text-slate-900 leading-relaxed${fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''}`}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      })}
    </div>
  );
}
