import type { INestApplication } from '@nestjs/common';
import { createServer, type AddressInfo } from 'node:net';

import { createApiApp } from '../../src/bootstrap';
import { getTestDatabaseUrl } from './harness';

/**
 * HTTP-level integration harness (docs/architecture/database-and-testing.md):
 * boots the REAL application — the same `createApiApp` wiring used by
 * `main.ts` (global prefix, CORS, Better Auth mount) — on an ephemeral port
 * against the guarded test database, and issues requests with Node's global
 * `fetch` (no extra dependency).
 *
 * Requests default to a unique TEST-NET-3 `x-forwarded-for` value per call so
 * Better Auth's per-IP rate limits can never leak across tests; tests that
 * exercise rate limiting pass an explicit `ip`.
 */

/** Browser-like origin used by tests — matches `CORS_ORIGINS` in `startTestApp`. */
export const TEST_WEB_ORIGIN = 'http://localhost:3000';

export interface TestApp {
  app: INestApplication;
  baseUrl: string;
}

/**
 * Ephemeral ports from `listen(0)` can land on a port Node's fetch client
 * refuses ("bad port", e.g. 6000), which made unrelated suites fail
 * intermittently. Pick an unused port from a range that contains none of the
 * blocked ports instead.
 */
async function findSafePort(): Promise<number> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const port = 40_000 + Math.floor(Math.random() * 10_000);
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error('Could not find a free test port after 20 attempts.');
}

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createServer();
    probe.unref();
    probe.once('error', () => resolve(false));
    probe.listen(port, '127.0.0.1', () => {
      probe.close(() => resolve(true));
    });
  });
}

export async function startTestApp(): Promise<TestApp> {
  // Point every part of the app (PrismaService, Better Auth) at the guarded
  // test database before the Nest container is built. Values deliberately
  // differ from production defaults so miswiring would fail loudly.
  process.env.DATABASE_URL = getTestDatabaseUrl();
  process.env.BETTER_AUTH_URL = 'http://localhost:4000';
  process.env.BETTER_AUTH_SECRET = 'integration-test-only-secret-32-chars!';
  process.env.CORS_ORIGINS = TEST_WEB_ORIGIN;

  const app = await createApiApp();
  await app.listen(await findSafePort(), '127.0.0.1');
  const address = app.getHttpServer().address() as AddressInfo;
  return { app, baseUrl: `http://127.0.0.1:${address.port}` };
}

let clientCounter = 0;

/** Unique TEST-NET-3 client IP (never a real address; §12.4). */
export function nextClientIp(): string {
  clientCounter += 1;
  return `203.0.113.${(clientCounter % 200) + 10}`;
}

export interface TestResponse {
  status: number;
  /** Parsed JSON body (or the raw text, or null for empty responses). */
  body: unknown;
  /** Raw `Set-Cookie` headers exactly as sent. */
  setCookie: string[];
  headers: Headers;
}

export interface TestRequestOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  cookie?: string;
  /**
   * `Origin` header override. Non-GET requests default to
   * `TEST_WEB_ORIGIN` because browsers always send an `Origin` on
   * state-changing requests, and Better Auth's CSRF gate requires it once a
   * Fetch-Metadata header (Node's fetch sends `sec-fetch-mode`) or a session
   * cookie is present.
   */
  origin?: string;
  /** Caller-selected client IP for rate-limit scenarios. */
  ip?: string;
  headers?: Record<string, string>;
}

export async function apiRequest(
  baseUrl: string,
  options: TestRequestOptions,
): Promise<TestResponse> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {
    'x-forwarded-for': options.ip ?? nextClientIp(),
    ...options.headers,
  };
  if (options.cookie) {
    headers.cookie = options.cookie;
  }
  const origin = options.origin ?? (method === 'GET' ? undefined : TEST_WEB_ORIGIN);
  if (origin) {
    headers.origin = origin;
  }
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  const response = await fetch(`${baseUrl}${options.path}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    redirect: 'manual',
  });

  const text = await response.text();
  let body: unknown = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return {
    status: response.status,
    body,
    setCookie: response.headers.getSetCookie(),
    headers: response.headers,
  };
}
