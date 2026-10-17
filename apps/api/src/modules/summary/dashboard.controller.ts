import { Controller, Get, Query } from '@nestjs/common';
import type { DashboardResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { SummaryService } from './summary.service';

/**
 * `/api/v1/dashboard` — the single payload every dashboard widget renders
 * (IT-8, requirements.md §5.6/§8.6). Protected by the global `AuthGuard`;
 * identity always comes from the verified session, never from request
 * input. The controller stays thin: all rules live in `SummaryService`.
 */
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly summary: SummaryService) {}

  @Get()
  public getDashboard(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<DashboardResponse> {
    return this.summary.getDashboard(user.id, query);
  }
}
