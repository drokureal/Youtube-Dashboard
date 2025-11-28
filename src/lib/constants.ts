export const REQUIRED_FILENAMES = {
  views: 'views.csv',
  watchTime: 'watch_time.csv',
  subscribers: 'subscribers.csv',
  revenue: 'revenue.csv',
} as const;

export const DATE_RANGES = [
  { key: '28d', label: 'Last 28 days', days: 28 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: '365d', label: 'Last 365 days', days: 365 },
  { key: 'all', label: 'Lifetime', days: Infinity },
] as const;



