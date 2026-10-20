import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

/**
 * Budget domain (IT-9, requirements.md §5.9/§8.6): monthly budgets with
 * per-category limits and server-computed utilization behind
 * `GET/POST /api/v1/budgets`, `PATCH/DELETE /api/v1/budgets/:id`, and the
 * pause/resume/archive/unarchive transitions.
 */
@Module({
  imports: [PrismaModule, PreferencesModule, AuditModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
