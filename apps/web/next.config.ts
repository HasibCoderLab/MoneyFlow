import path from 'node:path';

import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

/**
 * MoneyFlow keeps one shared `.env` at the repository root (see
 * docs/runbooks/local-development.md). Next only reads `.env*` from the
 * package directory, so without this step `NEXT_PUBLIC_API_URL` is absent
 * from the browser bundle and every API-backed screen fails with
 * "Could not load your data" without issuing a request.
 *
 * `loadEnvConfig` never overrides variables already present in the process
 * (shell/CI/deployment), so platform-injected configuration still wins.
 * The value is passed explicitly through `env` because Next snapshots its
 * environment before evaluating this file. Only `NEXT_PUBLIC_*` values can
 * reach the browser.
 */
const { loadedEnvFiles } = loadEnvConfig(
  path.resolve(process.cwd(), '../..'),
  process.env.NODE_ENV !== 'production',
  console,
  true,
);

const publicApiUrl =
  process.env.NEXT_PUBLIC_API_URL ??
  loadedEnvFiles
    .flatMap((file) => Object.entries(file.env))
    .find(([name]) => name === 'NEXT_PUBLIC_API_URL')?.[1];

if (!publicApiUrl) {
  console.warn(
    '[moneyflow] NEXT_PUBLIC_API_URL is not set; browser API calls will be unavailable. ' +
      'Set it in the repository-root .env or the deployment environment.',
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(publicApiUrl ? { env: { NEXT_PUBLIC_API_URL: publicApiUrl } } : {}),
};

export default nextConfig;
