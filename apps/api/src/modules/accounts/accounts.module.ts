import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

/** Accounts domain (IT-4, requirements.md §5.3). */
@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
