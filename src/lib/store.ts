import type { StoredData, ChannelData, DailyMetrics, DateFilter } from './types';

export async function loadStored(): Promise<StoredData | null> {
  try {
    const response = await fetch('/api/channels', { cache: 'no-store' });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      channels: data.channels || [],
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function saveStored(channels: ChannelData[]): Promise<void> {
  await fetch('/api/channels/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channels }),
  });
}

export async function clearStored(): Promise<void> {
  // No-op for now, individual channels can be deleted via API
}

export async function deleteChannel(channelName: string): Promise<void> {
  await fetch(`/api/channels/delete?name=${encodeURIComponent(channelName)}`, {
    method: 'DELETE',
  });
}

export function mergeChannels(existing: ChannelData[], incoming: ChannelData[]): ChannelData[] {
  const map = new Map<string, ChannelData>();
  for (const ch of existing) map.set(ch.channelName, ch);
  for (const inc of incoming) {
    const prev = map.get(inc.channelName);
    if (!prev) {
      map.set(inc.channelName, inc);
      continue;
    }
    const byDate = new Map(prev.daily.map((d) => [d.date, d] as const));
    for (const d of inc.daily) {
      byDate.set(d.date, d);
    }
    const mergedDaily = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    map.set(inc.channelName, { channelName: inc.channelName, daily: mergedDaily });
  }
  return Array.from(map.values()).sort((a, b) => a.channelName.localeCompare(b.channelName));
}

export function combineDailyAcrossChannels(channels: ChannelData[]): DailyMetrics[] {
  const dateMap = new Map<string, DailyMetrics>();
  for (const ch of channels) {
    for (const d of ch.daily) {
      const cur = dateMap.get(d.date) ?? { date: d.date, views: 0, watchTimeMinutes: 0, subsNet: 0, revenueUsd: 0 };
      cur.views += d.views;
      cur.watchTimeMinutes += d.watchTimeMinutes;
      cur.subsNet += d.subsNet;
      cur.revenueUsd += d.revenueUsd;
      dateMap.set(d.date, cur);
    }
  }
  return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeTotals(daily: DailyMetrics[]) {
  return daily.reduce(
    (acc, d) => {
      acc.views += d.views;
      acc.watchTimeMinutes += d.watchTimeMinutes;
      acc.subsNet += d.subsNet;
      acc.revenueUsd += d.revenueUsd;
      return acc;
    },
    { views: 0, watchTimeMinutes: 0, subsNet: 0, revenueUsd: 0 }
  );
}

export function computeRpm(totalRevenueUsd: number, totalViews: number): number {
  if (!totalViews) return 0;
  return totalRevenueUsd / (totalViews / 1000);
}

export function filterDailyByDateRange(daily: DailyMetrics[], filter: DateFilter): DailyMetrics[] {
  if (filter === 'all') return daily;
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  function formatLocal(d: Date): string {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
  }
  function parseLocal(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map((x) => Number(x));
    return new Date(y, m - 1, d);
  }
  // last N days helpers
  const lastNDays = (n: number) => {
    if (daily.length === 0) return daily;
    // Use last available date in the dataset as the window end
    const endStr = daily[daily.length - 1].date;
    const end = parseLocal(endStr);
    const start = new Date(end);
    start.setDate(end.getDate() - (n - 1));
    const startStr = formatLocal(start);
    return daily.filter((d) => d.date >= startStr && d.date <= endStr);
  };
  if (filter === '7d') return lastNDays(7);
  if (filter === '28d') return lastNDays(28);
  if (filter === '90d') return lastNDays(90);
  if (filter === '365d') return lastNDays(365);

  if (filter.startsWith('year:')) {
    const year = Number(filter.split(':')[1]);
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    return daily.filter((d) => d.date >= start && d.date <= end);
  }
  if (filter.startsWith('month:')) {
    // month:YYYY-MM (1-indexed month)
    const ym = filter.split(':')[1];
    const [yStr, mStr] = ym.split('-');
    const y = Number(yStr);
    const m = Number(mStr);
    const startStr = `${y}-${pad(m)}-01`;
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const endStr = `${y}-${pad(m)}-${pad(lastDay)}`;
    return daily.filter((d) => d.date >= startStr && d.date <= endStr);
  }
  if (filter.startsWith('range:')) {
    // range:YYYY-MM-DD..YYYY-MM-DD
    const payload = filter.split(':')[1];
    const [startStr, endStr] = payload.split('..');
    return daily.filter((d) => d.date >= startStr && d.date <= endStr);
  }
  return daily;
}



