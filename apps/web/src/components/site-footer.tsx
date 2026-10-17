import Link from 'next/link';

/**
 * Public site footer (requirements.md §1.2, §4.1, §7.4).
 *
 * Ground rules this follows:
 * - Only links to routes that exist: in-page anchors on `/` and the live
 *   `/app/*` preview pages. Privacy/Terms/Contact pages do not exist yet, so
 *   they appear as honest forthcoming text — never as dead links.
 * - No testimonials, user counts, certifications, pricing, or guarantees.
 * - States the working-title status, the PaathAI relationship, and the
 *   not-financial-advice + sample-data disclaimers in plain language.
 */
const PRODUCT_LINKS = [
  { label: 'Capabilities', href: '/#capabilities' },
  { label: 'Privacy and trust', href: '/#trust' },
  { label: 'Roadmap', href: '/#roadmap' },
] as const;

const PREVIEW_LINKS = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Accounts', href: '/app/accounts' },
  { label: 'Transactions', href: '/app/transactions' },
  { label: 'Budgets', href: '/app/budgets' },
  { label: 'Savings goals', href: '/app/goals' },
  { label: 'Reports', href: '/app/reports' },
] as const;

export function SiteFooter() {
  return (
    <footer className="mf-site-footer">
      <div className="mf-landing-container mf-site-footer__inner">
        <div className="mf-site-footer__brand">
          <p className="mf-landing-footer__brand">
            MoneyFlow <span className="mf-landing-brand__working">(working title)</span>
          </p>
          <p className="mf-site-footer__promise">
            Know your money. Build better habits. Reach your goals.
          </p>
          <p className="mf-landing-footer__note">
            A personal finance companion for students, beginner savers, and young earners — a
            standalone product under the PaathAI umbrella, separate from the PaathAI education
            platform.
          </p>
        </div>

        <nav className="mf-site-footer__nav" aria-label="Product">
          <p className="mf-site-footer__heading">Product</p>
          <ul>
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="mf-site-footer__link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="mf-site-footer__nav" aria-label="Preview">
          <p className="mf-site-footer__heading">UI preview</p>
          <ul>
            {PREVIEW_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="mf-site-footer__link" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mf-site-footer__legal">
          <p className="mf-site-footer__heading">Legal</p>
          <p className="mf-landing-footer__note">
            Privacy policy and terms will be published here before public launch. Nothing here is
            financial advice, and no figures in the preview are real.
          </p>
        </div>
      </div>

      <div className="mf-landing-container mf-site-footer__base">
        <p>
          © {new Date().getFullYear()} MoneyFlow — foundation build. The final product name is not
          yet decided.
        </p>
      </div>
    </footer>
  );
}
