import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type {
  GoalContributionResponse,
  GoalDetailResponse,
  GoalResponse,
} from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { GoalsService } from './goals.service';

/**
 * `/api/v1/goals` — the caller's own savings goals and their virtual
 * contribution ledger (IT-10, ADR-0005, requirements.md §5.8/§8.6).
 * Protected by the global `AuthGuard`; every query is scoped to the
 * session-derived user id, and foreign ids answer 404 without revealing
 * whether they exist.
 *
 * - `GET` returns goals with derived progress; `?includeArchived=true` also
 *   returns archived history.
 * - Lifecycle changes use explicit transition endpoints (pause, resume,
 *   complete, archive, unarchive); `PATCH` never accepts `status`.
 * - Contributions are immutable: `POST …/contributions` appends, and
 *   `POST …/contributions/:contributionId/reverse` appends the linked
 *   negative reversal. Neither touches account balances, income, expenses,
 *   or budgets.
 */
@Controller('goals')
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  public listGoals(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<GoalResponse[]> {
    return this.goals.listGoals(user.id, query);
  }

  @Post()
  public createGoal(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<GoalResponse> {
    return this.goals.createGoal(user.id, body);
  }

  @Get(':id')
  public getGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalDetailResponse> {
    return this.goals.getGoal(user.id, id);
  }

  @Patch(':id')
  public updateGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<GoalResponse> {
    return this.goals.updateGoal(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  public async deleteGoal(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.goals.deleteGoal(user.id, id);
  }

  @Post(':id/pause')
  @HttpCode(200)
  public pauseGoal(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<GoalResponse> {
    return this.goals.pauseGoal(user.id, id);
  }

  @Post(':id/resume')
  @HttpCode(200)
  public resumeGoal(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<GoalResponse> {
    return this.goals.resumeGoal(user.id, id);
  }

  @Post(':id/complete')
  @HttpCode(200)
  public completeGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalResponse> {
    return this.goals.completeGoal(user.id, id);
  }

  @Post(':id/archive')
  @HttpCode(200)
  public archiveGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalResponse> {
    return this.goals.archiveGoal(user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  public unarchiveGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalResponse> {
    return this.goals.unarchiveGoal(user.id, id);
  }

  @Get(':id/contributions')
  public listContributions(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<GoalContributionResponse[]> {
    return this.goals.listContributions(user.id, id);
  }

  @Post(':id/contributions')
  public addContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<GoalContributionResponse> {
    return this.goals.addContribution(user.id, id, body);
  }

  @Post(':id/contributions/:contributionId/reverse')
  @HttpCode(200)
  public reverseContribution(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('contributionId') contributionId: string,
  ): Promise<GoalContributionResponse> {
    return this.goals.reverseContribution(user.id, id, contributionId);
  }
}
