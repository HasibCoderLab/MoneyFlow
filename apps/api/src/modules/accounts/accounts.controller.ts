import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import type { AccountResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { AccountsService } from './accounts.service';

/**
 * `/api/v1/accounts` — the caller's own accounts and wallets (IT-4).
 * Protected by the global `AuthGuard`; every record is scoped to the
 * session-derived user id. Balances in responses are derived, never stored.
 */
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post()
  public createAccount(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<AccountResponse> {
    return this.accounts.createAccount(user.id, body);
  }

  @Get()
  public listAccounts(@CurrentUser() user: AuthUser): Promise<AccountResponse[]> {
    return this.accounts.listAccounts(user.id);
  }

  @Get(':id')
  public getAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AccountResponse> {
    return this.accounts.getAccount(user.id, id);
  }

  @Patch(':id')
  public updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<AccountResponse> {
    return this.accounts.updateAccount(user.id, id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  public archiveAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AccountResponse> {
    return this.accounts.archiveAccount(user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  public unarchiveAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<AccountResponse> {
    return this.accounts.unarchiveAccount(user.id, id);
  }
}
