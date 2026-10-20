'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { GoalContributionResponse, GoalStatusAction } from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { GoalProgress } from '@/components/goal-progress';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  ApiClientError,
  addGoalContribution,
  deleteGoal,
  fetchGoal,
  moveGoal,
  reverseGoalContribution,
} from '@/lib/api-client';
import { GOAL_STATUS_LABEL, GOAL_TYPE_LABEL } from '@/lib/goal-labels';
import {
  formatGoalDate,
  formatInstantDate,
  isValidPositiveAmount,
  todayLocalDate,
} from '@/lib/goals-format';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor } from '@/lib/money-format';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Goal detail (IT-10, ADR-0005, requirements.md §5.8): the plan, the derived
 * progress, and the full contribution ledger. Adding a contribution appends
 * an immutable row; removing one appends a linked negative reversal. Neither
 * moves money between accounts, and the copy says so explicitly. The view
 * never edits an existing ledger row and never derives progress itself — it
 * reloads the server's exact figures after every action.
 */
export function GoalDetailView({ goalId }: { readonly goalId: string }) {
  const { t, preferences } = useLocale();
  const router = useRouter();
  const load = useCallback(() => fetchGoal(goalId), [goalId]);
  const { state, retry } = useAsyncData(load);

  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<GoalContributionResponse | null>(null);

  const runMove = useCallback(
    async (action: GoalStatusAction) => {
      setActionError(null);
      try {
        await moveGoal(goalId, action);
        retry();
      } catch (error) {
        setActionError(error instanceof ApiClientError ? error.message : t('goals.actionError'));
      }
    },
    [goalId, retry, t],
  );

  const runDelete = useCallback(async () => {
    setActionError(null);
    try {
      await deleteGoal(goalId);
      setDeleteOpen(false);
      router.push('/app/goals');
    } catch (error) {
      setActionError(error instanceof ApiClientError ? error.message : t('goals.actionError'));
      setDeleteOpen(false);
    }
  }, [goalId, router, t]);

  const runReverse = useCallback(async () => {
    if (!reverseTarget) return;
    setActionError(null);
    try {
      await reverseGoalContribution(goalId, reverseTarget.id);
      setReverseTarget(null);
      retry();
    } catch (error) {
      setActionError(
        error instanceof ApiClientError ? error.message : t('goals.reverseServerError'),
      );
      setReverseTarget(null);
    }
  }, [goalId, reverseTarget, retry, t]);

  if (state.status === 'loading') {
    return <SummaryLoading />;
  }
  if (state.status === 'signedOut') {
    return <SummarySignedOut />;
  }
  if (state.status === 'error') {
    return <SummaryError onRetry={retry} />;
  }

  const goal = state.data;
  const archived = goal.status === 'ARCHIVED';
  const paused = goal.status === 'PAUSED';

  return (
    <>
      <div className="mf-summary-meta">
        <Link className="mf-card__action" href="/app/goals">
          {t('goals.backToGoals')}
        </Link>
      </div>

      <header className="mf-page-header">
        <div>
          <h1>{goal.name}</h1>
          <p className="mf-page-header__subtitle">
            {t(GOAL_TYPE_LABEL[goal.type])} · {t(GOAL_STATUS_LABEL[goal.status])}
            {goal.deadline === null
              ? ` · ${t('goals.noDeadline')}`
              : ` · ${t('goals.deadline', { date: formatGoalDate(goal.deadline, preferences) })}`}
          </p>
        </div>
      </header>

      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}

      <Card>
        <GoalProgress goal={goal} />
        <p className="mf-chart-note">{t('goals.trackingNote')}</p>

        <div className="mf-budget-row__actions">
          {archived ? (
            <Button variant="ghost" onClick={() => void runMove('unarchive')}>
              {t('goals.unarchiveButton')}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => void runMove(paused ? 'resume' : 'pause')}
                aria-label={`${paused ? t('goals.resumeButton') : t('goals.pauseButton')}: ${goal.name}`}
              >
                {paused ? t('goals.resumeButton') : t('goals.pauseButton')}
              </Button>
              {goal.status === 'COMPLETED' ? null : (
                <Button variant="ghost" onClick={() => void runMove('complete')}>
                  {t('goals.completeButton')}
                </Button>
              )}
              <Button variant="ghost" onClick={() => void runMove('archive')}>
                {t('goals.archiveButton')}
              </Button>
            </>
          )}
          <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
            {t('goals.deleteButton')}
          </Button>
        </div>
      </Card>

      {goal.status === 'ACTIVE' ? (
        <ContributionForm goalId={goalId} onAdded={retry} />
      ) : (
        <p className="mf-chart-note">{t('goals.contributionPausedNote')}</p>
      )}

      <Card title={t('goals.historyTitle')} subtitle={t('goals.historySubtitle')}>
        {goal.contributions.length === 0 ? (
          <p className="mf-empty__text">{t('goals.historyEmpty')}</p>
        ) : (
          <ul className="mf-contribution-list">
            {goal.contributions.map((row) => {
              const reversal = row.reversesContributionId !== null;
              const reversed = row.reversedByContributionId !== null;
              return (
                <li key={row.id} className="mf-contribution-row">
                  <p className="mf-contribution-row__title">
                    <span>
                      {reversal ? t('goals.reversalLabel') : t('goals.contributionLabel')}
                    </span>
                    <span>{formatBdtMinor(row.amountMinor, preferences)}</span>
                  </p>
                  <p className="mf-goal-row__meta">
                    {formatInstantDate(row.occurredAt, preferences.timezone, preferences)}
                    {row.note === null ? '' : ` · ${row.note}`}
                  </p>
                  {reversal ? null : reversed ? (
                    <p className="mf-goal-row__meta">{t('goals.reversedNote')}</p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => setReverseTarget(row)}
                      aria-label={`${t('goals.reverseButton')}: ${formatBdtMinor(row.amountMinor, preferences)}`}
                    >
                      {t('goals.reverseButton')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {reverseTarget ? (
        <Dialog
          open
          title={t('goals.reverseConfirmTitle')}
          description={t('goals.reverseConfirmBody')}
          onClose={() => setReverseTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setReverseTarget(null)}>
              {t('goals.cancel')}
            </Button>
            <Button onClick={() => void runReverse()}>{t('goals.reverseConfirmButton')}</Button>
          </div>
        </Dialog>
      ) : null}

      {deleteOpen ? (
        <Dialog
          open
          title={t('goals.deleteConfirmTitle')}
          description={t('goals.deleteConfirmBody', { name: goal.name })}
          onClose={() => setDeleteOpen(false)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t('goals.cancel')}
            </Button>
            <Button onClick={() => void runDelete()}>{t('goals.deleteConfirmButton')}</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

/** Add-contribution form: amount required, date/note optional. */
function ContributionForm({
  goalId,
  onAdded,
}: {
  readonly goalId: string;
  readonly onAdded: () => void;
}) {
  const { t } = useLocale();
  const [amount, setAmount] = useState('');
  const [occurredDate, setOccurredDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = amount.trim();
    let found: string | null = null;
    if (trimmed.length === 0 || !isValidPositiveAmount(trimmed)) {
      found = /^0(\.0*)?$/.test(trimmed)
        ? t('goals.errorContributionPositive')
        : t('goals.errorContributionFormat');
    } else if (occurredDate.length > 0 && occurredDate > todayLocalDate()) {
      found = t('goals.errorContributionFuture');
    }
    setError(found);
    if (found !== null) {
      return;
    }
    setSaving(true);
    setServerError(null);
    try {
      await addGoalContribution(goalId, {
        amount: trimmed,
        ...(occurredDate.length > 0 ? { occurredDate } : {}),
        ...(note.trim().length > 0 ? { note: note.trim() } : {}),
      });
      setAmount('');
      setOccurredDate('');
      setNote('');
      onAdded();
    } catch (caught) {
      setServerError(
        caught instanceof ApiClientError ? caught.message : t('goals.contributionServerError'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title={t('goals.addContribution')}>
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
          <span className="mf-field__label">{t('goals.contributionAmount')}</span>
          <input
            className="mf-input"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={error !== null}
          />
          {error ? <span className="mf-form__error">{error}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.contributionDate')}</span>
          <input
            className="mf-input"
            type="date"
            value={occurredDate}
            onChange={(event) => setOccurredDate(event.target.value)}
          />
        </label>

        <label className="mf-field">
          <span className="mf-field__label">{t('goals.contributionNote')}</span>
          <input
            className="mf-input"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="mf-dialog__actions">
          <Button type="submit" disabled={saving}>
            {saving ? t('goals.adding') : t('goals.addContribution')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
