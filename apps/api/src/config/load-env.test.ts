import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { loadEnvironmentFiles } from './load-env';

/**
 * `.env` file loading is a development convenience: the repo-root template
 * loads first, an `apps/api/.env` overrides it, the shell always wins, and
 * production never reads files (requirements.md §14).
 */
describe('loadEnvironmentFiles', () => {
  const tempDirs: string[] = [];

  function createWorkspace(): string {
    const root = mkdtempSync(path.join(tmpdir(), 'moneyflow-env-'));
    tempDirs.push(root);
    const apiDir = path.join(root, 'apps', 'api');
    mkdirSync(apiDir, { recursive: true });
    writeFileSync(path.join(root, '.env'), 'MF_TEST_ROOT=from-root\nMF_TEST_SHARED=from-root\n');
    writeFileSync(
      path.join(apiDir, '.env'),
      'MF_TEST_PACKAGE=from-package\nMF_TEST_SHARED=from-package\n',
    );
    return apiDir;
  }

  afterEach(() => {
    while (tempDirs.length > 0) {
      rmSync(tempDirs.pop() as string, { recursive: true, force: true });
    }
  });

  it('loads the repo-root file, then the package file which takes precedence', () => {
    const apiDir = createWorkspace();
    const env: NodeJS.ProcessEnv = {};

    loadEnvironmentFiles({ cwd: apiDir, env });

    expect(env.MF_TEST_ROOT).toBe('from-root');
    expect(env.MF_TEST_PACKAGE).toBe('from-package');
    expect(env.MF_TEST_SHARED).toBe('from-package');
  });

  it('never overrides values already set in the environment', () => {
    const apiDir = createWorkspace();
    const env: NodeJS.ProcessEnv = { MF_TEST_SHARED: 'from-shell' };

    loadEnvironmentFiles({ cwd: apiDir, env });

    expect(env.MF_TEST_SHARED).toBe('from-shell');
  });

  it('does nothing in production', () => {
    const apiDir = createWorkspace();
    const env: NodeJS.ProcessEnv = { NODE_ENV: 'production' };

    loadEnvironmentFiles({ cwd: apiDir, env });

    expect(env.MF_TEST_ROOT).toBeUndefined();
    expect(env.MF_TEST_PACKAGE).toBeUndefined();
  });

  it('ignores missing files silently', () => {
    const emptyDir = mkdtempSync(path.join(tmpdir(), 'moneyflow-env-'));
    tempDirs.push(emptyDir);
    const env: NodeJS.ProcessEnv = {};

    expect(() => loadEnvironmentFiles({ cwd: emptyDir, env })).not.toThrow();
    expect(Object.keys(env)).toEqual([]);
  });
});
