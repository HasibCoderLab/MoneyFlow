import { Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Provides the shared Prisma client. Import this module wherever database
 * access is needed (kept explicit rather than `@Global` so the dependency
 * graph stays visible); feature modules pair it with their own services.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
