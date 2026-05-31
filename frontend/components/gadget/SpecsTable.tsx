'use client';

import type { GadgetSpecs } from '@/lib/api/gadget';

// Human-readable section labels (same order as GSMArena)
const SECTION_LABELS: Record<string, string> = {
  network:       'Mạng',
  launch:        'Ra mắt',
  body:          'Ngoại hình',
  display:       'Màn hình',
  platform:      'Nền tảng',
  memory:        'Bộ nhớ',
  main_camera:   'Camera sau',
  selfie_camera: 'Camera trước',
  sound:         'Âm thanh',
  comms:         'Kết nối',
  features:      'Tính năng',
  battery:       'Pin',
  misc:          'Khác',
  tests:         'Kiểm tra',
};

const SECTION_ORDER = Object.keys(SECTION_LABELS);

// Human-readable field labels
const FIELD_LABELS: Record<string, string> = {
  technology:       'Công nghệ',
  announced:        'Công bố',
  status:           'Tình trạng',
  dimensions:       'Kích thước',
  weight:           'Trọng lượng',
  build:            'Chất liệu',
  sim:              'SIM',
  water_resistance: 'Kháng nước',
  type:             'Loại',
  size:             'Kích thước màn hình',
  resolution:       'Độ phân giải',
  features:         'Tính năng',
  os:               'Hệ điều hành',
  chipset:          'Chipset',
  cpu:              'CPU',
  gpu:              'GPU',
  card_slot:        'Thẻ nhớ',
  internal:         'Bộ nhớ trong',
  specs:            'Thông số',
  video:            'Video',
  loudspeaker:      'Loa ngoài',
  '3_5mm_jack':     'Jack 3.5mm',
  wlan:             'Wi-Fi',
  bluetooth:        'Bluetooth',
  gps:              'GPS',
  nfc:              'NFC',
  usb:              'USB',
  sensors:          'Cảm biến',
  capacity:         'Dung lượng',
  charging:         'Sạc',
  colors:           'Màu sắc',
  models:           'Model',
  sar_us:           'SAR (Mỹ)',
  sar_eu:           'SAR (EU)',
  price:            'Giá',
};

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface SpecsTableProps {
  specs: GadgetSpecs;
}

export function SpecsTable({ specs }: SpecsTableProps) {
  const orderedSections = [
    ...SECTION_ORDER.filter((k) => specs[k]),
    ...Object.keys(specs).filter((k) => !SECTION_ORDER.includes(k) && specs[k]),
  ];

  if (!orderedSections.length) {
    return <p className="text-sm text-slate-500">Chưa có thông số kỹ thuật.</p>;
  }

  return (
    <div className="space-y-6">
      {orderedSections.map((section) => {
        const fields = specs[section];
        if (!fields || !Object.keys(fields).length) return null;
        return (
          <div key={section} className="overflow-hidden rounded-2xl border border-slate-200">
            {/* Section header */}
            <div className="bg-slate-800 px-4 py-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
                {SECTION_LABELS[section] ?? section}
              </h3>
            </div>
            {/* Fields */}
            <table className="w-full text-sm">
              <tbody>
                {Object.entries(fields).map(([key, value], idx) => (
                  <tr
                    key={key}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                  >
                    <td className="w-2/5 px-4 py-2.5 font-medium text-slate-600">
                      {labelFor(key)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-900">
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
