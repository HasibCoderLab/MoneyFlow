import type { Metadata } from 'next';
import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';
import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'Contact — MoneyFlow',
  description:
    'Report a problem or ask a question about MoneyFlow through the project issue tracker.',
};

const ISSUES_URL = 'https://github.com/HasibCoderLab/MoneyFlow/issues';

const INCLUDE = [
  'contact.include.what',
  'contact.include.where',
  'contact.include.context',
] as const;

export default function ContactPage() {
  return (
    <MarketingPage eyebrowKey="contact.eyebrow" titleKey="contact.title" leadKey="contact.lead">
      <DocSection id="issues" titleKey="contact.issuesTitle">
        <p>
          <I18nText k="contact.issuesBody" />
        </p>
        <p>
          <a className="mf-btn mf-btn--primary" href={ISSUES_URL} rel="noreferrer">
            <I18nText k="contact.issuesButton" />
          </a>
        </p>
      </DocSection>

      <DocSection id="what-to-include" titleKey="contact.includeTitle">
        <ul className="mf-report-list">
          {INCLUDE.map((key) => (
            <li key={key}>
              <I18nText k={key} />
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="privacy" titleKey="contact.privacyTitle">
        <p>
          <I18nText k="contact.privacyBody" />
        </p>
        <p className="mf-doc__note">
          <I18nText k="contact.privacyNoteBefore" />{' '}
          <Link href="/site-map">
            <I18nText k="contact.privacyNoteSitemap" />
          </Link>{' '}
          <I18nText k="contact.privacyNoteAfter" />
        </p>
      </DocSection>
    </MarketingPage>
  );
}
