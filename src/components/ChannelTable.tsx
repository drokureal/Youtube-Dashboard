"use client";
import React from 'react';
import type { ChannelData } from '@/lib/types';
import { computeRpm, computeTotals } from '@/lib/store';

type Props = {
  channels: ChannelData[];
};

function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(Math.round(n));
}

export default function ChannelTable({ channels }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium">Channels</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="px-2 py-2">Channel</th>
              <th className="px-2 py-2">Views</th>
              <th className="px-2 py-2">Watch hours</th>
              <th className="px-2 py-2">Subs</th>
              <th className="px-2 py-2">Revenue</th>
              <th className="px-2 py-2">RPM</th>
            </tr>
          </thead>
          <tbody>
            {channels.map((ch) => {
              const totals = computeTotals(ch.daily);
              const rpm = computeRpm(totals.revenueUsd, totals.views);
              return (
                <tr key={ch.channelName} className="border-t border-gray-100">
                  <td className="px-2 py-2 font-medium">{ch.channelName}</td>
                  <td className="px-2 py-2">{formatNumber(totals.views)}</td>
                  <td className="px-2 py-2">{formatNumber(totals.watchTimeMinutes / 60)}</td>
                  <td className="px-2 py-2">{formatNumber(totals.subsNet)}</td>
                  <td className="px-2 py-2">${totals.revenueUsd.toFixed(2)}</td>
                  <td className="px-2 py-2">${rpm.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



