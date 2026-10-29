import { NextResponse, type NextRequest } from 'next/server';

import { hasSessionCookie, isProtectedPath, signInPathFor } from '@/lib/route-access';

/**
 * Front-door redirect for protected routes (requirements.md §5, §10.2).
 *
 * This is a convenience guard, not the authorization boundary: it only checks
 * that a session cookie is present. `app/app/layout.tsx` verifies the cookie
 * against the API before rendering, and every API query is scoped to the
 * session-derived user regardless of what the browser requests.
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!hasSessionCookie(request.cookies.getAll())) {
    const url = request.nextUrl.clone();
    const destination = signInPathFor(`${pathname}${search}`);
    url.pathname = '/sign-in';
    url.search = destination.slice('/sign-in'.length);
    return NextResponse.redirect(url);
  }

  // Pass the original address to the layout, which cannot read it otherwise.
  const headers = new Headers(request.headers);
  headers.set('x-mf-pathname', `${pathname}${search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/app/:path*', '/onboarding'],
};
