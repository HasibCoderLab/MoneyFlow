import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Your data — MoneyFlow',
  description: 'Your recorded data, and the export and deletion controls that are not built yet.',
};

type PlannedRight = {
  readonly name: string;
  readonly scope: string;
};

const PLANNED_RIGHTS: readonly PlannedRight[] = [
  {
    name: 'Export transactions (CSV)',
    scope:
      'Download your own recorded transactions, filtered or complete, scoped to your account only.',
  },
  {
    name: 'Delete your account',
    scope: 'A clearly explained deletion flow with explicit confirmation, not a hidden switch.',
  },
  {
    name: 'Retention and audit record',
    scope:
      'A record of destructive and security actions will be kept without storing amounts or notes in it.',
  },
];

/**
 * Data route (requirements.md §4.3 `/app/settings/data`, §5.1, §10.3).
 * Recorded accounts, transactions, categories, budgets, and goals are real
 * and persisted, but no export or deletion workflow exists yet, so neither
 * is offered as a control. Deletion and retention rules remain an
 * unconfirmed decision and are named as pending.
 */
export default function DataSettingsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Your data</h1>
          <p className="mf-page-header__subtitle">
            Export, deletion, and privacy — what exists today and what is still being decided.
          </p>
        </div>
      </header>

      <Card title="Export and deletion" subtitle="Not built yet">
        <div className="mf-empty">
          <p className="mf-empty__title">Export and deletion are not available yet</p>
          <p className="mf-empty__text">
            Your recorded accounts, transactions, categories, budgets, and goals are stored in your
            own MoneyFlow account. CSV export and account deletion are not implemented, so no
            download or delete button is shown — a control with nothing real behind it would not be
            honest. Nothing is exported or deleted by visiting this page.
          </p>
        </div>
      </Card>

      <Card title="Planned data rights" subtitle="Each arrives with its real workflow">
        <ul className="mf-roadmap">
          {PLANNED_RIGHTS.map((right) => (
            <li key={right.name} className="mf-roadmap__row">
              <span className="mf-roadmap__level">{right.name}</span>
              <span className="mf-roadmap__state">Planned</span>
              <span className="mf-roadmap__scope">{right.scope}</span>
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          Export will use the same trusted records as the rest of the app, so an export can never
          include another person&apos;s data or invent figures that were not recorded.
        </p>
      </Card>

      <aside className="mf-status-note" role="note" aria-label="Pending data decisions">
        <p className="mf-status-note__title">
          Deletion, retention, and export format still need a decision
        </p>
        <p className="mf-status-note__body">
          How long records are kept, what deletion removes from backups, and the exact export format
          are open product and legal decisions. This page does not describe them as settled. Once
          they are confirmed, the deletion flow and its confirmation steps will be built and this
          notice replaced with the real behaviour.
        </p>
      </aside>
    </AppShell>
  );
}
