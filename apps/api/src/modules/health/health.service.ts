import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@moneyflow/contracts';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Readiness payload for `GET /api/v1/health`: process liveness plus a
   * database ping (docs/architecture/database-and-testing.md). Degrades
   * gracefully — the process stays up and the payload reports `degraded`
   * with a `database` status; it never throws and never leaks connection
   * details.
   */
  public async getHealth(): Promise<HealthResponse> {
    const database = await this.prisma.checkDatabase();
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      service: 'moneyflow-api',
      database,
    };
  }
}
