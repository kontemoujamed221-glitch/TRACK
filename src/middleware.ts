import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

const PUBLIC_PAGES = ['/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and next internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') // Any extension file (e.g. .png, .jpg)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('session')?.value;
  let payload = null;
  
  if (token) {
    payload = await verifyToken(token, JWT_SECRET);
  }

  // API Routes protection
  if (pathname.startsWith('/api/')) {
    // Exclude auth endpoints from middleware check
    if (pathname.startsWith('/api/auth/login') || pathname.startsWith('/api/auth/logout')) {
      return NextResponse.next();
    }

    console.log(`[Middleware] Route: ${request.method} ${pathname} | Token: ${token ? 'Présent' : 'Absent'} | Payload: ${payload ? 'Valide' : 'Invalide/Expiré'}`);

    if (!payload) {
      return NextResponse.json({ error: 'Session non autorisée ou expirée.' }, { status: 401 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.id);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-role', payload.role);
    requestHeaders.set('x-user-name', payload.name);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Page Routes protection
  const isPublicPage = PUBLIC_PAGES.some((page) => pathname === page);

  if (!payload && !isPublicPage) {
    // Redirect to login if trying to access a private page
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (payload && isPublicPage) {
    // Redirect to dashboard if logged in and trying to access login page
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except files and static assets
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
