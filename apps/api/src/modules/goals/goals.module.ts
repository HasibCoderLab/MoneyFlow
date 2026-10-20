import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

/**
 * Goals domain (IT-10, ADR-0005, requirements.md §5.8/§8.6): savings goals
 * with the virtual contribution ledger, derived progress/overfunding, and
 * explicit lifecycle transitions behind `GET/POST /api/v1/goals`,
 * `GET/PATCH/DELETE /api/v1/goals/:id`, the pause/resume/complete/archive/
 * unarchive actions, and the contribution/reversal endpoints.
 */
@Module({
  imports: [PrismaModule],
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
