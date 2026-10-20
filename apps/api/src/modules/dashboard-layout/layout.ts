import { BadRequestException } from '@nestjs/common';
import {
  DASHBOARD_WIDGET_IDS,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
} from '@moneyflow/contracts';

/**
 * Validation for persisted dashboard layouts (IT-11, requirements.md §5.7,
 * ADR-0010).
 *
 * The saved value is a small, validated data structure — never executable
 * JSON, HTML, CSS, or arbitrary widget markup. Writes must name every
 * supported widget exactly once. Reads are defensive: stale/unknown ids,
 * duplicates, or malformed rows are dropped and missing widgets are appended
 * in the documented default order, so a removed widget can never break the
 * dashboard.
 */

const SUPPORTED_WIDGETS = new Set<string>(DASHBOARD_WIDGET_IDS);

/** Documented default layout: every supported widget, visible, default order. */
export function defaultWidgets(): DashboardWidgetPreference[] {
  return DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: true }));
}

function assertObject(input: unknown): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
}

/** Validates `PUT /api/v1/dashboard/layout`; strict, rejects partial lists. */
export function parseUpdateLayoutInput(input: unknown): DashboardWidgetPreference[] {
  assertObject(input);
  for (const key of Object.keys(input)) {
    if (key !== 'widgets') {
      throw new BadRequestException(`Unknown field "${key}".`);
    }
  }

  const widgets = input.widgets;
  if (!Array.isArray(widgets)) {
    throw new BadRequestException('"widgets" must be an array.');
  }
  if (widgets.length !== DASHBOARD_WIDGET_IDS.length) {
    throw new BadRequestException(
      `"widgets" must contain every supported widget exactly once (${DASHBOARD_WIDGET_IDS.length} items).`,
    );
  }

  const seen = new Set<DashboardWidgetId>();
  return widgets.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new BadRequestException(`"widgets[${index}]" must be an object.`);
    }
    const record = entry as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (key !== 'id' && key !== 'visible') {
        throw new BadRequestException(`Unknown field "widgets[${index}].${key}".`);
      }
    }
    const id = record.id;
    if (typeof id !== 'string' || !SUPPORTED_WIDGETS.has(id)) {
      throw new BadRequestException(`"widgets[${index}].id" is not a supported dashboard widget.`);
    }
    if (seen.has(id as DashboardWidgetId)) {
      throw new BadRequestException(`Widget "${id}" appears more than once.`);
    }
    seen.add(id as DashboardWidgetId);
    if (typeof record.visible !== 'boolean') {
      throw new BadRequestException(`"widgets[${index}].visible" must be a boolean.`);
    }
    return { id: id as DashboardWidgetId, visible: record.visible };
  });
}

/**
 * Recovers a safe layout from any stored JSON value. Invalid/unknown entries
 * are ignored, duplicates keep their first position, and any supported widget
 * missing from the stored value is appended visible so the user can still see
 * and manage it. The result always has every supported widget exactly once.
 */
export function normalizeStoredLayout(raw: unknown): DashboardWidgetPreference[] {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return defaultWidgets();
  }
  const record = raw as Record<string, unknown>;
  if (record.version !== 1 || !Array.isArray(record.widgets)) {
    return defaultWidgets();
  }

  const normalized: DashboardWidgetPreference[] = [];
  const seen = new Set<DashboardWidgetId>();
  for (const entry of record.widgets) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      continue;
    }
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== 'string' || !SUPPORTED_WIDGETS.has(item.id)) {
      continue;
    }
    if (typeof item.visible !== 'boolean') {
      continue;
    }
    const id = item.id as DashboardWidgetId;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push({ id, visible: item.visible });
  }

  for (const id of DASHBOARD_WIDGET_IDS) {
    if (!seen.has(id)) {
      normalized.push({ id, visible: true });
    }
  }
  return normalized;
}
