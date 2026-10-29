import type { Metadata } from 'next';
import Link from 'next/link';

import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'Features — MoneyFlow',
  description:
    'What MoneyFlow does today: accounts, income/expense/transfer records, categories, budgets, savings goals, reports, a customizable dashboard, CSV export, and account deletion.',
};

const AVAILABLE = [
  {
    title: 'Accounts and wallets',
    body: 'Create a cash, bank, mobile-wallet, savings, or custom account with an opening balance. Current balances are derived from your recorded transactions; archiving keeps history intact.',
  },
  {
    title: 'Income, expenses, and transfers',
    body: 'Record money in, money out, and moves between your own accounts. Transfers never count as income or spending. Entries can be edited and deleted, and repeat submissions are rejected by an idempotency key.',
  },
  {
    title: 'Categories you control',
    body: 'Start from clear defaults, then rename, recolour, or archive your own income and expense categories. A category still in use cannot be silently deleted.',
  },
  {
    title: 'Budgets by period',
    body: 'Set a monthly budget with optional category limits. See actual spending, remaining amount, and percentage used, calculated only from qualifying expense records in your timezone.',
  },
  {
    title: 'Savings goals',
    body: 'Track a goal with a contribution ledger, including an editable emergency-fund preset. Progress and remaining amount come from recorded contributions, with overfunding displayed honestly.',
  },
  {
    title: 'Dashboard and reports',
    body: 'See tracked balance, period income and expenses, goal progress, and recent activity. Reports show income versus expenses and spending by category for the period you choose.',
  },
  {
    title: 'Customization and preferences',
    body: 'Show, hide, and reorder dashboard widgets; the layout is saved to your account. Choose currency, timezone, date format, week start, theme, and English or Bangla labels.',
  },
  {
    title: 'Your data, in your hands',
    body: 'Export your transactions as CSV and delete your account through a confirmed self-service flow. Records are scoped to the signed-in owner on the server, not just hidden in the interface.',
  },
] as const;

const NOT_YET = [
  'Guided onboarding — designed and approved, not built yet.',
  'Password recovery and email verification — waiting on an email provider decision.',
  'Text search across transactions — filters cover type, account, category, dates, and amounts today.',
  'AI assistant, recurring transactions, notifications, and bank or mobile-wallet connections — later phases, deliberately excluded from this build.',
] as const;

export default function FeaturesPage() {
  return (
    <MarketingPage
      eyebrow="Features"
      title="What MoneyFlow does today"
      lead="An honest inventory: only shipped capabilities are listed as available. Everything else is labelled as not built."
    >
      <DocSection id="available" title="Available now">
        <ul className="mf-feature-grid">
          {AVAILABLE.map((feature) => (
            <li key={feature.title} className="mf-feature">
              <h3 className="mf-feature__title">{feature.title}</h3>
              <p className="mf-feature__text">{feature.body}</p>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="not-yet" title="Not built yet">
        <ul className="mf-report-list">
          {NOT_YET.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mf-doc__note">
          This is a foundation build, not a finished product. See the{' '}
          <Link href="/site-map">sitemap</Link> for the status of every route, or{' '}
          <Link href="/sign-up">create an account</Link> to try the available workflows.
        </p>
      </DocSection>
    </MarketingPage>
  );
}
