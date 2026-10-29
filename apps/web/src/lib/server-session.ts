/**
 * Server-only session check used by the protected app layout.
 *
 * The middleware only sees whether a cookie exists. Before serving a private
 * page, the layout asks the API who the session belongs to. Results:
 * - `valid`: API accepted the session cookie.
 * - `invalid`: API answered 401 — redirect to sign in.
 * - `unknown`: API is unreachable/misconfigured. Do not lock the user out;
 *   the page's own 401 handling still shows the signed-out state, and every
 *   API call remains server-authorized.
 */
export type SessionCheck = 'valid' | 'invalid' | 'unknown';

export async function checkServerSession(cookieHeader: string): Promise<SessionCheck> {
  const rawBase = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  const base = typeof rawBase === 'string' ? rawBase.trim().replace(/\/+$/, '') : '';
  if (!base) {
    return 'unknown';
  }
  try {
    const response = await fetch(`${base}/api/v1/me`, {
      method: 'GET',
      headers: { accept: 'application/json', cookie: cookieHeader },
      cache: 'no-store',
    });
    if (response.status === 401) {
      return 'invalid';
    }
    return response.ok ? 'valid' : 'unknown';
  } catch {
    return 'unknown';
  }
}
