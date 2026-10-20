import { Body, Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import type { DashboardLayoutResponse } from '@moneyflow/contracts';

import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators';
import { DashboardLayoutService } from './dashboard-layout.service';

/**
 * `/api/v1/dashboard/layout` — the authenticated user's single dashboard
 * layout (IT-11, requirements.md §5.6/§5.7/§8.6). Protected by the global
 * `AuthGuard`; identity always comes from the verified session.
 *
 * - `PUT` validates and persists every supported widget exactly once.
 * - `POST …/reset` deletes the saved row and returns the documented default.
 */
@Controller('dashboard/layout')
export class DashboardLayoutController {
  constructor(private readonly layout: DashboardLayoutService) {}

  @Get()
  public getLayout(@CurrentUser() user: AuthUser): Promise<DashboardLayoutResponse> {
    return this.layout.getLayout(user.id);
  }

  @Put()
  public saveLayout(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<DashboardLayoutResponse> {
    return this.layout.saveLayout(user.id, body);
  }

  @Post('reset')
  @HttpCode(200)
  public resetLayout(@CurrentUser() user: AuthUser): Promise<DashboardLayoutResponse> {
    return this.layout.resetLayout(user.id);
  }
}
