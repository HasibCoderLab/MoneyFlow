import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { BudgetResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { BudgetsService } from './budgets.service';

/**
 * `/api/v1/budgets` — the caller's own monthly budgets (IT-9,
 * requirements.md §5.9/§8.6). Protected by the global `AuthGuard`; every
 * record is scoped to the session-derived user id.
 *
 * - `GET` returns ACTIVE and PAUSED budgets with current-period
 *   utilization; `?includeArchived=true` also returns ARCHIVED history.
 * - Status moves go through the explicit transition endpoints (mirroring
 *   the categories module): pause/resume and archive/unarchive, each
 *   validated server-side, with the one-active-limit-per-category rule
 *   re-checked on every move into ACTIVE.
 * - `DELETE` hard-deletes the budget with confirmation in the UI; its
 *   category limits cascade.
 */
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  @Get()
  public listBudgets(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<BudgetResponse[]> {
    return this.budgets.listBudgets(user.id, query);
  }

  @Post()
  public createBudget(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<BudgetResponse> {
    return this.budgets.createBudget(user.id, body);
  }

  @Patch(':id')
  public updateBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<BudgetResponse> {
    return this.budgets.updateBudget(user.id, id, body);
  }

  @Post(':id/pause')
  @HttpCode(200)
  public pauseBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BudgetResponse> {
    return this.budgets.pauseBudget(user.id, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  public resumeBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BudgetResponse> {
    return this.budgets.resumeBudget(user.id, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  public archiveBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BudgetResponse> {
    return this.budgets.archiveBudget(user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  public unarchiveBudget(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<BudgetResponse> {
    return this.budgets.unarchiveBudget(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  public async deleteBudget(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.budgets.deleteBudget(user.id, id);
  }
}
