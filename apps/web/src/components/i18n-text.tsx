'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

type I18nTextProps = {
  /** Dictionary key; both locales are type-checked for full coverage. */
  readonly k: TranslationKey;
  /** Substitutes `{name}` tokens, e.g. `{ year: 2026 }`. */
  readonly params?: Readonly<Record<string, string | number>>;
};

/**
 * Renders one translated runtime string inside a server component.
 *
 * The locale context is client state, so pages that must stay server
 * components (they export `metadata`) wrap their covered text in this
 * one-node helper instead of converting the whole page. Outside the
 * provider it resolves to English, matching `useLocale`.
 */
export function I18nText({ k, params }: I18nTextProps) {
  const { t } = useLocale();
  return <>{t(k, params)}</>;
}
