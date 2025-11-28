import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get all channels for user
  const { data: channels, error: channelsError } = await supabase
    .from('channels')
    .select('id, channel_name')
    .eq('user_id', userId)
    .order('channel_name');

  if (channelsError) {
    return NextResponse.json({ error: channelsError.message }, { status: 500 });
  }

  if (!channels || channels.length === 0) {
    return NextResponse.json({ channels: [] });
  }

  // Get all metrics for all channels
  const channelIds = channels.map(c => c.id);
  const { data: metrics, error: metricsError } = await supabase
    .from('daily_metrics')
    .select('channel_id, date, views, watch_time_minutes, subs_net, revenue_usd')
    .in('channel_id', channelIds)
    .order('date');

  if (metricsError) {
    return NextResponse.json({ error: metricsError.message }, { status: 500 });
  }

  // Group metrics by channel
  const channelData = channels.map(channel => {
    const channelMetrics = (metrics || [])
      .filter(m => m.channel_id === channel.id)
      .map(m => ({
        date: m.date,
        views: m.views,
        watchTimeMinutes: m.watch_time_minutes,
        subsNet: m.subs_net,
        revenueUsd: m.revenue_usd,
      }));

    return {
      channelName: channel.channel_name,
      daily: channelMetrics,
    };
  });

  return NextResponse.json({ channels: channelData });
}
