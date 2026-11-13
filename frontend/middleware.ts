import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('kaira_token')?.value;
  const { pathname } = request.nextUrl;

  const protectedPrefixes = ['/dashboard', '/settings', '/workflows', '/connections', '/executions', '/templates'];
  const isProtectedPath = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  const isAuthPage = authPages.some((path) => pathname === path);

  // If visiting protected path without auth token cookie, redirect to login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If visiting login or register with active auth token cookie, redirect to dashboard
  if (isAuthPage && token) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/settings/:path*',
    '/workflows/:path*',
    '/connections/:path*',
    '/executions/:path*',
    '/templates/:path*',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
  ],
};

