'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { useLocale } from '@/lib/i18n/locale-context';
import { LOCALES, LOCALE_HTML_LANG, LOCALE_LABELS, type Locale } from '@/lib/i18n/translations';

/**
 * Accessible language switcher: a compact dropdown listing English and
 * বাংলা under their native names (requirements.md §7.4, ADR-0009/ADR-0012).
 *
 * - The trigger always shows the *current* language; the open menu exposes
 *   the selection with `menuitemradio` + `aria-checked`.
 * - Keyboard: Enter/Space or ArrowUp/Down open the menu (focus lands on the
 *   first/last item), Arrow keys and Home/End move between items, Escape
 *   closes and returns focus to the trigger, Tab closes and continues.
 * - Selecting the already-active locale only closes the menu — no duplicate
 *   preference update is sent.
 * - Switching is pure client state (no navigation, no page reload), so the
 *   current path and query are inherently preserved and there is no
 *   redirect surface. The choice persists through `mf-locale` and, when a
 *   session exists, `PATCH /api/v1/preferences`.
 * - A polite live region announces the change in the newly selected
 *   language; `<html lang>` is updated with it so screen readers switch
 *   pronunciation together with the interface.
 */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const openIndexRef = useRef(0);
  const announcePendingRef = useRef(false);

  const triggerId = useId();
  const menuId = useId();

  // Move focus into the menu only when it opens (not on later re-renders).
  useEffect(() => {
    if (open) itemRefs.current[openIndexRef.current]?.focus();
  }, [open]);

  // Close when a click or tap lands outside the control.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: Event) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Announce a completed switch in the new locale (set before setLocale).
  useEffect(() => {
    if (!announcePendingRef.current) return;
    announcePendingRef.current = false;
    setAnnouncement(t('language.announce', { language: LOCALE_LABELS[locale] }));
  }, [locale, t]);

  function openMenu(index: number) {
    openIndexRef.current = index;
    setOpen(true);
  }

  function closeWithFocus() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function select(next: Locale) {
    if (next === locale) {
      // Already active: just close, never send a duplicate update.
      closeWithFocus();
      return;
    }
    announcePendingRef.current = true;
    closeWithFocus();
    setLocale(next);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      if (!open) return;
      event.preventDefault();
      closeWithFocus();
      return;
    }
    if (!open) return;

    const items = itemRefs.current.filter((item): item is HTMLButtonElement => item !== null);
    const currentIndex = items.findIndex((item) => item === document.activeElement);
    if (currentIndex === -1) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === 'Tab') {
      // Leave focus where Tab takes it; the menu closes and re-renders hidden.
      setOpen(false);
    }
  }

  // ArrowUp/ArrowDown on the closed trigger open the menu directly;
  // Enter/Space reach the button's click handler instead.
  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(LOCALES.length - 1);
    }
  }

  const currentLabel = LOCALE_LABELS[locale];

  return (
    <div ref={rootRef} className="mf-lang-switcher" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="mf-btn mf-btn--ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t('language.triggerLabel', { current: currentLabel })}
        title={t('language.triggerLabel', { current: currentLabel })}
        onClick={() => (open ? setOpen(false) : openMenu(0))}
        onKeyDown={onTriggerKeyDown}
      >
        <GlobeGlyph />
        <span lang={LOCALE_HTML_LANG[locale]}>{currentLabel}</span>
        <ChevronGlyph />
      </button>

      <ul
        id={menuId}
        role="menu"
        aria-labelledby={triggerId}
        className="mf-lang-switcher__menu"
        hidden={!open}
      >
        {LOCALES.map((option, index) => {
          const checked = option === locale;
          return (
            <li key={option} role="none">
              <button
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                lang={LOCALE_HTML_LANG[option]}
                className="mf-lang-switcher__item"
                onClick={() => select(option)}
              >
                <span className="mf-lang-switcher__check" aria-hidden="true">
                  {checked ? <CheckGlyph /> : null}
                </span>
                {LOCALE_LABELS[option]}
              </button>
            </li>
          );
        })}
      </ul>

      <span className="mf-visually-hidden" role="status">
        {announcement}
      </span>
    </div>
  );
}

function GlobeGlyph() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.7 5.7 3.7 9S14.5 18.4 12 21c-2.5-2.6-3.7-5.7-3.7-9S9.5 5.6 12 3Z" />
    </svg>
  );
}

function ChevronGlyph() {
  return (
    <svg
      className="mf-lang-switcher__chevron"
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}
