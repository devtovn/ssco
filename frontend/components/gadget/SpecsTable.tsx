'use client';

import { useState, useEffect } from 'react';
import type { GadgetSpecs } from '@/lib/api/gadget';

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
  // Detect mobile (< sm = 640px) — same breakpoint as CompareTable
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

        if (isMobile) {
          /*
           * Mobile: vertical section label (18px) + field label (120px) + value.
           * Same approach as CompareTable mobile — section label rotated 90°,
           * rowspan spans the whole section, sticky left:0.
           * Changes naturally as each <table> scrolls into view.
           */
          return (
            <table
              key={section.key}
              className="w-full border-collapse text-sm"
              style={{ tableLayout: 'fixed', minWidth: '100%' }}
            >
              <colgroup>
                <col style={{ width: 18 }} />
                <col style={{ width: 120 }} />
                <col />
              </colgroup>
              <tbody>
                {entries.map(([fieldKey, value], fIdx) => (
                  <tr
                    key={fieldKey}
                    className={`border-b border-slate-200 transition-colors${
                      fIdx % 2 === 1 ? ' bg-slate-50/50' : ''
                    } hover:bg-amber-50/40`}
                  >
                    {/* Vertical section label — first row only, spans whole section */}
                    {fIdx === 0 && (
                      <td
                        rowSpan={entries.length}
                        className="border-r border-slate-200 bg-white p-0"
                        style={{ verticalAlign: 'middle' }}
                      >
                        <span
                          className="block font-black text-[9px] tracking-widest select-none"
                          style={{
                            color: '#a0192d',
                            writingMode: 'vertical-rl',
                            transform: 'rotate(180deg)',
                            whiteSpace: 'nowrap',
                            padding: '6px 3px',
                          }}
                        >
                          {section.label}
                        </span>
                      </td>
                    )}
                    <td className="border-r border-slate-100 px-3 py-2 align-top font-semibold text-slate-700">
                      {labelFor(fieldKey)}
                    </td>
                    <td className="px-3 py-2 text-slate-900 leading-relaxed">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

        /*
         * Desktop / tablet: original 3-column layout
         * (section label | field label | value)
         */
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
                  className={`border-b border-slate-200${
                    fIdx % 2 === 1 ? ' bg-slate-50/50' : ''
                  } hover:bg-amber-50/40 transition-colors`}
                >
                  {fIdx === 0 && (
                    <td
                      rowSpan={entries.length}
                      className={`border-r border-slate-200 px-4 py-2.5 align-top font-black text-[13px] tracking-wider${
                        sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                      }`}
                      style={{ color: '#a0192d', verticalAlign: 'top' }}
                    >
                      {section.label}
                    </td>
                  )}
                  <td className={`border-r border-slate-100 px-4 py-2.5 align-top font-semibold text-slate-700${
                    fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                  }`}>
                    {labelFor(fieldKey)}
                  </td>
                  <td className={`px-4 py-2.5 text-slate-900 leading-relaxed${
                    fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                  }`}>
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
