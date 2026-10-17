import { Module } from '@nestjs/common';
import { AccountModule } from './modules/accounts/accounts.module';
import { AuthModule } from './modules/auth/auth.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [AccountModule, AuthModule, TransactionsModule, CategoriesModule],
})
export class AppModule {}
