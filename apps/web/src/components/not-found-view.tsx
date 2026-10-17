import Link from 'next/link';

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
      <p className="mf-notfound__eyebrow">Error 404 · Page not found</p>
      <h1 className="mf-notfound__title">This page does not exist</h1>
      <p className="mf-notfound__body">
        The link you followed may be broken, or the page may have been moved. Nothing was changed
        {isApp
          ? ' — your accounts, transactions, goals, and budgets are unaffected.'
          : ' — MoneyFlow is still a foundation build and no financial data is affected.'}
      </p>
      <nav className="mf-notfound__actions" aria-label="Page-not-found recovery">
        {isApp ? (
          <>
            <Link className="mf-btn mf-btn--primary" href="/app/dashboard">
              Back to dashboard
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/app/transactions">
              View transactions
            </Link>
          </>
        ) : (
          <>
            <Link className="mf-btn mf-btn--primary" href="/">
              Back to home
            </Link>
            <Link className="mf-btn mf-btn--ghost" href="/app/dashboard">
              Open UI preview
            </Link>
          </>
        )}
      </nav>
      <p className="mf-notfound__hint">
        {isApp
          ? 'Use the menu to reach Accounts, Budgets, Goals, Reports, or Settings.'
          : 'The UI preview shows the planned dashboard using clearly labelled sample data.'}
      </p>
    </div>
  );
}
