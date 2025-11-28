import Papa from 'papaparse';
import { parseISO, isValid } from 'date-fns';
import type { ChannelData, DailyMetrics, UploadResult } from './types';
import { REQUIRED_FILENAMES } from './constants';

type CsvRow = Record<string, string>;

function normalizeDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  const parsed = parseISO(trimmed);
  if (!isValid(parsed)) return null;
  return trimmed.slice(0, 10);
}

function parseNumber(value: string): number {
  // Strip everything except digits, minus, and dot, then parse
  const cleaned = value.replace(/[^0-9.-]/g, '').replace(/(\..*?)\./g, '$1');
  if (cleaned.trim() === '') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseCsv(text: string): CsvRow[] {
  const res = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  if (res.errors?.length) {
    // We still return what we have; errors can be reported by caller
  }
  return (res.data || []).map((row) => Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? '').trim()])
  ));
}

export async function parseChannelFolder(folderName: string, files: File[]): Promise<ChannelData> {
  const { channel } = await parseChannelFolderWithWarnings(folderName, files);
  return channel;
}

export async function parseUploadDirectoryEntries(entries: File[]): Promise<UploadResult> {
  // Expect multiple folders uploaded via input webkitdirectory
  const byFolder = new Map<string, File[]>();
  for (const f of entries) {
    const anyFile = f as File & { webkitRelativePath?: string };
    const path = anyFile.webkitRelativePath || f.name;
    const parts = path.split('/');
    const folder = parts.length > 1 ? parts[0] : f.name.replace(/\.(csv)$/i, '');
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(f);
  }

  const channels: ChannelData[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [folder, fs] of byFolder.entries()) {
    try {
      const { channel, warnings: ws } = await parseChannelFolderWithWarnings(folder, fs);
      channels.push(channel);
      if (ws.length) warnings.push(...ws.map((w) => `${folder}: ${w}`));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(message);
    }
  }

  return { channels, errors, warnings };
}

// --- Enhanced detection support ---

type RequiredKind = keyof typeof REQUIRED_FILENAMES; // 'views' | 'watchTime' | 'subscribers' | 'revenue'

function detectCsvKind(text: string): RequiredKind | null {
  const rows = parseCsv(text);
  const first = rows[0] ?? {};
  const keys = Object.keys(first);
  const keysStr = keys.join(' ');

  const contains = (substr: string) => keysStr.includes(substr);
  const hasWord = (word: string) => keys.some((k) => k === word);

  // Prioritize distinctive identifiers to avoid misclassification
  if (contains('revenue')) return 'revenue';
  if (contains('watch') && (contains('minute') || contains('hour'))) return 'watchTime';
  if (contains('subs') || contains('subscriber')) return 'subscribers';
  if (hasWord('views') || contains('view')) return 'views';
  return null;
}

export async function parseChannelFolderWithWarnings(
  folderName: string,
  files: File[],
): Promise<{ channel: ChannelData; warnings: string[] }> {
  const warnings: string[] = [];
  const lowerNameToFile = new Map(files.map((f) => [f.name.toLowerCase(), f]));

  const assigned = new Map<RequiredKind, File>();

  // 1) Assign by expected filenames (case-insensitive)
  (Object.entries(REQUIRED_FILENAMES) as Array<[RequiredKind, string]>).forEach(([kind, expected]) => {
    const byExact = lowerNameToFile.get(expected);
    if (byExact) assigned.set(kind, byExact);
  });

  // 2) Detect remaining kinds by inspecting CSV headers
  const remainingKinds = (Object.keys(REQUIRED_FILENAMES) as RequiredKind[]).filter((k) => !assigned.has(k));
  if (remainingKinds.length > 0) {
    const alreadyUsed = new Set(Array.from(assigned.values()));
    const csvFiles = files.filter((f) => !alreadyUsed.has(f) && f.name.toLowerCase().endsWith('.csv'));
    const detectedByKind = new Map<RequiredKind, { file: File; name: string }>();

    for (const f of csvFiles) {
      try {
        const text = await f.text();
        const kind = detectCsvKind(text);
        if (!kind) continue;
        if (assigned.has(kind)) {
          // Already set by exact filename
          warnings.push(`Duplicate ${kind} file detected ("${f.name}") — using "${assigned.get(kind)!.name}".`);
          continue;
        }
        if (detectedByKind.has(kind)) {
          const chosen = detectedByKind.get(kind)!;
          warnings.push(`Multiple files look like ${kind}; using "${chosen.name}" and ignoring "${f.name}".`);
          continue;
        }
        detectedByKind.set(kind, { file: f, name: f.name });
        if (f.name.toLowerCase() !== REQUIRED_FILENAMES[kind]) {
          warnings.push(`Detected ${kind} by content from "${f.name}" (expected name "${REQUIRED_FILENAMES[kind]}").`);
        }
      } catch {
        // ignore read errors; they will be surfaced later if truly missing
      }
    }

    for (const [kind, info] of detectedByKind) {
      if (!assigned.has(kind)) assigned.set(kind, info.file);
    }
  }

  // 3) Validate we have all required kinds
  const missingKinds = (Object.keys(REQUIRED_FILENAMES) as RequiredKind[]).filter((k) => !assigned.has(k));
  if (missingKinds.length > 0) {
    throw new Error(
      `Missing file(s) in ${folderName}: ${missingKinds.map((k) => REQUIRED_FILENAMES[k]).join(', ')}`,
    );
  }

  // 4) Parse assigned files
  const [viewsText, watchText, subsText, revenueText] = await Promise.all([
    assigned.get('views')!.text(),
    assigned.get('watchTime')!.text(),
    assigned.get('subscribers')!.text(),
    assigned.get('revenue')!.text(),
  ]);

  const viewsRows = parseCsv(viewsText);
  const watchRows = parseCsv(watchText);
  const subsRows = parseCsv(subsText);
  const revRows = parseCsv(revenueText);

  const dateToMetrics = new Map<string, DailyMetrics>();

  function upsert(date: string, updater: (m: DailyMetrics) => void) {
    let m = dateToMetrics.get(date);
    if (!m) {
      m = { date, views: 0, watchTimeMinutes: 0, subsNet: 0, revenueUsd: 0 };
      dateToMetrics.set(date, m);
    }
    updater(m);
  }

  for (const r of viewsRows) {
    const date = normalizeDate(r.date || r['day'] || r['date'] || '');
    if (!date) continue;
    const views = parseNumber(
      r.views || r['view'] || r['views (estimated)'] || r['estimated views'] || r['views_estimated'] || '',
    );
    upsert(date, (m) => {
      m.views = views;
    });
  }

  for (const r of watchRows) {
    const date = normalizeDate(r.date || '');
    if (!date) continue;
    const keys = Object.keys(r);
    let minutes = 0;
    // Prefer explicit minutes fields
    if (
      'watch_time_minutes' in r ||
      'watch time minutes' in r ||
      'watch_time' in r ||
      'watch time (minutes)' in r
    ) {
      minutes = parseNumber(
        r['watch_time_minutes'] || r['watch time minutes'] || r['watch_time'] || r['watch time (minutes)'] || '',
      );
    } else {
      // Try hours variants and convert to minutes
      const hourKey = keys.find((k) => k.includes('watch') && k.includes('hour'));
      if (hourKey) {
        const hours = parseNumber(r[hourKey] || '');
        minutes = hours * 60;
      }
    }
    upsert(date, (m) => {
      m.watchTimeMinutes = minutes;
    });
  }

  for (const r of subsRows) {
    const date = normalizeDate(r.date || '');
    if (!date) continue;
    let subs = parseNumber(r.subs_net || r['subs'] || r['subscribers'] || '');
    if (!subs) {
      // Try compute net from gained - lost
      const gained = parseNumber(r['subscribers gained'] || r['subs gained'] || '');
      const lost = parseNumber(r['subscribers lost'] || r['subs lost'] || '');
      if (gained || lost) subs = gained - lost;
    }
    upsert(date, (m) => {
      m.subsNet = subs;
    });
  }

  for (const r of revRows) {
    const date = normalizeDate(r.date || '');
    if (!date) continue;
    const keys = Object.keys(r);
    // Prefer columns with 'revenue' in name; many exports use 'estimated revenue (usd)'
    let revenue = 0;
    const exact = r['revenue_usd'] || r['revenue'] || r['estimated revenue (usd)'] || r['your estimated revenue (usd)'];
    if (exact != null && exact !== '') {
      revenue = parseNumber(exact);
    } else {
      const revKey = keys.find((k) => k.includes('revenue'));
      if (revKey) revenue = parseNumber(r[revKey] || '');
    }
    upsert(date, (m) => {
      m.revenueUsd = revenue;
    });
  }

  const daily = Array.from(dateToMetrics.values()).sort((a, b) => a.date.localeCompare(b.date));
  const channel: ChannelData = { channelName: folderName, daily };

  return { channel, warnings };
}



