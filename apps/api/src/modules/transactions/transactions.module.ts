import { Module } from '@nestjs/common';

import { RateLimiter } from '../../common/rate-limit';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsExportService } from './transactions-export.service';
import { TransactionsService } from './transactions.service';

/** Transactions domain (IT-4/IT-6/IT-7/IT-12, requirements.md §5.4). */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionsExportService, RateLimiter],
  exports: [TransactionsService],
})
export class TransactionsModule {}
