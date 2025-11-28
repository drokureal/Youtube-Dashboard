import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  
  response.cookies.delete('user_id');
  response.cookies.delete('session_token');
  
  return response;
}

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  
  response.cookies.delete('user_id');
  response.cookies.delete('session_token');
  
  return response;
}
