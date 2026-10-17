import type { IncomingHttpHeaders } from 'node:http';

/**
 * Minimal authenticated-identity shapes used across the API. They are
 * structurally compatible with the objects Better Auth returns but keep the
 * application's surface small: no tokens, no plugin fields (ADR-0006
 * decision 5 — identity always comes from the verified session).
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  session: AuthSessionRecord;
}

/** Express request as seen after `AuthGuard` has resolved a session. */
export interface AuthenticatedRequest {
  headers: IncomingHttpHeaders;
  auth?: AuthSession;
}
