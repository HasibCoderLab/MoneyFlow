import { Test } from '@nestjs/testing';
import { expectShape } from '@moneyflow/test-utils';
import { afterEach, describe, it, vi } from 'vitest';

import { HealthController } from './health.controller';
import { HealthModule } from './health.module';

describe('HealthController', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('compiles the HealthModule and reports degraded status without a configured database', async () => {
    // Deterministic on every machine: with no DATABASE_URL the readiness
    // check must not attempt a connection (unit tests stay database-free).
    vi.stubEnv('DATABASE_URL', undefined);

    const moduleRef = await Test.createTestingModule({ imports: [HealthModule] }).compile();

    const controller = moduleRef.get(HealthController);
    const health = await controller.getHealth();

    // Shape asserted via shared test-utils; proves constructor DI resolved
    // (i.e. the SWC transform emits decorator metadata correctly).
    expectShape(health, {
      status: 'degraded',
      service: 'moneyflow-api',
      database: 'not_configured',
    });

    await moduleRef.close();
  });
});
