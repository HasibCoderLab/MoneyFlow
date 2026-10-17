import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import type { CategoryResponse } from '@moneyflow/contracts';

import { CurrentUser } from '../auth/decorators';
import type { AuthUser } from '../auth/auth.types';
import { CategoriesService } from './categories.service';

/**
 * `/api/v1/categories` — the caller's own categories (IT-5, requirements.md
 * §5.5/§8.6). Protected by the global `AuthGuard`; every record is scoped to
 * the session-derived user id.
 *
 * - `GET` seeds the default categories once per user (idempotent backfill)
 *   and returns `name ASC`; `?includeArchived=true` also returns archived
 *   categories.
 * - `DELETE` answers 204 only while no transaction references the category;
 *   a referenced category answers 409 and should be archived instead.
 */
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  public listCategories(
    @CurrentUser() user: AuthUser,
    @Query() query: Record<string, unknown>,
  ): Promise<CategoryResponse[]> {
    return this.categories.listCategories(user.id, query);
  }

  @Post()
  public createCategory(
    @CurrentUser() user: AuthUser,
    @Body() body: unknown,
  ): Promise<CategoryResponse> {
    return this.categories.createCategory(user.id, body);
  }

  @Patch(':id')
  public updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ): Promise<CategoryResponse> {
    return this.categories.updateCategory(user.id, id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  public archiveCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<CategoryResponse> {
    return this.categories.archiveCategory(user.id, id);
  }

  @Post(':id/unarchive')
  @HttpCode(200)
  public unarchiveCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<CategoryResponse> {
    return this.categories.unarchiveCategory(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  public async deleteCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.categories.deleteCategory(user.id, id);
  }
}
