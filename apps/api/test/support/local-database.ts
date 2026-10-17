/**
 * Safety guard for integration-test databases
 * (docs/architecture/database-and-testing.md): integration tests may only
 * run against a LOCAL PostgreSQL — the Docker compose instance or the CI
 * service container (which GitHub Actions exposes on localhost). Anything
 * remote (staging, Neon, production) must be refused before a single query
 * runs. Error messages never echo the URL value (it may contain
 * credentials).
 */

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalDatabaseUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    return false;
  }
  return LOCAL_HOSTNAMES.has(url.hostname);
}

export function assertLocalDatabaseUrl(
  value: string | undefined,
  variableName = 'TEST_DATABASE_URL',
): string {
  if (!value) {
    throw new Error(
      `${variableName} is not set. Integration tests require a local PostgreSQL ` +
        'database (see docs/runbooks/local-development.md).',
    );
  }
  if (!isLocalDatabaseUrl(value)) {
    throw new Error(
      `${variableName} points at a non-local host. Refusing to run integration ` +
        'tests against anything but localhost/127.0.0.1 (see ' +
        'docs/architecture/database-and-testing.md).',
    );
  }
  return value;
}
