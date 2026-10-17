import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Your data — MoneyFlow UI preview',
  description:
    'Export and deletion — no records exist in this preview, so there is nothing to export or delete yet.',
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
 * Data route (requirements.md §4.3 `/app/settings/data`, §5.1, §10.3). No
 * financial record exists in this preview, so there is genuinely nothing to
 * export or delete and the page states that plainly. The exact deletion and
 * retention rules are still an unconfirmed decision, so they are named as
 * pending rather than described as agreed behaviour.
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

      <Card title="Export and deletion" subtitle="No records exist in this preview">
        <div className="mf-empty">
          <p className="mf-empty__title">There is nothing to export or delete yet</p>
          <p className="mf-empty__text">
            This build stores no accounts, transactions, goals, or budgets — on the server or in
            your browser, apart from the theme choice on the preferences page. A download or delete
            button here would have nothing real behind it, so neither is shown.
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
