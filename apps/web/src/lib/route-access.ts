/**
 * Route-access helpers shared by the middleware, the app layout, and tests.
 *
 * Two different checks are involved and must not be confused:
 * - `hasSessionCookie` is a cheap presence check used only to avoid rendering
 *   private pages for a browser with no cookie at all. It is NOT
 *   authorization: cookies can be forged or expired.
 * - The API session guard remains the authority for every private record, and
 *   `app/app/layout.tsx` additionally verifies the cookie with `GET /me`
 *   before a protected page is served.
 */

/** Prefix area whose pages require a session. */
export const PROTECTED_PREFIXES = ['/app', '/onboarding'] as const;

/** Better Auth session cookies end in `.session_token` (plain or `__Secure-`). */
const SESSION_COOKIE_SUFFIX = '.session_token';

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function hasSessionCookie(cookies: readonly { readonly name: string }[]): boolean {
  return cookies.some((cookie) => cookie.name.endsWith(SESSION_COOKIE_SUFFIX));
}

/**
 * Safe post-sign-in destination: only an internal absolute path is accepted.
 * Rejects protocol-relative (`//evil.example`), absolute URLs, backslashes,
 * and the auth pages themselves (which would loop).
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/app/dashboard',
): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const candidate = value.trim();
  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }
  if (candidate.includes('\\')) {
    return fallback;
  }
  // Reject control characters (newlines, NUL, …) without a control-char regex.
  for (const character of candidate) {
    if (character.charCodeAt(0) < 0x20) {
      return fallback;
    }
  }
  if (candidate === '/sign-in' || candidate.startsWith('/sign-in?') || candidate === '/sign-up') {
    return fallback;
  }
  return candidate;
}

/** Sign-in URL that returns the user to the page they asked for. */
export function signInPathFor(pathnameWithSearch: string): string {
  return `/sign-in?next=${encodeURIComponent(pathnameWithSearch)}`;
}
