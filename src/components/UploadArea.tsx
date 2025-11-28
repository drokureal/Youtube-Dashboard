"use client";
import React, { useRef, useState } from 'react';
import { parseUploadDirectoryEntries } from '@/lib/csv';
import { mergeChannels, saveStored, loadStored } from '@/lib/store';
import type { ChannelData } from '@/lib/types';

type Props = {
  existingChannels: ChannelData[];
  onImported: (channels: ChannelData[]) => void;
};

export default function UploadArea({ existingChannels, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    setMessages([]);
    try {
      const allFiles = Array.from(files);
      const { channels, errors, warnings } = await parseUploadDirectoryEntries(allFiles);
      
      // Save to Supabase
      await saveStored(channels);
      
      // Reload from server to get merged data
      const stored = await loadStored();
      const merged = stored?.channels || mergeChannels(existingChannels, channels);
      
      onImported(merged);
      const msgs = [] as string[];
      if (channels.length) msgs.push(`Imported ${channels.length} channel(s) to database.`);
      if (warnings.length) msgs.push(...warnings.map((w) => `Warning: ${w}`));
      if (errors.length) msgs.push(...errors.map((e) => `Error: ${e}`));
      setMessages(msgs);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setMessages([message]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium">Upload channel folders</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Select multiple folders. Recommended filenames: <code>views.csv</code>, <code>watch_time.csv</code>, <code>subscribers.csv</code>, <code>revenue.csv</code>.
            Other names are okay — files are auto-detected by their CSV headers.
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <input
            ref={inputRef}
            type="file"
            webkitdirectory=""
            directory=""
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {isLoading ? 'Importing…' : 'Choose folders'}
        </label>
      </div>
      {messages.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-gray-600 dark:text-gray-300">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}


