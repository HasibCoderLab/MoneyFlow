import { afterEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports not_configured when DATABASE_URL is missing (no connection attempt)', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    const service = new PrismaService();

    await expect(service.checkDatabase()).resolves.toBe('not_configured');

    await service.onModuleDestroy();
  });

  it('reports down when the readiness query fails', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://dummy:dummy@127.0.0.1:1/dummy');
    const service = new PrismaService();
    vi.spyOn(service, '$queryRaw').mockRejectedValue(new Error('unreachable'));

    await expect(service.checkDatabase()).resolves.toBe('down');

    await service.onModuleDestroy();
  });
});
