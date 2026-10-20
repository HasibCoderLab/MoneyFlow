import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

/** Categories domain (IT-5, requirements.md §5.5). */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
