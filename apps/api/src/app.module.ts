import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SummaryModule } from './modules/summary/summary.module';
import { TransactionsModule } from './modules/transactions/transactions.module';

/**
 * Root module of the modular monolith.
 *
 * Domain modules (accounts, transactions, categories, budgets, goals, …)
 * are added here as they are implemented. Do not put business logic in
 * this file — keep it in the owning module's service/domain layer
 * (requirements.md §8.4).
 *
 * Cross-cutting wiring: `AuthModule` registers the global authentication
 * guard (protected by default) and `ApiExceptionFilter` maps every
 * Nest-handled error to the API error contract.
 */
@Module({
  imports: [
    AuthModule,
    HealthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    SummaryModule,
    BudgetsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
