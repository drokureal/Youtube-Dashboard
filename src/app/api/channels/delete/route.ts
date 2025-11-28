import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelName = searchParams.get('name');

  if (!channelName) {
    return NextResponse.json({ error: 'Channel name required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find the channel
  const { data: channel, error: findError } = await supabase
    .from('channels')
    .select('id')
    .eq('user_id', userId)
    .eq('channel_name', channelName)
    .single();

  if (findError || !channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  }

  // Delete channel (cascade will delete metrics)
  const { error: deleteError } = await supabase
    .from('channels')
    .delete()
    .eq('id', channel.id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
