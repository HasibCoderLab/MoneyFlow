import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccountEntity } from './account.entity';

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string): Promise<AccountEntity[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, userId: string): Promise<AccountEntity | null> {
    return this.prisma.account.findFirst({
      where: { id, userId },
    });
  }

  async create(data: Prisma.AccountCreateInput & { userId: string }): Promise<AccountEntity> {
    return this.prisma.account.create({
      data: {
        id: data.id ?? Prisma.sql`gen_random_uuid()`,
        userId: data.userId,
        name: data.name,
        type: data.type,
        currency: data.currency,
        openingBalanceMinor: data.openingBalanceMinor,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: string, account: AccountEntity): Promise<AccountEntity> {
    const { userId, ...updateData } = account;

    return this.prisma.account.update({
      where: { id, userId },
      data: updateData,
    });
  }

  async softDelete(id: string, userId: string): Promise<AccountEntity> {
    return this.prisma.account.update({
      where: { id, userId },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Prisma.DateTimeValue(new Date()),
      },
    });
  }
}
