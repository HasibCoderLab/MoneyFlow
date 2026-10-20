import { Injectable } from '@nestjs/common';
import type { DashboardLayoutResponse } from '@moneyflow/contracts';

import { PrismaService } from '../../prisma/prisma.service';
import { defaultWidgets, normalizeStoredLayout, parseUpdateLayoutInput } from './layout';

/**
 * Dashboard layout domain service (IT-11, requirements.md §5.6/§5.7,
 * ADR-0010).
 *
 * - One persisted layout per user (DR-12: multiple named layouts remain V1).
 * - Every read/write is scoped to the session-derived `userId`.
 * - No saved row returns the documented default; a reset deletes the row so
 *   defaults are owned in one place.
 * - Saved JSON is validated on write and defensively normalized on read, so a
 *   stale widget id or malformed row can never break the dashboard.
 * - Layouts are presentation only: this module never reads or writes
 *   financial records.
 */
@Injectable()
export class DashboardLayoutService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /api/v1/dashboard/layout` — saved layout or documented default. */
  public async getLayout(userId: string): Promise<DashboardLayoutResponse> {
    const row = await this.prisma.dashboardLayout.findUnique({ where: { userId } });
    if (!row) {
      return { widgets: defaultWidgets(), isDefault: true, updatedAt: null };
    }
    return {
      widgets: normalizeStoredLayout(row.layout),
      isDefault: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** `PUT /api/v1/dashboard/layout` — replaces the single saved layout. */
  public async saveLayout(userId: string, body: unknown): Promise<DashboardLayoutResponse> {
    const widgets = parseUpdateLayoutInput(body);
    // Fresh object literals (not the interface-typed entries) satisfy Prisma's
    // JSON input contract; the shape was already validated above.
    const layout = {
      version: 1,
      widgets: widgets.map((widget) => ({ id: widget.id, visible: widget.visible })),
    };
    const row = await this.prisma.dashboardLayout.upsert({
      where: { userId },
      create: { userId, layout },
      update: { layout },
    });
    return {
      widgets,
      isDefault: false,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** `POST /api/v1/dashboard/layout/reset` — restore the default layout. */
  public async resetLayout(userId: string): Promise<DashboardLayoutResponse> {
    await this.prisma.dashboardLayout.deleteMany({ where: { userId } });
    return { widgets: defaultWidgets(), isDefault: true, updatedAt: null };
  }
}
