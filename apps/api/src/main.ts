import { createApiApp } from './bootstrap';
import { validateEnv } from './config/env';
import { loadEnvironmentFiles } from './config/load-env';

async function bootstrap(): Promise<void> {
  // Local development convenience only: `.env` files are ignored in
  // production, where the platform injects real environment variables.
  loadEnvironmentFiles();

  // Fail fast on invalid configuration before any server is started.
  const { port } = validateEnv(process.env);

  const app = await createApiApp();
  await app.listen(port);
}

void bootstrap();
