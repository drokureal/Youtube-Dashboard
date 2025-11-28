"use client";
import React from 'react';
import { computeRpm } from '@/lib/store';
import type { SeriesKey } from '@/lib/types';

type Props = {
  totalViews: number;
  totalWatchTimeMinutes: number;
  totalSubsNet: number;
  totalRevenueUsd: number;
  active: SeriesKey;
  onSelect: (series: SeriesKey) => void;
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n));
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export default function MetricsCards({ totalViews, totalWatchTimeMinutes, totalSubsNet, totalRevenueUsd, active, onSelect }: Props) {
  const rpm = computeRpm(totalRevenueUsd, totalViews);
  const cards: Array<{ key: SeriesKey | 'rpm'; label: string; value: string }> = [
    { key: 'views', label: 'Views', value: formatNumber(totalViews) },
    { key: 'watchTimeMinutes', label: 'Watch time (hours)', value: formatNumber(totalWatchTimeMinutes / 60) },
    { key: 'subsNet', label: 'Subscribers', value: formatNumber(totalSubsNet) },
    { key: 'revenueUsd', label: 'Revenue', value: formatCurrency(totalRevenueUsd) },
    { key: 'rpm', label: 'RPM', value: `$${rpm.toFixed(2)}` },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((c) => {
        const isActive = c.key === active || (c.key === 'rpm' && active === 'revenueUsd');
        const clickable = c.key !== 'rpm';
        return (
          <button
            key={c.label}
            onClick={() => clickable && onSelect(c.key as SeriesKey)}
            className={
              `text-left rounded-lg border p-4 shadow-sm transition-all focus:outline-none focus:ring-4 ` +
              (isActive
                ? 'border-blue-500 bg-blue-600/10 ring-blue-500 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800')
            }
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">{c.label}</div>
            <div className="mt-1 text-lg font-semibold">{c.value}</div>
          </button>
        );
      })}
    </div>
  );
}



