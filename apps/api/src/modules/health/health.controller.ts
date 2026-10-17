import type { HealthResponse } from '@moneyflow/contracts';
import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/decorators';
import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Public: readiness checks must work before anyone is authenticated. */
  @Public()
  @Get('health')
  public async getHealth(): Promise<HealthResponse> {
    return this.healthService.getHealth();
  }
}
