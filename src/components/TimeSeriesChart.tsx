"use client";
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

type SeriesKey = 'views' | 'watchTimeMinutes' | 'subsNet' | 'revenueUsd';

type Props = {
  data: Array<{ date: string; views: number; watchTimeMinutes: number; subsNet: number; revenueUsd: number }>;
  series: SeriesKey;
  title: string;
};

function formatYAxis(series: SeriesKey, value: number): string {
  if (series === 'revenueUsd') {
    return `$${value.toFixed(0)}`;
  }
  if (series === 'watchTimeMinutes') {
    return `${Math.round(value / 60)}h`;
  }
  return `${Math.round(value)}`;
}

export default function TimeSeriesChart({ data, series, title }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-[var(--surface)]">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <defs>
              <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#3e4043" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--muted)' }} tickMargin={8} minTickGap={30} axisLine={{ stroke: '#3e4043' }} tickLine={{ stroke: '#3e4043' }} />
            <YAxis tickFormatter={(v) => formatYAxis(series, v)} width={60} tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={{ stroke: '#3e4043' }} tickLine={{ stroke: '#3e4043' }} />
            <Tooltip
              formatter={(value: unknown) => (series === 'revenueUsd' ? `$${Number(value as number).toFixed(2)}` : Math.round(Number(value))) }
              labelFormatter={(l) => l}
              contentStyle={{ backgroundColor: '#202124', borderColor: '#3e4043', color: '#e8eaed' }}
              labelStyle={{ color: '#e8eaed' }}
            />
            <Area type="linear" dataKey={series} stroke="var(--accent)" strokeWidth={2} fill="url(#areaFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


