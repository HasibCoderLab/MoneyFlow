import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DashboardLayoutController } from './dashboard-layout.controller';
import { DashboardLayoutService } from './dashboard-layout.service';

/**
 * Dashboard customization domain (IT-11, requirements.md §5.6/§5.7,
 * ADR-0010): the single persisted per-user layout behind
 * `GET/PUT /api/v1/dashboard/layout` and `POST …/reset`.
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardLayoutController],
  providers: [DashboardLayoutService],
})
export class DashboardLayoutModule {}
