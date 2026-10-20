'use client';

import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { BudgetFigures, BudgetResponse, CategoryResponse } from '@moneyflow/contracts';

import { ProgressBar } from '@/components/progress-bar';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  ApiClientError,
  createBudget,
  deleteBudget,
  fetchBudgets,
  fetchCategories,
  moveBudget,
  updateBudget,
} from '@/lib/api-client';
import { formatMonthYear } from '@/lib/display-format';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor, formatPercentTimes10 } from '@/lib/money-format';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Budgets view (IT-9, requirements.md §5.9). Every figure comes verbatim
 * from the budget endpoints: the server computes spending, remaining
 * amounts, and half-up percentages from recorded expense transactions in
 * the budget's local month (accounting-rules.md §1/§6/§7/§9); this
 * component only formats and lays them out. Overspend is shown truthfully
 * (negative remainder, percentage above 100%) with neutral copy — never
 * clamped, never shaming (§5.9).
 */

/** The visual cap for the bar; the text always carries the exact value (§7). */
const BAR_CAP = 100;

/** "October 2026" / "অক্টোবর ২০২৬" from a stored month anchor. */
function useMonthLabel() {
  const { preferences } = useLocale();
  return useCallback(
    (startDate: string): string =>
      formatMonthYear(new Date(`${startDate}T00:00:00.000Z`), preferences),
    [preferences],
  );
}

/** Capped numeric percentage for the bar/ARIA (display conversion only). */
function cappedPercent(percentTimes10: string | null): number {
  if (percentTimes10 === null) {
    return 0;
  }
  const value = Number(percentTimes10) / 10;
  return Math.min(value, BAR_CAP);
}

/** Exact percentage text ("26.7% used" / "120% used"). */
function usePercentText() {
  const { t, preferences } = useLocale();
  return useCallback(
    (percentTimes10: string | null): string =>
      t('budgets.percentUsed', {
        percent: formatPercentTimes10(percentTimes10, preferences) ?? '0',
      }),
    [t, preferences],
  );
}

/** One limit's display line: spent-of-limit plus neutral remainder copy. */
function useFigureText() {
  const { t, preferences } = useLocale();
  return useCallback(
    (figures: BudgetFigures): { valueText: string; remainderText: string } => ({
      valueText: t('budgets.spentOf', {
        spent: formatBdtMinor(figures.spentMinor, preferences),
        limit: formatBdtMinor(figures.limitMinor, preferences),
      }),
      remainderText: figures.remainingMinor.startsWith('-')
        ? t('budgets.overBy', {
            // Magnitude of the negative remainder — the sign lives in the copy.
            amount: formatBdtMinor(figures.remainingMinor.slice(1), preferences),
          })
        : t('budgets.remaining', {
            amount: formatBdtMinor(figures.remainingMinor, preferences),
          }),
    }),
    [t, preferences],
  );
}

type LimitRow = { readonly id: string; readonly categoryId: string; readonly limit: string };

/** One budget: name, month, status, and its server-computed utilization. */
function BudgetCard({
  budget,
  onEdit,
  onDelete,
  onMove,
}: {
  readonly budget: BudgetResponse;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onMove: (action: 'pause' | 'resume' | 'archive' | 'unarchive') => void;
}) {
  const { t } = useLocale();
  const monthLabel = useMonthLabel();
  const percentText = usePercentText();
  const figureText = useFigureText();

  const paused = budget.status === 'PAUSED';
  const archived = budget.status === 'ARCHIVED';

  return (
    <section
      className="mf-budget-row"
      aria-label={`${budget.name} — ${monthLabel(budget.startDate)}`}
    >
      <p className="mf-budget-row__title">
        <span>
          {budget.name} · {monthLabel(budget.startDate)}
        </span>
        {paused ? (
          <span className="mf-budget-row__status">{t('budgets.paused')}</span>
        ) : archived ? (
          <span className="mf-budget-row__status">{t('budgets.archived')}</span>
        ) : null}
      </p>

      {budget.totalFigures ? (
        <ProgressBar
          label={`${budget.name} — ${t('budgets.totalRow')}`}
          percent={cappedPercent(budget.totalFigures.percentTimes10)}
          percentText={percentText(budget.totalFigures.percentTimes10)}
          valueText={figureText(budget.totalFigures).valueText}
        />
      ) : null}

      {budget.categoryLimits.map((limit) => (
        <div key={limit.id} className="mf-budget-row__category">
          <ProgressBar
            label={`${budget.name} — ${limit.categoryName}`}
            percent={cappedPercent(limit.figures.percentTimes10)}
            percentText={percentText(limit.figures.percentTimes10)}
            valueText={`${limit.categoryName} · ${figureText(limit.figures).valueText}`}
          />
          <p className="mf-budget-row__remaining">{figureText(limit.figures).remainderText}</p>
        </div>
      ))}

      {budget.totalFigures ? (
        <p className="mf-budget-row__remaining">{figureText(budget.totalFigures).remainderText}</p>
      ) : null}
      {paused ? <p className="mf-chart-note">{t('budgets.pausedNote')}</p> : null}

      <div className="mf-budget-row__actions">
        <Button
          variant="ghost"
          onClick={onEdit}
          aria-label={`${t('budgets.editButton')}: ${budget.name}`}
        >
          {t('budgets.editButton')}
        </Button>
        {archived ? (
          <Button variant="ghost" onClick={() => onMove('unarchive')}>
            {t('budgets.unarchiveButton')}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => onMove(paused ? 'resume' : 'pause')}
              aria-label={`${paused ? t('budgets.resumeButton') : t('budgets.pauseButton')}: ${budget.name}`}
            >
              {paused ? t('budgets.resumeButton') : t('budgets.pauseButton')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => onMove('archive')}
              aria-label={`${t('budgets.archiveButton')}: ${budget.name}`}
            >
              {t('budgets.archiveButton')}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onClick={onDelete}
          aria-label={`${t('budgets.deleteButton')}: ${budget.name}`}
        >
          {t('budgets.deleteButton')}
        </Button>
      </div>
    </section>
  );
}

export function BudgetsView() {
  const { t } = useLocale();
  const loadBudgets = useCallback(() => fetchBudgets(true), []);
  const { state, retry } = useAsyncData(loadBudgets);
  const categories = useAsyncData(useCallback(() => fetchCategories(true), []));

  const [formFor, setFormFor] = useState<BudgetResponse | 'new' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BudgetResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const expenseCategories = useMemo(
    () =>
      categories.state.status === 'ready'
        ? categories.state.data.filter(
            (category) => category.type === 'EXPENSE' && category.status === 'ACTIVE',
          )
        : [],
    [categories.state],
  );

  const runMove = useCallback(
    async (budget: BudgetResponse, action: 'pause' | 'resume' | 'archive' | 'unarchive') => {
      setActionError(null);
      try {
        await moveBudget(budget.id, action);
        retry();
      } catch (error) {
        setActionError(error instanceof ApiClientError ? error.message : t('budgets.serverError'));
      }
    },
    [retry, t],
  );

  const runDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteBudget(deleteTarget.id);
      setDeleteTarget(null);
      retry();
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('budgets.serverError'));
      setDeleteTarget(null);
    }
  }, [deleteTarget, retry, t]);

  const toolbar = (
    <div className="mf-summary-meta">
      <Button onClick={() => setFormFor('new')}>{t('budgets.newButton')}</Button>
    </div>
  );

  let content: ReactNode;
  if (state.status === 'loading') {
    content = <SummaryLoading />;
  } else if (state.status === 'signedOut') {
    content = <SummarySignedOut />;
  } else if (state.status === 'error') {
    content = <SummaryError onRetry={retry} />;
  } else if (state.data.length === 0) {
    content = (
      <div className="mf-empty">
        <p className="mf-empty__title">{t('budgets.emptyTitle')}</p>
        <p className="mf-empty__text">{t('budgets.emptyBody')}</p>
      </div>
    );
  } else {
    content = (
      <div className="mf-budget-list">
        {state.data.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            onEdit={() => setFormFor(budget)}
            onDelete={() => setDeleteTarget(budget)}
            onMove={(action) => void runMove(budget, action)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {toolbar}
      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}
      {content}

      {formFor ? (
        <BudgetFormDialog
          budget={formFor === 'new' ? null : formFor}
          categories={expenseCategories}
          onClose={() => setFormFor(null)}
          onSaved={() => {
            setFormFor(null);
            retry();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <Dialog
          open
          title={t('budgets.deleteConfirmTitle')}
          description={t('budgets.deleteConfirmBody', { name: deleteTarget.name })}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('budgets.cancel')}
            </Button>
            <Button onClick={() => void runDelete()}>{t('budgets.deleteConfirmButton')}</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

/**
 * Create/edit dialog. Client-side validation mirrors the server's rules
 * (name 1–80, monthly anchor, positive decimal amounts with at most two
 * decimals, 1–50 distinct categories, at least one limit) with translated
 * copy; server rejections (e.g. the overlap rule) surface their own safe
 * message above the form.
 */
const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;
const MAX_LIMITS = 50;

type FormErrors = {
  name?: string;
  month?: string;
  total?: string;
  rows?: string;
};

function BudgetFormDialog({
  budget,
  categories,
  onClose,
  onSaved,
}: {
  readonly budget: BudgetResponse | null;
  readonly categories: readonly CategoryResponse[];
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(budget?.name ?? '');
  const [month, setMonth] = useState(budget?.startDate.slice(0, 7) ?? '');
  const [total, setTotal] = useState(
    budget?.totalFigures ? minorToDecimalInput(budget.totalFigures.limitMinor) : '',
  );
  const [rows, setRows] = useState<LimitRow[]>(() =>
    budget
      ? budget.categoryLimits.map((limit) => ({
          id: limit.id,
          categoryId: limit.categoryId,
          limit: minorToDecimalInput(limit.figures.limitMinor),
        }))
      : [],
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      next.name = t('budgets.errorNameRequired');
    } else if (trimmed.length > 80) {
      next.name = t('budgets.errorNameTooLong');
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      next.month = t('budgets.errorMonthRequired');
    }
    if (total.trim().length > 0 && !validAmount(total.trim())) {
      next.total = t('budgets.errorAmountFormat');
    }
    const seen = new Set<string>();
    let rowsError: string | undefined;
    if (rows.length > MAX_LIMITS) {
      rowsError = t('budgets.errorTooManyLimits');
    }
    for (const row of rows) {
      if (!row.categoryId) {
        rowsError = rowsError ?? t('budgets.selectCategory');
      } else if (seen.has(row.categoryId)) {
        rowsError = rowsError ?? t('budgets.errorDuplicateCategory');
      }
      seen.add(row.categoryId);
      if (!validAmount(row.limit.trim())) {
        rowsError =
          row.limit.trim().length === 0 || /^0(\.0*)?$/.test(row.limit.trim())
            ? (rowsError ?? t('budgets.errorAmountPositive'))
            : (rowsError ?? t('budgets.errorAmountFormat'));
      }
    }
    if (rowsError) {
      next.rows = rowsError;
    }
    if (total.trim().length === 0 && rows.length === 0) {
      next.rows = next.rows ?? t('budgets.errorNeedLimits');
    }
    return next;
  };

  const submit = async () => {
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }
    setSaving(true);
    setServerError(null);
    const body = {
      name: name.trim(),
      startDate: `${month}-01`,
      ...(total.trim().length > 0 ? { totalLimit: total.trim() } : {}),
      categoryLimits: rows.map((row) => ({ categoryId: row.categoryId, limit: row.limit.trim() })),
    };
    try {
      if (budget) {
        await updateBudget(budget.id, {
          ...body,
          ...(total.trim().length === 0 ? { totalLimit: null } : {}),
        });
      } else {
        await createBudget(body);
      }
      onSaved();
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : t('budgets.serverError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={budget ? t('budgets.formEditTitle') : t('budgets.formCreateTitle')}
      onClose={onClose}
    >
      <form
        className="mf-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {serverError ? (
          <p className="mf-form__error" role="alert">
            {serverError}
          </p>
        ) : null}

        <label className="mf-field">
          <span className="mf-field__label">{t('budgets.fieldName')}</span>
          <input
            className="mf-input"
            value={name}
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name !== undefined}
          />
          {errors.name ? <span className="mf-form__error">{errors.name}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('budgets.fieldMonth')}</span>
          <input
            className="mf-input"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            aria-invalid={errors.month !== undefined}
          />
          {errors.month ? <span className="mf-form__error">{errors.month}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('budgets.fieldTotal')}</span>
          <input
            className="mf-input"
            inputMode="decimal"
            value={total}
            onChange={(event) => setTotal(event.target.value)}
            aria-invalid={errors.total !== undefined}
          />
          {errors.total ? <span className="mf-form__error">{errors.total}</span> : null}
        </label>

        {categories.length === 0 ? (
          <p className="mf-chart-note">{t('budgets.noCategories')}</p>
        ) : null}

        {rows.map((row) => (
          <div key={row.id} className="mf-budget-form__row">
            <label className="mf-field">
              <span className="mf-field__label">{t('budgets.fieldCategory')}</span>
              <select
                className="mf-input"
                value={row.categoryId}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((entry) =>
                      entry.id === row.id ? { ...entry, categoryId: event.target.value } : entry,
                    ),
                  )
                }
              >
                <option value="">{t('budgets.selectCategory')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="mf-field">
              <span className="mf-field__label">{t('budgets.fieldLimit')}</span>
              <input
                className="mf-input"
                inputMode="decimal"
                value={row.limit}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((entry) =>
                      entry.id === row.id ? { ...entry, limit: event.target.value } : entry,
                    ),
                  )
                }
              />
            </label>
            <Button
              variant="ghost"
              onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))}
              aria-label={t('budgets.removeLimit')}
            >
              {t('budgets.removeLimit')}
            </Button>
          </div>
        ))}
        {errors.rows ? <p className="mf-form__error">{errors.rows}</p> : null}

        {rows.length < MAX_LIMITS && categories.length > 0 ? (
          <Button
            variant="ghost"
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: `row-${Date.now()}-${current.length}`, categoryId: '', limit: '' },
              ])
            }
          >
            {t('budgets.addLimit')}
          </Button>
        ) : null}

        <div className="mf-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('budgets.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('budgets.saving') : t('budgets.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Strict display→input conversion for prefill: "500000" → "5000" (no floats). */
function minorToDecimalInput(minorText: string): string {
  const negative = minorText.startsWith('-');
  const digits = (negative ? minorText.slice(1) : minorText).padStart(3, '0');
  const whole = digits.slice(0, -2);
  const fraction = digits.slice(-2).replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;
}

/** Same strict grammar as the server (amount.ts): ≤2 decimals, canonical. */
function validAmount(value: string): boolean {
  if (!AMOUNT_PATTERN.test(value)) {
    return false;
  }
  // BigInt literals are gated on the tsconfig target (ES2017) — call form
  // only, same rule as money-format.ts.
  const minor =
    BigInt(value.split('.')[0] ?? '0') * BigInt(100) +
    BigInt((value.split('.')[1] ?? '').padEnd(2, '0') || '0');
  return minor > BigInt(0) && minor <= BigInt('100000000000');
}
