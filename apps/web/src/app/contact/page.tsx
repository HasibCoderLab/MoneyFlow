import type { Metadata } from 'next';
import Link from 'next/link';

import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'Contact — MoneyFlow',
  description:
    'Report a problem or ask a question about MoneyFlow through the project issue tracker.',
};

const ISSUES_URL = 'https://github.com/HasibCoderLab/MoneyFlow/issues';

export default function ContactPage() {
  return (
    <MarketingPage
      eyebrow="Contact"
      title="Get help or report a problem"
      lead="MoneyFlow is an early build without a support inbox yet. The project issue tracker is the working support channel."
    >
      <DocSection id="issues" title="Open an issue">
        <p>
          Report a bug, ask a question, or suggest an improvement in the project issue tracker. It
          is the only support channel that currently exists, and no email address or contact form is
          offered because neither is set up.
        </p>
        <p>
          <a className="mf-btn mf-btn--primary" href={ISSUES_URL} rel="noreferrer">
            Open the issue tracker
          </a>
        </p>
      </DocSection>

      <DocSection id="what-to-include" title="What to include">
        <ul className="mf-report-list">
          <li>What you were trying to do, and what happened instead.</li>
          <li>The page address and the approximate time.</li>
          <li>Whether you were signed in, and which browser and device you used.</li>
        </ul>
      </DocSection>

      <DocSection id="privacy" title="Please do not share private financial details">
        <p>
          Do not post your password, session cookie, or real account numbers, and redact transaction
          descriptions and amounts from screenshots. A description of the problem is enough;
          exported records are not needed to investigate most issues.
        </p>
        <p className="mf-doc__note">
          For what the app stores and how it is protected, see the{' '}
          <Link href="/site-map">sitemap</Link> for the current status of the privacy policy. It is
          not published yet and is not replaced by placeholder text.
        </p>
      </DocSection>
    </MarketingPage>
  );
}
