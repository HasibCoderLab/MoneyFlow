import type { Metadata } from 'next';
import Link from 'next/link';

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
        Skip to main content
      </a>
      <header className="mf-notfound-page__brand">
        <Link className="mf-notfound-page__brand-link" href="/" aria-label="MoneyFlow home">
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <span>
            MoneyFlow <span className="mf-landing-brand__working">(working title)</span>
          </span>
        </Link>
      </header>
      <main id="main-content">
        <NotFoundView variant="site" />
      </main>
    </div>
  );
}
