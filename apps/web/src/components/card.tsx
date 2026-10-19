import type { ReactNode } from 'react';

type CardProps = {
  /** Title may be a runtime string so translated pages can pass I18nText. */
  readonly title?: ReactNode;
  /** Optional short context line shown under the title. */
  readonly subtitle?: ReactNode;
  /** Optional trailing action slot, e.g. a "View all" link. */
  readonly action?: ReactNode;
  readonly children: ReactNode;
};

/** Neutral surface card used across the preview (requirements.md §7.2). */
export function Card({ title, subtitle, action, children }: CardProps) {
  return (
    <section className="mf-card">
      {title ? (
        <header className="mf-card__header">
          <div>
            <h2 className="mf-card__title">{title}</h2>
            {subtitle ? <p className="mf-card__subtitle">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}
