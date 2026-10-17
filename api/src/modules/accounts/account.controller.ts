import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountService } from './account.service';
import { AccountRepository } from './account.repository';
import { AccountEntity } from './account.entity';
import { AccountType, AccountStatus } from './account-type.enum';

@Controller('api/v1/accounts')
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly accountRepository: AccountRepository,
  ) {}

  @Get()
  async findAll(@Query('userId') userId: string): Promise<AccountEntity[]> {
    if (!userId) {
      throw new Error('userId is required');
    }
    return this.accountService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId: string): Promise<AccountEntity> {
    if (!userId) {
      throw new Error('userId is required');
    }
    return this.accountService.findOne(id, userId);
  }

  @Post()
  async create(
    @Body()
    body: {
      name: string;
      type: AccountType;
      currency: string;
      openingBalanceMinor: string;
    },
    @Query('userId') userId: string,
  ): Promise<AccountEntity> {
    if (!userId) {
      throw new Error('userId is required');
    }

    const openingBalanceMinor = BigInt(body.openingBalanceMinor);

    return this.accountService.create(
      userId,
      body.name,
      body.type,
      body.currency,
      openingBalanceMinor,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      status?: AccountStatus;
    },
    @Query('userId') userId: string,
  ): Promise<AccountEntity> {
    if (!userId) {
      throw new Error('userId is required');
    }

    return this.accountService.update(id, userId, body.name, body.status);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id') id: string, @Query('userId') userId: string): Promise<AccountEntity> {
    if (!userId) {
      throw new Error('userId is required');
    }
    return this.accountService.archive(id, userId);
  }

  @Get(':id/balance')
  async getBalance(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ): Promise<{ balanceMinor: bigint; balanceBdt: string }> {
    if (!userId) {
      throw new Error('userId is required');
    }
    const balanceMinor = await this.accountService.getBalance(id, userId);
    const balanceBdt = `${balanceMinor / 100n}`; // Simple BDT conversion (2 decimal places)

    return { balanceMinor, balanceBdt };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('userId') userId: string): Promise<void> {
    if (!userId) {
      throw new Error('userId is required');
    }
    // Soft delete via archive
    await this.accountService.archive(id, userId);
  }
}
