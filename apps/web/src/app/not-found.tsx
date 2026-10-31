import type { Metadata } from 'next';
import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';
import { NotFoundView } from '@/components/not-found-view';

export const metadata: Metadata = {
  title: 'Page not found — MoneyFlow',
  description: 'The page you requested does not exist. Return home or open the MoneyFlow app.',
};

/**
 * Site-wide 404 (Next.js App Router convention). Renders for any unknown
 * public URL. Standalone centered card — no app chrome, no sample data.
 */
export default function SiteNotFound() {
  return (
    <div className="mf-notfound-page">
      <a className="mf-skip-link" href="#main-content">
        <I18nText k="app.skipToContent" />
      </a>
      <header className="mf-notfound-page__brand">
        <Link
          className="mf-notfound-page__brand-link"
          href="/"
          aria-labelledby="notfound-brand-label"
        >
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <span>MoneyFlow</span>
          <span id="notfound-brand-label" className="mf-visually-hidden">
            <I18nText k="auth.home" />
          </span>
        </Link>
      </header>
      <main id="main-content">
        <NotFoundView variant="site" />
      </main>
    </div>
  );
}
