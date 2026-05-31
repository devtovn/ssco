'use client';

import type { GadgetDevice, GadgetSpecs } from '@/lib/api/gadget';

const SECTION_LABELS: Record<string, string> = {
  network: 'Mạng', launch: 'Ra mắt', body: 'Ngoại hình', display: 'Màn hình',
  platform: 'Nền tảng', memory: 'Bộ nhớ', main_camera: 'Camera sau',
  selfie_camera: 'Camera trước', sound: 'Âm thanh', comms: 'Kết nối',
  features: 'Tính năng', battery: 'Pin', misc: 'Khác',
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

const FIELD_LABELS: Record<string, string> = {
  technology: 'Công nghệ', announced: 'Công bố', status: 'Tình trạng',
  dimensions: 'Kích thước', weight: 'Trọng lượng', build: 'Chất liệu', sim: 'SIM',
  water_resistance: 'Kháng nước', type: 'Loại', size: 'Màn hình', resolution: 'Độ phân giải',
  os: 'Hệ điều hành', chipset: 'Chipset', cpu: 'CPU', gpu: 'GPU',
  card_slot: 'Thẻ nhớ', internal: 'Bộ nhớ trong', specs: 'Thông số', video: 'Video',
  loudspeaker: 'Loa ngoài', '3_5mm_jack': 'Jack 3.5mm', wlan: 'Wi-Fi',
  bluetooth: 'Bluetooth', gps: 'GPS', nfc: 'NFC', usb: 'USB', sensors: 'Cảm biến',
  capacity: 'Dung lượng', charging: 'Sạc', colors: 'Màu sắc', price: 'Giá',
};

function labelFor(key: string) {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Collect all field keys across all devices for a given section
function allKeysForSection(devices: GadgetDevice[], section: string): string[] {
  const keys = new Set<string>();
  for (const d of devices) {
    for (const k of Object.keys(d.specs[section] ?? {})) keys.add(k);
  }
  return Array.from(keys);
}

interface CompareTableProps {
  devices: GadgetDevice[];
  onRemove?: (slug: string) => void;
}

export function CompareTable({ devices, onRemove }: CompareTableProps) {
  const sections = [
    ...SECTION_ORDER.filter((s) => devices.some((d) => d.specs[s])),
  ];

  const CATEGORY_ICONS: Record<string, string> = {
    mobile: '📱', tablet: '📲', smartwatch: '⌚',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        {/* Device header row */}
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500" />
            {devices.map((d) => (
              <th key={d.slug} className="px-4 py-3 text-center">
                <div className="flex flex-col items-center gap-1">
                  {d.imageUrl ? (
                    <img src={d.imageUrl} alt={d.name} className="mx-auto h-20 w-20 object-contain" />
                  ) : (
                    <span className="text-5xl">{CATEGORY_ICONS[d.category] ?? '📱'}</span>
                  )}
                  <span className="block text-xs text-slate-500">{d.brandName}</span>
                  <span className="block font-semibold text-slate-900 leading-tight">{d.name}</span>
                  {onRemove && (
                    <button
                      onClick={() => onRemove(d.slug)}
                      className="mt-1 rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      Xoá
                    </button>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sections.map((section) => {
            const keys = allKeysForSection(devices, section);
            return (
              <>
                {/* Section heading */}
                <tr key={`section-${section}`} className="bg-slate-800">
                  <td
                    colSpan={devices.length + 1}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
                  >
                    {SECTION_LABELS[section] ?? section}
                  </td>
                </tr>

                {/* Field rows */}
                {keys.map((key, idx) => {
                  const values = devices.map((d) => d.specs[section]?.[key] ?? '—');
                  return (
                    <tr
                      key={`${section}-${key}`}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-600">
                        {labelFor(key)}
                      </td>
                      {values.map((val, i) => (
                        <td
                          key={i}
                          className="px-4 py-2.5 text-center text-slate-900"
                        >
                          {val}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
