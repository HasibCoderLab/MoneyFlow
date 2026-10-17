import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async hasAccountTransactions(accountId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.transaction.count({
      where: {
        userId,
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      },
    });
    return count > 0;
  }

  async findByAccount(accountId: string, userId: string): Promise<any[]> {
    return this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [{ fromAccountId: accountId }, { toAccountId: accountId }],
      },
      orderBy: { occurredAt: 'desc' },
    });
  }
}
