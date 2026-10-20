import { Body, Controller, Delete, Get, Headers, HttpCode, Patch } from '@nestjs/common';
import type { MeResponse } from '@moneyflow/contracts';
import type { IncomingHttpHeaders } from 'node:http';

import { AccountDeletionService } from './account-deletion.service';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth.types';
import { CurrentUser } from './decorators';

/**
 * `GET/PATCH/DELETE /api/v1/me` — the caller's own identity and profile
 * (IT-3) plus self-service deletion (IT-12). Protected by the global
 * `AuthGuard`; the user is always the one resolved from the verified session.
 */
@Controller('me')
export class MeController {
  constructor(
    private readonly authService: AuthService,
    private readonly accountDeletion: AccountDeletionService,
  ) {}

  @Get()
  public getMe(@CurrentUser() user: AuthUser): MeResponse {
    return this.authService.getMe(user);
  }

  @Patch()
  public async updateMe(
    @Headers() headers: IncomingHttpHeaders,
    @Body() body: unknown,
  ): Promise<MeResponse> {
    return this.authService.updateMe(headers, body);
  }

  /**
   * Deletes the authenticated MoneyFlow user and every owned row. Requires
   * the current password and the exact phrase `DELETE`; no other user can be
   * targeted because the body has no identity field (ADR-0011).
   */
  @Delete()
  @HttpCode(204)
  public async deleteMe(@CurrentUser() user: AuthUser, @Body() body: unknown): Promise<void> {
    await this.accountDeletion.deleteAccount(user, body);
  }
}
