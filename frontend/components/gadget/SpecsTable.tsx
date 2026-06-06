'use client';

import { useState, useEffect } from 'react';
import type { GadgetSpecs } from '@/lib/api/gadget';

const SECTIONS: { key: string; label: string }[] = [
  { key: 'network',       label: 'MẠNG' },
  { key: 'launch',        label: 'RA MẮT' },
  { key: 'body',          label: 'THIẾT KẾ' },
  { key: 'display',       label: 'MÀN HÌNH' },
  { key: 'platform',      label: 'NỀN TẢNG' },
  { key: 'memory',        label: 'BỘ NHỚ' },
  { key: 'main_camera',   label: 'CAMERA SAU' },
  { key: 'selfie_camera', label: 'CAMERA TRƯỚC' },
  { key: 'sound',         label: 'ÂM THANH' },
  { key: 'comms',         label: 'KẾT NỐI' },
  { key: 'features',      label: 'TÍNH NĂNG' },
  { key: 'battery',       label: 'PIN' },
  { key: 'misc',          label: 'THÔNG TIN KHÁC' },
];

const FIELD_LABELS: Record<string, string> = {
  // Network
  technology: 'Công nghệ', bands_2g: 'Băng tần 2G', bands_3g: 'Băng tần 3G',
  bands_4g: 'Băng tần 4G', bands_5g: 'Băng tần 5G', speed: 'Tốc độ',
  // Launch
  announced: 'Công bố', status: 'Tình trạng',
  // Body
  dimensions: 'Kích thước', weight: 'Trọng lượng', build: 'Chất liệu',
  sim: 'SIM', water_resistance: 'Kháng nước',
  // Display
  type: 'Loại', size: 'Kích cỡ', resolution: 'Độ phân giải',
  protection: 'Kính bảo vệ', features: 'Tính năng',
  refresh_rate: 'Tần số quét', density: 'Mật độ điểm ảnh',
  cover_display: 'Màn hình phụ',
  // Platform
  os: 'Hệ điều hành', chipset: 'Chip xử lý', cpu: 'CPU', gpu: 'GPU',
  // Memory
  card_slot: 'Khe thẻ nhớ', internal: 'Bộ nhớ trong',
  // Camera
  specs: 'Thông số camera', modules: 'Cụm camera', video: 'Quay video',
  megapixels: 'Độ phân giải', aperture: 'Khẩu độ',
  // Sound
  loudspeaker: 'Loa ngoài', '3_5mm_jack': 'Jack 3.5mm',
  // Comms
  wlan: 'Wi-Fi', bluetooth: 'Bluetooth', positioning: 'Định vị',
  nfc: 'NFC', radio: 'Radio FM', usb: 'USB',
  // Features
  sensors: 'Cảm biến', other: 'Khác',
  // Battery (type key is shared with Display — labelFor falls back to base key → 'Loại')
  charging: 'Sạc',
  // Misc
  colors: 'Màu sắc', models: 'Phiên bản',
  sar_us: 'SAR (Mỹ)', sar_eu: 'SAR (EU)',
};

function baseKey(key: string): string {
  return key.replace(/_r\d+$/, '');
}

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? FIELD_LABELS[baseKey(key)]
    ?? baseKey(key).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Group fields: base key + all _rN continuation keys → one display row.
 * Returns array of { label, value } where value is the joined multi-line string.
 */
function groupFields(fields: Record<string, string>): { key: string; label: string; value: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string; value: string }[] = [];

  for (const key of Object.keys(fields)) {
    const base = baseKey(key);
    if (seen.has(base)) continue;
    seen.add(base);

    // Collect base + all _rN values in order
    const lines: string[] = [];
    if (fields[base] != null) lines.push(fields[base]);
    for (let i = 1; ; i++) {
      const rKey = `${base}_r${i}`;
      if (fields[rKey] == null) break;
      lines.push(fields[rKey]);
    }

    result.push({
      key: base,
      label: labelFor(base),
      value: lines.join('\n'),
    });
  }

  return result;
}

interface SpecsTableProps {
  specs: GadgetSpecs;
  brandName?: string;
}

export function SpecsTable({ specs }: SpecsTableProps) {
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

  const HIDDEN_FIELDS: Record<string, string[]> = {
    misc: ['price', 'sar_us', 'sar_eu'],
  };

  if (!orderedSections.length) {
    return <p className="text-sm text-slate-500">Chưa có thông số kỹ thuật.</p>;
  }

  return (
    <div>
      {orderedSections.map((section, sIdx) => {
        const fields = specs[section.key];
        if (!fields) return null;
        const hidden = HIDDEN_FIELDS[section.key] ?? [];
        const entries = groupFields(fields).filter(({ key }) => !hidden.includes(key));

        if (isMobile) {
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
                {entries.map(({ key, label, value }, fIdx) => (
                  <tr
                    key={key}
                    className={`border-b border-slate-200 transition-colors${
                      fIdx % 2 === 1 ? ' bg-slate-50/50' : ''
                    } hover:bg-amber-50/40`}
                  >
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
                      {label}
                    </td>
                    <td className="px-3 py-2 text-slate-900 leading-relaxed whitespace-pre-line">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }

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
              {entries.map(({ key, label, value }, fIdx) => (
                <tr
                  key={key}
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
                    {label}
                  </td>
                  <td className={`px-4 py-2.5 text-slate-900 leading-relaxed whitespace-pre-line${
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
