export type DailyMetrics = {
  date: string; // YYYY-MM-DD
  views: number;
  watchTimeMinutes: number;
  subsNet: number;
  revenueUsd: number;
};

export type ChannelData = {
  channelName: string;
  daily: DailyMetrics[]; // sorted by date asc
};

export type StoredData = {
  channels: ChannelData[];
  updatedAt: string; // ISO timestamp
};

export type DateRangeKey = '28d' | '90d' | '365d' | 'all';

export type CombinedDaily = DailyMetrics & {
  rpm: number; // computed per-day RPM
};

export type UploadResult = {
  channels: ChannelData[];
  errors: string[];
  warnings: string[];
};

// UI-related helper types
export type SeriesKey = 'views' | 'watchTimeMinutes' | 'subsNet' | 'revenueUsd';

// A simple string-encoded date filter used by the UI and store helpers
// Examples: '7d', '28d', '365d', 'all', 'year:2025', 'month:2025-07'
export type DateFilter =
  | '7d'
  | '28d'
  | '90d'
  | '365d'
  | 'all'
  | `year:${number}`
  | `month:${number}-${number}`
  | `range:${string}..${string}`;



