import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PreferencesModule } from '../preferences/preferences.module';
import { DashboardController } from './dashboard.controller';
import { ReportsController } from './reports.controller';
import { SummaryService } from './summary.service';

/**
 * Summary/dashboard/report domain (IT-8, requirements.md §5.6/§5.10).
 * One service aggregation path is shared by all three endpoints so the
 * dashboard and reports can never disagree about the same period.
 */
@Module({
  imports: [PrismaModule, PreferencesModule],
  controllers: [DashboardController, ReportsController],
  providers: [SummaryService],
})
export class SummaryModule {}
