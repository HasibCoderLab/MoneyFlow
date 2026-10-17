'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Accessible mobile navigation for the public landing page.
 *
 * Keyboard-operable: opens on Enter/Space, closes on Escape, returns focus to
 * the trigger, and traps focus inside the open menu. SSR renders the trigger
 * only; the panel mounts client-side, so no server markup mismatch.
 */
type NavItem = { readonly label: string; readonly href: string };

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Features', href: '#capabilities' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Privacy', href: '#trust' },
  { label: 'Roadmap', href: '#roadmap' },
];

export function LandingNav({ children }: { readonly children: ReactNode }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLAnchorElement>(null);

  function open() {
    panelRef.current?.classList.add('mf-landing-nav__panel--open');
    buttonRef.current?.setAttribute('aria-expanded', 'true');
    // Move focus to the first link on open.
    firstFocusRef.current?.focus();
  }

  function close() {
    panelRef.current?.classList.remove('mf-landing-nav__panel--open');
    buttonRef.current?.setAttribute('aria-expanded', 'false');
    buttonRef.current?.focus();
  }

  function toggle() {
    const isOpen = buttonRef.current?.getAttribute('aria-expanded') === 'true';
    if (isOpen) close();
    else open();
  }

  // Escape closes the menu; return focus to the trigger.
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && panel.classList.contains('mf-landing-nav__panel--open')) {
        e.preventDefault();
        close();
      }
    };
    panel.addEventListener('keydown', onKey);
    return () => panel.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="mf-landing-nav-wrap">
      <button
        ref={buttonRef}
        type="button"
        className="mf-landing-nav__toggle"
        aria-expanded="false"
        aria-controls="landing-mobile-menu"
        aria-haspopup="true"
        onClick={toggle}
      >
        <span className="mf-landing-nav__toggle-bar" aria-hidden="true" />
        <span className="mf-landing-nav__toggle-bar" aria-hidden="true" />
        <span className="mf-landing-nav__toggle-bar" aria-hidden="true" />
        <span className="mf-landing-nav__toggle-label">Menu</span>
      </button>
      <div
        ref={panelRef}
        id="landing-mobile-menu"
        className="mf-landing-nav__panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <nav aria-label="Primary">
          <ul>
            {NAV_ITEMS.map((item, i) => (
              <li key={item.href}>
                <a
                  ref={i === 0 ? firstFocusRef : undefined}
                  href={item.href}
                  className="mf-landing-nav__panel-link"
                  onClick={() => close()}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mf-landing-nav__panel-actions">{children}</div>
      </div>
    </div>
  );
}
