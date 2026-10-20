'use client';

import type { DashboardWidgetId, DashboardWidgetPreference } from '@moneyflow/contracts';
import Link from 'next/link';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  ApiClientError,
  fetchDashboardLayout,
  resetDashboardLayout,
  saveDashboardLayout,
} from '@/lib/api-client';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Dashboard customizer (IT-11, requirements.md §5.6/§5.7).
 *
 * Show/hide and reorder are saved as a validated list through
 * `PUT /api/v1/dashboard/layout`; reset deletes the saved row through
 * `POST /api/v1/dashboard/layout/reset`. Hidden widgets stay in the list so
 * they can be restored. This screen changes presentation only — it never
 * reads or edits financial records, and authorization is enforced by the API.
 */

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  totalBalance: 'Total tracked balance',
  income: 'Income summary',
  expense: 'Expense summary',
  recentTransactions: 'Recent activity',
  spendingByCategory: 'Spending by category',
  goals: 'Savings goals',
  budgets: 'Budget status',
};

const WIDGET_DESCRIPTIONS: Record<DashboardWidgetId, string> = {
  totalBalance: 'Your tracked account balance, computed by the server.',
  income: 'Recorded income for the selected period.',
  expense: 'Recorded spending for the selected period.',
  recentTransactions: 'The latest recorded activity.',
  spendingByCategory: 'Server-computed category shares for the period.',
  goals: 'Progress from your recorded goal contributions.',
  budgets: 'A pointer to your monthly budget plans.',
};

function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401) {
      return 'Your session has expired. Sign in again to save the layout.';
    }
    return error.message;
  }
  return 'Could not save the dashboard layout. Please try again.';
}

export function DashboardCustomizer() {
  const load = useCallback(() => fetchDashboardLayout(), []);
  const { state, retry } = useAsyncData(load);
  // `null` until the user edits; the loaded list is the fallback so an edit or
  // an immediate Save can never race a state-seeding effect.
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  if (state.status === 'loading') {
    return (
      <div className="mf-loading" aria-busy="true" aria-label="Loading dashboard layout">
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--line" />
        <div className="mf-skeleton mf-skeleton--card" />
      </div>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">Sign in to customize your dashboard</p>
        <p className="mf-empty__text">Dashboard layouts are saved to your own account.</p>
        <Link className="mf-btn mf-btn--primary" href="/sign-in">
          Sign in
        </Link>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mf-empty" role="alert">
        <p className="mf-empty__title">Could not load your dashboard layout</p>
        <p className="mf-empty__text">Check your connection and try again.</p>
        <Button variant="ghost" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  const currentWidgets = widgets ?? state.data.widgets;

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= currentWidgets.length) return;
    const next = [...currentWidgets];
    const [item] = next.splice(index, 1);
    if (item) next.splice(target, 0, item);
    setWidgets(next);
    setMessage(null);
  };

  const toggle = (id: DashboardWidgetId, visible: boolean) => {
    setWidgets(
      currentWidgets.map((widget) => (widget.id === id ? { ...widget, visible } : widget)),
    );
    setMessage(null);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveDashboardLayout({ widgets: currentWidgets });
      setWidgets(saved.widgets);
      setMessage({ tone: 'success', text: 'Dashboard layout saved.' });
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const saved = await resetDashboardLayout();
      setWidgets(saved.widgets);
      setMessage({ tone: 'success', text: 'Dashboard layout reset to the default.' });
    } catch (error) {
      setMessage({ tone: 'error', text: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mf-customizer">
      <div className="mf-customizer__toolbar">
        <p className="mf-chart-note">
          Use the arrows to reorder. Hidden widgets stay listed here so you can turn them back on.
        </p>
        <div className="mf-customizer__actions">
          <Button variant="ghost" onClick={reset} disabled={saving}>
            Reset to default
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save layout'}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          className={message.tone === 'error' ? 'mf-field__error' : 'mf-field__hint'}
          role={message.tone === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      ) : null}

      <ol className="mf-customizer__list">
        {currentWidgets.map((widget, index) => {
          const nameId = `widget-${widget.id}-name`;
          const descriptionId = `widget-${widget.id}-description`;
          return (
            <li
              key={widget.id}
              className={`mf-customizer__row${widget.visible ? '' : ' mf-customizer__row--hidden'}`}
            >
              <div className="mf-customizer__row-main">
                <label className="mf-customizer__toggle">
                  <input
                    type="checkbox"
                    checked={widget.visible}
                    onChange={(event) => toggle(widget.id, event.target.checked)}
                    aria-describedby={descriptionId}
                  />
                  <span id={nameId}>{WIDGET_LABELS[widget.id]}</span>
                </label>
                <p id={descriptionId} className="mf-field__hint">
                  {WIDGET_DESCRIPTIONS[widget.id]}
                </p>
              </div>
              <div className="mf-customizer__row-actions">
                <button
                  type="button"
                  className="mf-btn mf-btn--ghost"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || saving}
                  aria-label={`Move ${WIDGET_LABELS[widget.id]} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="mf-btn mf-btn--ghost"
                  onClick={() => move(index, 1)}
                  disabled={index === currentWidgets.length - 1 || saving}
                  aria-label={`Move ${WIDGET_LABELS[widget.id]} down`}
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mf-chart-note">
        Every layout keeps all supported widgets exactly once. The API rejects malformed or unknown
        widget ids, and it can only ever save to your own account.
      </p>
    </div>
  );
}
