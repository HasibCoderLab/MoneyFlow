import type { Metadata } from 'next';
import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';
import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'About — MoneyFlow',
  description:
    'MoneyFlow is a personal finance companion for students, beginner savers, and young earners — a standalone product under the PaathAI umbrella.',
};

const PRINCIPLES = [
  'about.principle.numbers',
  'about.principle.isolation',
  'about.principle.honesty',
  'about.principle.neutral',
  'about.principle.status',
] as const;

export default function AboutPage() {
  return (
    <MarketingPage eyebrowKey="about.eyebrow" titleKey="about.title" leadKey="about.lead">
      <DocSection id="purpose" titleKey="about.purposeTitle">
        <p>
          <I18nText k="about.purposeBody1" />
        </p>
        <p>
          <I18nText k="about.purposeBody2" />
        </p>
      </DocSection>

      <DocSection id="principles" titleKey="about.principlesTitle">
        <ul className="mf-report-list">
          {PRINCIPLES.map((key) => (
            <li key={key}>
              <I18nText k={key} />
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="relationship" titleKey="about.relationshipTitle">
        <p>
          <I18nText k="about.relationshipBody" />
        </p>
      </DocSection>

      <DocSection id="status" titleKey="about.statusTitle">
        <p>
          <I18nText k="about.statusBody" />
        </p>
        <p className="mf-doc__note">
          <I18nText k="about.statusNoteBefore" />{' '}
          <Link href="/site-map">
            <I18nText k="about.statusNoteSitemap" />
          </Link>
          <I18nText k="about.statusNoteMiddle" />{' '}
          <Link href="/contact">
            <I18nText k="about.statusNoteContact" />
          </Link>
          <I18nText k="about.statusNoteAfter" />
        </p>
      </DocSection>
    </MarketingPage>
  );
}
