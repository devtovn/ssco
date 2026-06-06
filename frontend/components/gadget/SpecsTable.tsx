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
  { key: 'tests',         label: 'KIỂM THỬ' },
];

const FIELD_LABELS: Record<string, string> = {
  technology: 'Công nghệ', announced: 'Công bố', status: 'Tình trạng',
  dimensions: 'Kích thước', weight: 'Trọng lượng', build: 'Chất liệu', sim: 'SIM',
  water_resistance: 'Kháng nước',
  type: 'Loại', size: 'Kích cỡ', resolution: 'Độ phân giải', protection: 'Kính bảo vệ',
  features: 'Tính năng', refresh_rate: 'Tần số quét',
  os: 'Hệ điều hành', chipset: 'Chip xử lý', cpu: 'CPU', gpu: 'GPU',
  card_slot: 'Khe thẻ nhớ', internal: 'Bộ nhớ trong',
  specs: 'Thông số', modules: 'Module', video: 'Quay video',
  loudspeaker: 'Loa ngoài', '3_5mm_jack': 'Jack 3.5mm',
  wlan: 'Wi-Fi', bluetooth: 'Bluetooth', positioning: 'Định vị',
  gps: 'Định vị', nfc: 'NFC', radio: 'Radio FM', usb: 'USB',
  sensors: 'Cảm biến', other: 'Khác',
  capacity: 'Dung lượng', charging: 'Sạc',
  colors: 'Màu sắc', models: 'Phiên bản',
  sar_us: 'SAR (Mỹ)', sar_eu: 'SAR (EU)', price: 'Giá tham khảo',
  speed: 'Tốc độ', bands_2g: 'Băng tần 2G', bands_3g: 'Băng tần 3G',
  bands_4g: 'Băng tần 4G', bands_5g: 'Băng tần 5G',
  aperture: 'Khẩu độ', megapixels: 'Độ phân giải',
  wired_charging: 'Sạc có dây', wireless_charging: 'Sạc không dây',
  reverse_charging: 'Sạc ngược', nfc_supported: 'Hỗ trợ NFC',
  stereo_speakers: 'Loa stereo', audio_jack: 'Jack tai nghe',
  wifi_version: 'Phiên bản Wi-Fi', bt_version: 'Phiên bản Bluetooth',
  usb_version: 'Phiên bản USB',
  display_score: 'Điểm màn hình', loudspeaker_lufs: 'Độ to loa (LUFS)',
  battery_endurance: 'Thời lượng pin',
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
        const entries = Object.entries(fields).filter(([k]) => !hidden.includes(k));

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
