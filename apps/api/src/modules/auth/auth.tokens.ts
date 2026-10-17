import type { Auth } from 'better-auth';

/**
 * DI token for the single Better Auth instance of the process. The instance
 * is built once by `AuthModule` (see `auth.module.ts`) and shared by the
 * HTTP mount (`bootstrap.ts`) and the session guard.
 */
export const AUTH_INSTANCE = Symbol('AUTH_INSTANCE');

export type AuthInstance = Auth;
