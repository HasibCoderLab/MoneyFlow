import path from 'node:path';

import { config as loadEnv } from 'dotenv';

/**
 * Loads local `.env` files into the process environment — development
 * convenience only (requirements.md §14: production configuration is
 * injected by the deployment platform, never read from files).
 *
 * Precedence: values already present in the environment (shell, CI) always
 * win, then `apps/api/.env`, then the repo-root `.env` template. Missing
 * files are ignored silently. Only variable names/values from the files are
 * touched; nothing is logged (they may contain credentials).
 */
export function loadEnvironmentFiles(
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): void {
  const env = options.env ?? process.env;
  if (env.NODE_ENV === 'production') {
    return;
  }

  const cwd = options.cwd ?? process.cwd();
  // Parse each file into its own bucket (dotenv never overrides within a
  // bucket), then merge with the documented precedence.
  const rootValues: NodeJS.ProcessEnv = {};
  const packageValues: NodeJS.ProcessEnv = {};
  loadEnv({ path: path.resolve(cwd, '../../.env'), processEnv: rootValues, quiet: true });
  loadEnv({ path: path.resolve(cwd, '.env'), processEnv: packageValues, quiet: true });

  for (const [key, value] of Object.entries({ ...rootValues, ...packageValues })) {
    if (env[key] === undefined && value !== undefined) {
      env[key] = value;
    }
  }
}
