import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { createServiceClient } from '@/lib/supabase-server';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    redirect('/login');
  }

  // Get user info
  const supabase = createServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('username, display_name')
    .eq('id', userId)
    .single();

  const displayName = user?.display_name || user?.username || 'User';
  const username = user?.username || '';

  return (
    <>
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="text-lg font-semibold">YouTube Dashboard</div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <div className="font-medium">{displayName}</div>
                <div className="text-xs text-gray-500">@{username}</div>
              </div>
            </div>
            <form action="/api/logout" method="POST">
              <button
                type="submit"
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
