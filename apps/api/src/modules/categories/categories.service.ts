import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CategoryResponse, CategoryStatus, CategoryType } from '@moneyflow/contracts';

import { assertUuid, isForeignKeyViolation, isUniqueViolationFor } from '../../common/http-errors';
import type { Category as PrismaCategory } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ensureDefaultCategories } from './category-defaults';
import {
  parseCreateCategoryInput,
  parseListCategoriesQuery,
  parseUpdateCategoryInput,
} from './dto';
import { toCategoryNameKey } from './name-key';

const CATEGORY_NAME_CONFLICT_INDEX = 'category_userId_nameKey_type_key';

const CATEGORY_IN_USE_MESSAGE =
  'This category is used by existing transactions. Archive it instead.';

/**
 * Categories domain service (IT-5, requirements.md §5.5, domain-model.md
 * "Category").
 *
 * - Every query is scoped to the session-derived `userId`; foreign and
 *   malformed ids are both 404 and never distinguish existence.
 * - `nameKey` (trimmed + lowercased) is always recomputed from the name the
 *   client sent; the database's `(userId, nameKey, type)` unique index is
 *   the final arbiter of case-insensitive duplicates per type.
 * - `type` is immutable after creation; renames, recolours, archive, and
 *   unarchive are allowed in any status (archived categories stay
 *   renameable so history can be kept precise).
 * - Delete is only safe while no transaction references the category;
 *   otherwise 409 and archive is the documented alternative (there is no
 *   reassignment flow — deferred by the implementation plan).
 * - Single-row writes run inside a database transaction (§4.1, §5.4).
 *
 * The default-category clone/backfill is idempotent (`ensureDefaultCategories`)
 * and runs on the list read, mirroring the sign-up hook in `auth-options.ts`.
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  public async listCategories(userId: string, query: unknown): Promise<CategoryResponse[]> {
    const { includeArchived } = parseListCategoriesQuery(query);
    await ensureDefaultCategories(this.prisma, userId);
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        ...(includeArchived ? {} : { status: 'ACTIVE' }),
      },
      orderBy: [{ nameKey: 'asc' }, { id: 'asc' }],
    });
    return categories.map(toCategoryResponse);
  }

  public async createCategory(userId: string, body: unknown): Promise<CategoryResponse> {
    const input = parseCreateCategoryInput(body);
    try {
      const category = await this.prisma.$transaction((tx) =>
        tx.category.create({
          data: {
            userId,
            name: input.name,
            nameKey: toCategoryNameKey(input.name),
            type: input.type,
            color: input.color,
          },
        }),
      );
      return toCategoryResponse(category);
    } catch (error) {
      throw this.mapNameConflict(error);
    }
  }

  public async updateCategory(
    userId: string,
    rawId: string,
    body: unknown,
  ): Promise<CategoryResponse> {
    const input = parseUpdateCategoryInput(body);
    const id = assertUuid(rawId, 'Category');

    try {
      const category = await this.prisma.$transaction(async (tx) => {
        const current = await tx.category.findFirst({ where: { id, userId } });
        if (!current) {
          throw new NotFoundException('Category not found.');
        }
        if (input.name === undefined && input.color === undefined) {
          return current;
        }
        return tx.category.update({
          where: { id },
          data: {
            ...(input.name !== undefined
              ? { name: input.name, nameKey: toCategoryNameKey(input.name) }
              : {}),
            ...(input.color !== undefined ? { color: input.color } : {}),
          },
        });
      });
      return toCategoryResponse(category);
    } catch (error) {
      throw this.mapNameConflict(error);
    }
  }

  public async archiveCategory(userId: string, rawId: string): Promise<CategoryResponse> {
    return this.setArchived(userId, rawId, 'ARCHIVED');
  }

  public async unarchiveCategory(userId: string, rawId: string): Promise<CategoryResponse> {
    return this.setArchived(userId, rawId, 'ACTIVE');
  }

  /**
   * Deletes the category only while no transaction references it; a
   * referenced category answers 409 (`CATEGORY_IN_USE`) and the caller is
   * expected to archive instead. The FK (NO ACTION) is the race referee:
   * a transaction inserted between the count and the delete surfaces the
   * same 409, never a 500.
   */
  public async deleteCategory(userId: string, rawId: string): Promise<void> {
    const id = assertUuid(rawId, 'Category');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.category.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Category not found.');
      }
      const referenced = await tx.transaction.count({ where: { userId, categoryId: id } });
      if (referenced > 0) {
        throw new ConflictException(CATEGORY_IN_USE_MESSAGE);
      }
      try {
        await tx.category.delete({ where: { id } });
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          throw new ConflictException(CATEGORY_IN_USE_MESSAGE);
        }
        throw error;
      }
    });
  }

  private async setArchived(
    userId: string,
    rawId: string,
    status: CategoryStatus,
  ): Promise<CategoryResponse> {
    const id = assertUuid(rawId, 'Category');
    const category = await this.prisma.$transaction(async (tx) => {
      const current = await tx.category.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Category not found.');
      }
      if (current.status === status) {
        return current;
      }
      return tx.category.update({ where: { id }, data: { status } });
    });
    return toCategoryResponse(category);
  }

  /** Maps the case-insensitive name index to 409; rethrows everything else. */
  private mapNameConflict(error: unknown): unknown {
    if (isUniqueViolationFor(error, CATEGORY_NAME_CONFLICT_INDEX)) {
      return new ConflictException('A category with this name already exists for this type.');
    }
    return error;
  }
}

function toCategoryResponse(category: PrismaCategory): CategoryResponse {
  return {
    id: category.id,
    name: category.name,
    type: category.type as CategoryType,
    color: category.color,
    status: category.status as CategoryStatus,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
