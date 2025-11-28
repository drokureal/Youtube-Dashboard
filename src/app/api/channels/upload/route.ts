import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type DailyMetric = {
  date: string;
  views: number;
  watchTimeMinutes: number;
  subsNet: number;
  revenueUsd: number;
};

type ChannelData = {
  channelName: string;
  daily: DailyMetric[];
};

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const channels: ChannelData[] = body.channels;

  if (!channels || !Array.isArray(channels)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const results: { channelName: string; rowsUpserted: number }[] = [];

  for (const channelData of channels) {
    const { channelName, daily } = channelData;

    // Upsert channel (create if not exists)
    const { data: existingChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('user_id', userId)
      .eq('channel_name', channelName)
      .single();

    let channelId: string;

    if (existingChannel) {
      channelId = existingChannel.id;
    } else {
      const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({ user_id: userId, channel_name: channelName })
        .select('id')
        .single();

      if (createError || !newChannel) {
        console.error('Error creating channel:', createError);
        continue;
      }
      channelId = newChannel.id;
    }

    // Upsert daily metrics
    if (daily && daily.length > 0) {
      const metricsToUpsert = daily.map(d => ({
        channel_id: channelId,
        date: d.date,
        views: d.views || 0,
        watch_time_minutes: d.watchTimeMinutes || 0,
        subs_net: d.subsNet || 0,
        revenue_usd: d.revenueUsd || 0,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from('daily_metrics')
        .upsert(metricsToUpsert, { 
          onConflict: 'channel_id,date',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting metrics:', upsertError);
      } else {
        results.push({ channelName, rowsUpserted: metricsToUpsert.length });
      }
    }
  }

  return NextResponse.json({ success: true, results });
}
