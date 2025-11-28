import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = String(form.get('username') || '').trim();
  const password = String(form.get('password') || '');
  const redirect = String(form.get('redirect') || '/');

  if (!username || !password) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', redirect);
    url.searchParams.set('error', 'missing');
    return NextResponse.redirect(url);
  }

  const supabase = createServiceClient();

  // Find user by username
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', redirect);
    url.searchParams.set('error', 'invalid');
    return NextResponse.redirect(url);
  }

  // Verify password
  const passwordValid = await bcrypt.compare(password, user.password_hash);
  if (!passwordValid) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', redirect);
    url.searchParams.set('error', 'invalid');
    return NextResponse.redirect(url);
  }

  // Set auth cookies
  const response = NextResponse.redirect(new URL(redirect, request.url));
  const isProd = process.env.NODE_ENV === 'production';
  
  response.cookies.set({
    name: 'user_id',
    value: user.id,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  response.cookies.set({
    name: 'session_token',
    value: Buffer.from(`${user.id}:${Date.now()}`).toString('base64'),
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}


