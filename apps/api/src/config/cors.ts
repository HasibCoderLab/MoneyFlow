/**
 * Parses the `CORS_ORIGINS` environment variable: a comma-separated list of
 * browser origins allowed to call the API. Used both for the CORS middleware
 * and for Better Auth's trusted-origin (CSRF) checks, so the allowlist has a
 * single source (docs/architecture/auth-sessions.md).
 */
export function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
