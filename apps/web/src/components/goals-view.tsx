'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { GoalPriority, GoalResponse, GoalStatusAction, GoalType } from '@moneyflow/contracts';

import { GoalProgress } from '@/components/goal-progress';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  ApiClientError,
  createGoal,
  deleteGoal,
  fetchGoals,
  moveGoal,
  updateGoal,
} from '@/lib/api-client';
import {
  GOAL_PRIORITIES,
  GOAL_PRIORITY_LABEL,
  GOAL_STATUS_LABEL,
  GOAL_TYPES,
  GOAL_TYPE_LABEL,
} from '@/lib/goal-labels';
import {
  formatGoalDate,
  isValidPositiveAmount,
  minorToDecimalInput,
  todayLocalDate,
} from '@/lib/goals-format';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Goals list (IT-10, ADR-0005, requirements.md §5.8). Every figure comes
 * verbatim from `GET /api/v1/goals`: the server sums the contribution ledger
 * and computes the percentage, so this view only formats and lays out what
 * it receives. Goal progress is tracking only — the copy says so explicitly,
 * and nothing here suggests money moved between accounts.
 */

/**
 * Emergency-fund preset (ADR-0005 item 6, requirements.md §5.8). The type and
 * name are pre-filled, and the target is pre-filled with a clearly labelled
 * *example* the user can edit before saving — never a universal
 * recommendation, never applied over a value the user typed, and never
 * submitted without the user's own save action. The amount source is a fixed
 * illustrative default because no approved formula exists yet; that open
 * detail is recorded in ADR-0005 and the implementation plan.
 */
const EMERGENCY_FUND_SUGGESTED_TARGET = '30000';

function useStatusLabel() {
  const { t } = useLocale();
  return useCallback((goal: GoalResponse) => t(GOAL_STATUS_LABEL[goal.status]), [t]);
}

/** One goal row: plan, derived progress, and lifecycle actions. */
function GoalCard({
  goal,
  onEdit,
  onDelete,
  onMove,
}: {
  readonly goal: GoalResponse;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onMove: (action: GoalStatusAction) => void;
}) {
  const { t, preferences } = useLocale();
  const statusLabel = useStatusLabel();
  const paused = goal.status === 'PAUSED';
  const archived = goal.status === 'ARCHIVED';
  const completed = goal.status === 'COMPLETED';

  return (
    <section className="mf-goal-row" aria-label={goal.name}>
      <p className="mf-goal-row__title">
        <span>
          {goal.name} · {t(GOAL_TYPE_LABEL[goal.type])}
        </span>
        <span className="mf-goal-row__status">{statusLabel(goal)}</span>
      </p>
      <p className="mf-goal-row__meta">
        {goal.deadline === null
          ? t('goals.noDeadline')
          : t('goals.deadline', { date: formatGoalDate(goal.deadline, preferences) })}
      </p>

      <GoalProgress goal={goal} />

      <div className="mf-goal-row__actions">
        <Link className="mf-card__action" href={`/app/goals/${goal.id}`}>
          {t('goals.viewDetails')}
        </Link>
        <Button
          variant="ghost"
          onClick={onEdit}
          aria-label={`${t('goals.editButton')}: ${goal.name}`}
        >
          {t('goals.editButton')}
        </Button>
        {archived ? (
          <Button variant="ghost" onClick={() => onMove('unarchive')}>
            {t('goals.unarchiveButton')}
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              onClick={() => onMove(paused ? 'resume' : 'pause')}
              aria-label={`${paused ? t('goals.resumeButton') : t('goals.pauseButton')}: ${goal.name}`}
            >
              {paused ? t('goals.resumeButton') : t('goals.pauseButton')}
            </Button>
            {completed ? null : (
              <Button
                variant="ghost"
                onClick={() => onMove('complete')}
                aria-label={`${t('goals.completeButton')}: ${goal.name}`}
              >
                {t('goals.completeButton')}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => onMove('archive')}
              aria-label={`${t('goals.archiveButton')}: ${goal.name}`}
            >
              {t('goals.archiveButton')}
            </Button>
          </>
        )}
        <Button
          variant="ghost"
          onClick={onDelete}
          aria-label={`${t('goals.deleteButton')}: ${goal.name}`}
        >
          {t('goals.deleteButton')}
        </Button>
      </div>
    </section>
  );
}

export function GoalsView() {
  const { t } = useLocale();
  const loadGoals = useCallback(() => fetchGoals(true), []);
  const { state, retry } = useAsyncData(loadGoals);

  const [form, setForm] = useState<{ goal: GoalResponse | null; preset: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GoalResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runMove = useCallback(
    async (goal: GoalResponse, action: GoalStatusAction) => {
      setActionError(null);
      try {
        await moveGoal(goal.id, action);
        retry();
      } catch (error) {
        setActionError(error instanceof ApiClientError ? error.message : t('goals.actionError'));
      }
    },
    [retry, t],
  );

  const runDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setActionError(null);
    try {
      await deleteGoal(deleteTarget.id);
      setDeleteTarget(null);
      retry();
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('goals.actionError'));
      setDeleteTarget(null);
    }
  }, [deleteTarget, retry, t]);

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
        <p className="mf-empty__title">{t('goals.emptyTitle')}</p>
        <p className="mf-empty__text">{t('goals.emptyBody')}</p>
      </div>
    );
  } else {
    content = (
      <div className="mf-goal-list">
        {state.data.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={() => setForm({ goal, preset: false })}
            onDelete={() => setDeleteTarget(goal)}
            onMove={(action) => void runMove(goal, action)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mf-summary-meta">
        <Button onClick={() => setForm({ goal: null, preset: false })}>
          {t('goals.newButton')}
        </Button>
        <Button variant="ghost" onClick={() => setForm({ goal: null, preset: true })}>
          {t('goals.presetButton')}
        </Button>
      </div>
      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}
      {content}
      <p className="mf-chart-note">{t('goals.trackingNote')}</p>

      {form ? (
        <GoalFormDialog
          goal={form.goal}
          preset={form.preset}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            retry();
          }}
        />
      ) : null}

      {deleteTarget ? (
        <Dialog
          open
          title={t('goals.deleteConfirmTitle')}
          description={t('goals.deleteConfirmBody', { name: deleteTarget.name })}
          onClose={() => setDeleteTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('goals.cancel')}
            </Button>
            <Button onClick={() => void runDelete()}>{t('goals.deleteConfirmButton')}</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

type FormErrors = {
  name?: string;
  target?: string;
  start?: string;
  deadline?: string;
};

/**
 * Create/edit goal dialog. Client validation mirrors the server rules (name
 * 1–80, positive canonical amount ≤ ৳1B, real dates, deadline ≥ start) with
 * translated copy; server rejections (e.g. a conflict) surface their own safe
 * message above the form. The emergency-fund preset only pre-fills untouched
 * fields — a value the user typed is never overwritten.
 */
function GoalFormDialog({
  goal,
  preset,
  onClose,
  onSaved,
}: {
  readonly goal: GoalResponse | null;
  readonly preset: boolean;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(goal?.name ?? (preset ? t('goals.presetName') : ''));
  const [nameTouched, setNameTouched] = useState(goal !== null);
  const [type, setType] = useState<GoalType>(goal?.type ?? (preset ? 'EMERGENCY_FUND' : 'GENERAL'));
  const [target, setTarget] = useState(
    goal ? minorToDecimalInput(goal.targetMinor) : preset ? EMERGENCY_FUND_SUGGESTED_TARGET : '',
  );
  const [targetTouched, setTargetTouched] = useState(goal !== null);
  const [startDate, setStartDate] = useState(goal?.startDate ?? todayLocalDate());
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [priority, setPriority] = useState<GoalPriority>(goal?.priority ?? 'MEDIUM');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showSuggestion = goal === null && type === 'EMERGENCY_FUND';

  const changeType = (next: GoalType) => {
    setType(next);
    if (goal === null && next === 'EMERGENCY_FUND') {
      if (!nameTouched) {
        setName(t('goals.presetName'));
      }
      if (!targetTouched) {
        setTarget(EMERGENCY_FUND_SUGGESTED_TARGET);
      }
    }
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      next.name = t('goals.errorNameRequired');
    } else if (trimmed.length > 80) {
      next.name = t('goals.errorNameTooLong');
    }
    const trimmedTarget = target.trim();
    if (trimmedTarget.length === 0) {
      next.target = t('goals.errorTargetFormat');
    } else if (!isValidPositiveAmount(trimmedTarget)) {
      next.target = /^0(\.0*)?$/.test(trimmedTarget)
        ? t('goals.errorTargetPositive')
        : t('goals.errorTargetFormat');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      next.start = t('goals.errorStartRequired');
    }
    if (deadline.length > 0 && deadline < startDate) {
      next.deadline = t('goals.errorDeadlineBeforeStart');
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
      type,
      target: target.trim(),
      startDate,
      priority,
      ...(deadline.length > 0 ? { deadline } : {}),
    };
    try {
      if (goal) {
        await updateGoal(goal.id, {
          ...body,
          ...(deadline.length === 0 ? { deadline: null } : {}),
        });
      } else {
        await createGoal(body);
      }
      onSaved();
    } catch (error) {
      setServerError(error instanceof ApiClientError ? error.message : t('goals.serverError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={goal ? t('goals.formEditTitle') : t('goals.formCreateTitle')}
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
          <span className="mf-field__label">{t('goals.fieldName')}</span>
          <input
            className="mf-input"
            value={name}
            maxLength={80}
            onChange={(event) => {
              setName(event.target.value);
              setNameTouched(true);
            }}
            aria-invalid={errors.name !== undefined}
          />
          {errors.name ? <span className="mf-form__error">{errors.name}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.fieldType')}</span>
          <select
            className="mf-input"
            value={type}
            onChange={(event) => changeType(event.target.value as GoalType)}
          >
            {GOAL_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(GOAL_TYPE_LABEL[value])}
              </option>
            ))}
          </select>
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.fieldTarget')}</span>
          <input
            className="mf-input"
            inputMode="decimal"
            value={target}
            onChange={(event) => {
              setTarget(event.target.value);
              setTargetTouched(true);
            }}
            aria-invalid={errors.target !== undefined}
          />
          {errors.target ? <span className="mf-form__error">{errors.target}</span> : null}
        </label>

        {showSuggestion ? <p className="mf-chart-note">{t('goals.presetNote')}</p> : null}

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.fieldStart')}</span>
          <input
            className="mf-input"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            aria-invalid={errors.start !== undefined}
          />
          {errors.start ? <span className="mf-form__error">{errors.start}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.fieldDeadline')}</span>
          <input
            className="mf-input"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            aria-invalid={errors.deadline !== undefined}
          />
          {errors.deadline ? <span className="mf-form__error">{errors.deadline}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.fieldPriority')}</span>
          <select
            className="mf-input"
            value={priority}
            onChange={(event) => setPriority(event.target.value as GoalPriority)}
          >
            {GOAL_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {t(GOAL_PRIORITY_LABEL[value])}
              </option>
            ))}
          </select>
        </label>

        <div className="mf-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('goals.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('goals.saving') : t('goals.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
