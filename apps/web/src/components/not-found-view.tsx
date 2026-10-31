import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';

type NotFoundViewProps = {
  /** `site` renders public recovery links; `app` renders in-product links. */
  readonly variant: 'site' | 'app';
};

/**
 * Shared 404 content (requirements.md §4, §7).
 *
 * Honest, neutral copy: states the page does not exist, explains nothing
 * was changed, and offers only real destinations. No balances, totals, or
 * sample figures appear here (AGENTS.md rule 12). Styling reuses --mf-*
 * tokens only, so light/dark themes apply automatically.
 */
export function NotFoundView({ variant }: NotFoundViewProps) {
  const isApp = variant === 'app';

  return (
    <div className="mf-notfound" data-testid="not-found-view">
      <div className="mf-notfound__art" aria-hidden="true">
        <span className="mf-notfound__orb mf-notfound__orb--one" />
        <span className="mf-notfound__orb mf-notfound__orb--two" />
        <span className="mf-notfound__orb mf-notfound__orb--three" />
        <span className="mf-notfound__spark mf-notfound__spark--one" />
        <span className="mf-notfound__spark mf-notfound__spark--two" />
        <span className="mf-notfound__spark mf-notfound__spark--three" />
        <span className="mf-notfound__spark mf-notfound__spark--four" />
        <span className="mf-notfound__orbit" />
        <span className="mf-notfound__comet" />
        <span className="mf-notfound__code">404</span>
      </div>
      <p className="mf-notfound__eyebrow">
        <I18nText k="notFound.eyebrow" />
      </p>
      <h1 className="mf-notfound__title">
        <I18nText k="notFound.title" />
      </h1>
      <p className="mf-notfound__body">
        <I18nText k={isApp ? 'notFound.bodyApp' : 'notFound.bodySite'} />
      </p>
      <nav className="mf-notfound__actions" aria-labelledby="notfound-recovery">
        <span id="notfound-recovery" className="mf-visually-hidden">
          <I18nText k="notFound.recovery" />
        </span>
        {isApp ? (
          <>
            <Link className="mf-btn mf-btn--primary" href="/app/dashboard">
              <I18nText k="notFound.backDashboard" />
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/app/transactions">
              <I18nText k="notFound.viewTransactions" />
            </Link>
          </>
        ) : (
          <>
            <Link className="mf-btn mf-btn--primary" href="/">
              <I18nText k="notFound.backHome" />
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/app/dashboard">
              <I18nText k="notFound.openApp" />
            </Link>
          </>
        )}
      </nav>
      <p className="mf-notfound__hint">
        <I18nText k={isApp ? 'notFound.hintApp' : 'notFound.hintSite'} />
      </p>
    </div>
  );
}
