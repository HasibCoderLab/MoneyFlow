import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { PreferencesController } from './preferences.controller';
import { PreferencesService } from './preferences.service';

/**
 * User preferences domain (IT-11, requirements.md §5.2, ADR-0010):
 * `GET/PATCH /api/v1/preferences`. Display/reporting values only — the
 * summary and budget modules import this service to resolve the user's
 * timezone and week start; financial arithmetic is unchanged.
 */
@Module({
  imports: [PrismaModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService],
})
export class PreferencesModule {}
