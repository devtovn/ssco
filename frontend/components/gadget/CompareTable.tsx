'use client';

import { useState, useEffect } from 'react';
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

// Column widths (px)
const COL_SECTION        = 80;   // desktop: section label col
const COL_FIELD          = 120;  // desktop: field label col
const COL_SECTION_MOBILE = 18;   // mobile:  thin vertical-text section col
const COL_FIELD_MOBILE   = 108;  // mobile:  field label col
const COL_DEV_DESKTOP    = 150;
const COL_DEV_MOBILE     = 130;

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
}

export function CompareTable({ devices, mode }: CompareTableProps) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const activeSections = SECTIONS.filter((s) => devices.some((d) => d.specs[s.key]));

  return (
    <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
      <table
        className="border-collapse text-sm"
        style={{
          tableLayout: 'fixed',
          width: '100%',
          minWidth: isMobile
            ? COL_SECTION_MOBILE + COL_FIELD_MOBILE + devices.length * COL_DEV_MOBILE
            : COL_SECTION + COL_FIELD + devices.length * COL_DEV_DESKTOP,
        }}
      >
        <colgroup>
          {isMobile
            ? <><col style={{ width: COL_SECTION_MOBILE }} /><col style={{ width: COL_FIELD_MOBILE }} /></>
            : <><col style={{ width: COL_SECTION }} /><col style={{ width: COL_FIELD }} /></>
          }
          {devices.map((d) => (
            <col key={d.slug} style={{ minWidth: isMobile ? COL_DEV_MOBILE : COL_DEV_DESKTOP }} />
          ))}
        </colgroup>

        {/* ── Frozen header row ─────────────────────────────────────── */}
        <thead>
          <tr className="border-b-2 border-slate-300">
            {isMobile ? (
              /* Mobile: colspan=2 covers thin section col + field col */
              <th
                colSpan={2}
                className="sticky top-0 z-30 border-r-2 border-slate-300 bg-slate-50 px-2 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                style={{ left: 0 }}
              >
                TB
              </th>
            ) : (
              <th
                colSpan={2}
                className="sticky top-0 z-30 border-r-2 border-slate-300 bg-slate-50 px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                style={{ left: 0 }}
              >
                Thiết bị
              </th>
            )}
            {devices.map((d) => (
              <th
                key={d.slug}
                className="sticky top-0 z-20 border-r border-slate-200 bg-white px-3 py-2 text-left last:border-r-0"
              >
                <span className="block text-[10px] font-normal leading-none text-slate-400">{d.brandName}</span>
                <span className="block truncate text-[13px] font-bold leading-snug text-slate-800">{d.name}</span>
              </th>
            ))}
          </tr>
        </thead>

        {/* ── Data rows — each section its own <tbody> ──────────────── */}
        {activeSections.map((section, sIdx) => {
          const keys = allKeysForSection(devices, section.key);
          const filteredKeys = keys.filter((fieldKey) => {
            if (mode === 'full' || mode === 'highlight') return true;
            const values = devices.map((d) => d.specs[section.key]?.[fieldKey] ?? '—');
            return values.length >= 2 && values.some((v) => v !== values[0]);
          });
          if (!filteredKeys.length) return null;

          /* ── MOBILE ─────────────────────────────────────────────────
           * Section label: thin col (18px), vertical text, rowspan all rows.
           * sticky left:0 — docked to left edge.
           * Changes automatically as each <tbody> scrolls into view.
           * Field label: sticky left:18px.
           * No sticky header rows → no stacking issue.
           * ─────────────────────────────────────────────────────────── */
          if (isMobile) {
            return (
              <tbody key={section.key}>
                {filteredKeys.map((fieldKey, fIdx) => {
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
                      {/* Vertical section label — first row only, spans whole section */}
                      {fIdx === 0 && (
                        <td
                          rowSpan={filteredKeys.length}
                          className="sticky z-10 border-r border-slate-200 bg-white p-0"
                          style={{ left: 0, verticalAlign: 'middle' }}
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

                      {/* Field label — sticky left:COL_SECTION_MOBILE */}
                      <td
                        className={`sticky z-10 border-r border-slate-100 bg-white px-2 py-2 align-top font-semibold${
                          muted ? ' text-slate-400' : ' text-slate-700'
                        }`}
                        style={{ left: COL_SECTION_MOBILE }}
                      >
                        {labelFor(fieldKey)}
                      </td>

                      {values.map((val, i) => (
                        <td
                          key={i}
                          className={`border-r border-slate-100 px-3 py-2 leading-relaxed last:border-r-0${
                            muted ? ' text-slate-400' : ' text-slate-900'
                          }`}
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            );
          }

          /* ── DESKTOP / TABLET ──────────────────────────────────────── */
          return (
            <tbody key={section.key}>
              {filteredKeys.map((fieldKey, fIdx) => {
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
                        className={`sticky z-10 border-r border-slate-200 bg-white px-2 py-2 align-top font-black text-[11px] tracking-wider${
                          sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                        }`}
                        style={{ left: 0, color: '#a0192d', verticalAlign: 'top' }}
                      >
                        {section.label}
                      </td>
                    )}
                    <td
                      className={`sticky z-10 border-r border-slate-100 bg-white px-2 py-2 align-top font-semibold${
                        fIdx === 0 && sIdx > 0 ? ' border-t-2 border-t-slate-300' : ''
                      }${muted ? ' text-slate-400' : ' text-slate-700'}`}
                      style={{ left: COL_SECTION }}
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
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
