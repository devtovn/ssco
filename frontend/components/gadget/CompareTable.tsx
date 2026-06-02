'use client';

import type { GadgetDevice } from '@/lib/api/gadget';

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
  colors: 'Colors', models: 'Models', sar_us: 'SAR', sar_eu: 'SAR EU',
  price: 'Price', speed: 'Speed',
  bands_2g: '2G bands', bands_3g: '3G bands', bands_4g: '4G bands', bands_5g: '5G bands',
};

function labelFor(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function allKeysForSection(devices: GadgetDevice[], section: string): string[] {
  const keys = new Set<string>();
  for (const d of devices) {
    for (const k of Object.keys(d.specs[section] ?? {})) keys.add(k);
  }
  return Array.from(keys);
}

export type CompareMode = 'full' | 'differences' | 'highlight';

interface CompareTableProps {
  devices: GadgetDevice[];
  mode: CompareMode;
  /** px offset from viewport top for sticky device-name header row */
  stickyTop?: number;
}

export function CompareTable({ devices, mode, stickyTop = 104 }: CompareTableProps) {
  const activeSections = SECTIONS.filter((s) => devices.some((d) => d.specs[s.key]));

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col className="w-[120px]" />
          <col className="w-[140px]" />
          {devices.map((d) => (
            <col key={d.slug} />
          ))}
        </colgroup>

        {/* Sticky device-name header — sticks below mode toggle bar */}
        <thead>
          <tr>
            {/* Section col — empty */}
            <th
              style={{ top: stickyTop }}
              className="sticky z-10 border-b-2 border-r border-slate-300 bg-white"
            />
            {/* Field label col — empty */}
            <th
              style={{ top: stickyTop }}
              className="sticky z-10 border-b-2 border-r border-slate-200 bg-white"
            />
            {/* Device name per column */}
            {devices.map((d) => (
              <th
                key={d.slug}
                style={{ top: stickyTop }}
                className="sticky z-10 border-b-2 border-r border-slate-200 bg-white px-3 py-2 text-left last:border-r-0"
              >
                <span className="block text-[10px] font-normal leading-none text-slate-400">
                  {d.brandName}
                </span>
                <span className="block truncate text-[13px] font-bold leading-snug text-slate-800">
                  {d.name}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {activeSections.map((section, sIdx) => {
            const keys = allKeysForSection(devices, section.key);

            const filteredKeys = keys.filter((fieldKey) => {
              if (mode === 'full' || mode === 'highlight') return true;
              const values = devices.map((d) => d.specs[section.key]?.[fieldKey] ?? '—');
              return values.length >= 2 && values.some((v) => v !== values[0]);
            });

            if (!filteredKeys.length) return null;

            return filteredKeys.map((fieldKey, fIdx) => {
              const values = devices.map((d) => d.specs[section.key]?.[fieldKey] ?? '—');
              const isDiff = values.length >= 2 && values.some((v) => v !== values[0]);
              const muted = mode === 'highlight' && !isDiff;

              return (
                <tr
                  key={`${section.key}-${fieldKey}`}
                  className={`border-b border-slate-200 transition-colors${
                    fIdx % 2 === 1 ? ' bg-slate-50/50' : ''
                  } hover:bg-amber-50/30`}
                >
                  {fIdx === 0 && (
                    <td
                      rowSpan={filteredKeys.length}
                      className={`border-r border-slate-200 px-3 py-2 align-top font-black text-[13px] tracking-wider${sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''}`}
                      style={{ color: '#a0192d', verticalAlign: 'top' }}
                    >
                      {section.label}
                    </td>
                  )}

                  <td
                    className={`border-r border-slate-100 px-3 py-2 align-top font-semibold${
                      fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                    }${muted ? ' text-slate-400' : ' text-slate-700'}`}
                  >
                    {labelFor(fieldKey)}
                  </td>

                  {values.map((val, i) => (
                    <td
                      key={i}
                      className={`border-r border-slate-100 px-3 py-2 leading-relaxed last:border-r-0${
                        fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                      }${muted ? ' text-slate-400' : ' text-slate-900'}`}
                    >
                      {val}
                    </td>
                  ))}
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
