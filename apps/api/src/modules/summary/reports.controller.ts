import { Controller, Get, Query } from '@nestjs/common';
import type { ReportCategoriesResponse, ReportSummaryResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { SummaryService } from './summary.service';

/**
 * `/api/v1/reports` — income/expense summaries and category breakdowns
 * (IT-8, requirements.md §5.10/§8.6). Protected by the global `AuthGuard`;
 * identity always comes from the verified session. The controller stays
 * thin: all period and aggregation rules live in `SummaryService`.
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly summary: SummaryService) {}

  @Get('summary')
  public getSummary(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<ReportSummaryResponse> {
    return this.summary.getReportSummary(user.id, query);
  }

  @Get('categories')
  public getCategories(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<ReportCategoriesResponse> {
    return this.summary.getReportCategories(user.id, query);
  }
}
