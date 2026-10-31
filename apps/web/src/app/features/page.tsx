import type { Metadata } from 'next';
import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';
import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'Features — MoneyFlow',
  description:
    'What MoneyFlow does today: accounts, income/expense/transfer records, categories, budgets, savings goals, reports, a customizable dashboard, CSV export, and account deletion.',
};

const AVAILABLE = [
  {
    titleKey: 'features.item.accounts.title',
    bodyKey: 'features.item.accounts.body',
  },
  {
    titleKey: 'features.item.transactions.title',
    bodyKey: 'features.item.transactions.body',
  },
  {
    titleKey: 'features.item.categories.title',
    bodyKey: 'features.item.categories.body',
  },
  {
    titleKey: 'features.item.budgets.title',
    bodyKey: 'features.item.budgets.body',
  },
  {
    titleKey: 'features.item.goals.title',
    bodyKey: 'features.item.goals.body',
  },
  {
    titleKey: 'features.item.reports.title',
    bodyKey: 'features.item.reports.body',
  },
  {
    titleKey: 'features.item.customization.title',
    bodyKey: 'features.item.customization.body',
  },
  {
    titleKey: 'features.item.data.title',
    bodyKey: 'features.item.data.body',
  },
] as const;

const NOT_YET = [
  'features.notYet.onboarding',
  'features.notYet.recovery',
  'features.notYet.search',
  'features.notYet.later',
] as const;

export default function FeaturesPage() {
  return (
    <MarketingPage eyebrowKey="features.eyebrow" titleKey="features.title" leadKey="features.lead">
      <DocSection id="available" titleKey="features.availableTitle">
        <ul className="mf-feature-grid">
          {AVAILABLE.map((feature) => (
            <li key={feature.titleKey} className="mf-feature">
              <h3 className="mf-feature__title">
                <I18nText k={feature.titleKey} />
              </h3>
              <p className="mf-feature__text">
                <I18nText k={feature.bodyKey} />
              </p>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="not-yet" titleKey="features.notYetTitle">
        <ul className="mf-report-list">
          {NOT_YET.map((item) => (
            <li key={item}>
              <I18nText k={item} />
            </li>
          ))}
        </ul>
        <p className="mf-doc__note">
          <I18nText k="features.noteFoundation" />{' '}
          <Link href="/site-map">
            <I18nText k="features.noteSitemap" />
          </Link>{' '}
          <I18nText k="features.noteMiddle" />{' '}
          <Link href="/sign-up">
            <I18nText k="features.noteCreate" />
          </Link>{' '}
          <I18nText k="features.noteAfter" />
        </p>
      </DocSection>
    </MarketingPage>
  );
}
