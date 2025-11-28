"use client";
import React, { useEffect, useMemo, useState } from 'react';
import UploadArea from '@/components/UploadArea';
import MetricsCards from '@/components/MetricsCards';
import TimeSeriesChart from '@/components/TimeSeriesChart';
import { loadStored, combineDailyAcrossChannels, computeTotals, filterDailyByDateRange } from '@/lib/store';
import type { ChannelData, DateFilter, SeriesKey } from '@/lib/types';

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Dashboard />
    </main>
  );
}

function Dashboard() {
  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('28d');
  const [series, setSeries] = useState<SeriesKey>('views');

  useEffect(() => {
    loadStored().then((s) => {
      if (s?.channels) setChannels(s.channels);
      setLoaded(true);
    });
  }, []);

  const visibleChannels = useMemo(() => {
    if (selectedChannels.length === 0) return channels;
    const set = new Set(selectedChannels);
    return channels.filter((c) => set.has(c.channelName));
  }, [channels, selectedChannels]);

  const combined = useMemo(() => combineDailyAcrossChannels(visibleChannels), [visibleChannels]);
  const filtered = useMemo(() => filterDailyByDateRange(combined, dateFilter), [combined, dateFilter]);
  const totals = useMemo(() => computeTotals(filtered), [filtered]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Studio overview</h1>
        <div className="flex items-center gap-3 text-xs text-gray-600">
          <DateFilterSelect value={dateFilter} onChange={setDateFilter} availableDates={combined.map((d) => d.date)} />
          <div>{visibleChannels.length} / {channels.length} channel(s)</div>
        </div>
      </div>
      <UploadArea existingChannels={channels} onImported={setChannels} />

      {loaded && combined.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500">
          Upload channel folders to see your combined analytics.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <MetricsCards
            totalViews={totals.views}
            totalWatchTimeMinutes={totals.watchTimeMinutes}
            totalSubsNet={totals.subsNet}
            totalRevenueUsd={totals.revenueUsd}
            active={series}
            onSelect={setSeries}
          />

              <div className="grid grid-cols-1">
                <TimeSeriesChart data={filtered} series={series} title={seriesToTitle(series)} />
              </div>
            </div>
            <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 text-sm font-medium">Channels</div>
              <ChannelFilter
                all={channels.map((c) => c.channelName)}
                selected={selectedChannels}
                onChange={setSelectedChannels}
              />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function seriesToTitle(s: SeriesKey): string {
  if (s === 'views') return 'Views';
  if (s === 'watchTimeMinutes') return 'Watch time (min)';
  if (s === 'subsNet') return 'Subscribers';
  return 'Revenue';
}

function DateFilterSelect({ value, onChange, availableDates }: { value: DateFilter; onChange: (v: DateFilter) => void; availableDates: string[] }) {
  const months = [
    'January','February','March','April','May','June','July','August','September','October','November','December'
  ];
  const pad = (n: number) => String(n).padStart(2, '0');
  const today = new Date();
  const format = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Derive available years and months from the data
  const years = Array.from(new Set(availableDates.map((d) => d.slice(0, 4)))).map((s) => Number(s)).sort((a, b) => b - a);
  const yearMonths = Array.from(new Set(availableDates.map((d) => d.slice(0, 7)))).sort().reverse(); // ['YYYY-MM']

  // Only include presets that intersect available data
  const presets = [
    { label: 'Last 7 days', value: '7d' as DateFilter, range: (() => { const s = new Date(today); s.setDate(today.getDate() - 6); return [format(s), format(today)] as const; })() },
    { label: 'Last 28 days', value: '28d' as DateFilter, range: (() => { const s = new Date(today); s.setDate(today.getDate() - 27); return [format(s), format(today)] as const; })() },
    { label: 'Last 90 days', value: '90d' as DateFilter, range: (() => { const s = new Date(today); s.setDate(today.getDate() - 89); return [format(s), format(today)] as const; })() },
    { label: 'Last 365 days', value: '365d' as DateFilter, range: (() => { const s = new Date(today); s.setDate(today.getDate() - 364); return [format(s), format(today)] as const; })() },
  ].filter((p) => availableDates.some((d) => d >= p.range[0] && d <= p.range[1]));

  const hasAny = availableDates.length > 0;

  // If current selection has no data, fall back to 'all' when possible
  React.useEffect(() => {
    if (!hasAny) return;
    const matches = (d: string) => availableDates.includes(d);
    const intersect = (start: string, end: string) => availableDates.some((d) => d >= start && d <= end);
    let ok = true;
    if (value === 'all') ok = hasAny;
    else if (value === '7d' || value === '28d' || value === '90d' || value === '365d') {
      const n = value === '7d' ? 6 : value === '28d' ? 27 : value === '90d' ? 89 : 364;
      const s = new Date(today); s.setDate(today.getDate() - n);
      ok = intersect(format(s), format(today));
    } else if (value.startsWith('year:')) {
      const y = Number(value.split(':')[1]);
      ok = availableDates.some((d) => d.startsWith(String(y)));
    } else if (value.startsWith('month:')) {
      const ym = value.split(':')[1];
      ok = availableDates.some((d) => d.startsWith(ym));
    } else if (value.startsWith('range:')) {
      const [s, e] = value.split(':')[1].split('..');
      ok = intersect(s, e);
    }
    if (!ok) onChange('all');
  }, [value, availableDates, onChange]);

  function handleCustomRange() {
    const start = prompt('Start date (YYYY-MM-DD)');
    if (!start) return;
    const end = prompt('End date (YYYY-MM-DD)');
    if (!end) return;
    onChange(`range:${start}..${end}`);
  }

  return (
    <div className="relative">
      <select
        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
        value={value}
        onChange={(e) => onChange(e.target.value as DateFilter)}
      >
        {presets.map((p) => (
          <option key={p.label} value={p.value}>{p.label}</option>
        ))}
        {hasAny && <option value="all">Lifetime</option>}
        {years.map((y) => (
          <option key={`year-${y}`} value={`year:${y}` as DateFilter}>{y}</option>
        ))}
        {yearMonths.map((ym) => {
          const [y, m] = ym.split('-');
          const label = `${months[Number(m) - 1]} ${y}`;
          return (
            <option key={`month-${ym}`} value={`month:${ym}` as DateFilter}>{label}</option>
          );
        })}
      </select>
      <button
        className="ml-2 rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
        onClick={handleCustomRange}
        type="button"
      >
        Custom
      </button>
    </div>
  );
}

function ChannelFilter({
  all,
  selected,
  onChange,
}: {
  all: string[];
  selected: string[];
  onChange: (names: string[]) => void;
}) {
  function toggle(name: string) {
    const set = new Set(selected);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange(Array.from(set));
  }
  function isAllSelected() {
    return selected.length === 0 || selected.length === all.length;
  }
  function selectAll() {
    onChange([]); // empty means all
  }
  return (
    <div className="space-y-1 text-sm">
      <button className="mb-2 text-xs text-blue-600 hover:underline" onClick={selectAll}>
        {isAllSelected() ? 'All channels selected' : 'Select all'}
      </button>
      <ul className="space-y-1">
        {all.map((name) => (
          <li key={name}>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selected.length === 0 ? true : selected.includes(name)}
                onChange={() => toggle(name)}
              />
              <span className="text-xs">{name}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
