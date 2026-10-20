import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditService } from './audit.service';

/** Minimal audit writer (IT-12, ADR-0011). */
@Module({
  imports: [PrismaModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
