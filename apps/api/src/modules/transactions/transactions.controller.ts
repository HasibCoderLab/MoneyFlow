import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { TransactionListResponse, TransactionResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { TransactionsService } from './transactions.service';

/** Minimal response surface for setting the create/replay status code. */
interface StatusSetter {
  status(code: number): unknown;
}

/**
 * `/api/v1/transactions` — the caller's own income, expense, transfer, and
 * adjustment rows (IT-4/IT-6/IT-7). Protected by the global `AuthGuard`;
 * identity always comes from the verified session.
 *
 * Idempotent creates: supply `Idempotency-Key`; the first write answers
 * 201, a replay of the same key answers 200 with the stored row.
 */
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post()
  public async createTransaction(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Res({ passthrough: true }) res: StatusSetter,
  ): Promise<TransactionResponse> {
    const result = await this.transactions.createTransaction(user.id, body, idempotencyKey);
    res.status(result.replayed ? 200 : 201);
    return result.transaction;
  }

  @Get()
  public listTransactions(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<TransactionListResponse> {
    return this.transactions.listTransactions(user.id, query);
  }

  @Get(':id')
  public getTransaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<TransactionResponse> {
    return this.transactions.getTransaction(user.id, id);
  }

  @Patch(':id')
  public updateTransaction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<TransactionResponse> {
    return this.transactions.updateTransaction(user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  public deleteTransaction(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    return this.transactions.deleteTransaction(user.id, id);
  }
}
