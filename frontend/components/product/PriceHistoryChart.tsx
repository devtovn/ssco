'use client';

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { PriceHistory } from '@kombe/types';
import { formatPrice } from '@/lib/utils/format';

interface PriceHistoryChartProps {
  history: PriceHistory;
  onDaysChange?: (days: number) => void;
}

const DAY_OPTIONS = [7, 30, 90];

export function PriceHistoryChart({ history, onDaysChange }: PriceHistoryChartProps) {
  const [days, setDays] = useState(30);

  const chartData = useMemo(() => {
    return history.entries.map((entry) => ({
      date: new Date(entry.date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      }),
      price: entry.price,
      available: entry.isAvailable ? 1 : 0,
    }));
  }, [history.entries]);

  const avgPrice =
    chartData.length > 0
      ? chartData.reduce((sum, d) => sum + d.price, 0) / chartData.length
      : 0;

  const handleDays = (d: number) => {
    setDays(d);
    onDaysChange?.(d);
  };

  if (chartData.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-600">
        Chưa có lịch sử giá.
      </p>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Biểu đồ giá</h2>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDays(d)}
              className={`rounded-lg px-3 py-1 text-sm font-medium ${
                days === d
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      <p className="mb-2 text-sm text-slate-500">
        Xu hướng:{' '}
        <span className="font-medium capitalize">
          {history.trend === 'increasing'
            ? 'tăng'
            : history.trend === 'decreasing'
              ? 'giảm'
              : 'ổn định'}
        </span>
        {avgPrice > 0 && (
          <span className="ml-2">· Giá TB: {formatPrice(avgPrice)}</span>
        )}
      </p>

      <div className="h-64 w-full md:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                new Intl.NumberFormat('vi-VN', {
                  notation: 'compact',
                  compactDisplay: 'short',
                }).format(v)
              }
            />
            <Tooltip
              formatter={(value: number) => [formatPrice(value), 'Giá']}
              labelStyle={{ color: '#334155' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="price"
              name="Giá"
              stroke="#0284c7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
