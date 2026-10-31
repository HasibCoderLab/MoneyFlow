import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALES,
  LOCALE_LABELS,
  TRANSLATIONS,
  translate,
  type TranslationKey,
} from './translations';

/** `{name}` tokens used by a template, e.g. `{count}`. */
function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

describe('ui locale dictionaries (requirements.md §7.4)', () => {
  it('offers exactly the two launch languages named in requirements.md §7.4', () => {
    expect(LOCALES).toEqual(['en', 'bn']);
    expect(DEFAULT_LOCALE).toBe('en');
    expect(LOCALE_LABELS.bn).toBe('বাংলা');
  });

  it('validates values read from storage at runtime', () => {
    expect(isLocale('bn')).toBe(true);
    expect(isLocale('en')).toBe(true);
    expect(isLocale('french')).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('substitutes known {name} parameters and keeps unknown tokens visible', () => {
    const rendered = translate('en', 'footer.copyright', { year: 2026 });
    expect(rendered).toBe(
      '© 2026 MoneyFlow — foundation build. The final product name is not yet decided.',
    );
    expect(translate('en', 'footer.copyright')).toContain('{year}');
  });

  it('labels every locale in its own language in the toggle source data', () => {
    for (const locale of LOCALES) {
      expect(LOCALE_LABELS[locale].length).toBeGreaterThan(0);
    }
  });

  it('has the same non-empty key set in every locale', () => {
    const englishKeys = Object.keys(TRANSLATIONS.en).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(TRANSLATIONS[locale]).sort()).toEqual(englishKeys);
      for (const key of englishKeys) {
        expect(
          TRANSLATIONS[locale][key as TranslationKey]?.trim().length,
          `${locale}:${key}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('keeps placeholder tokens identical across translations', () => {
    for (const key of Object.keys(TRANSLATIONS.en) as TranslationKey[]) {
      const expected = placeholders(TRANSLATIONS.en[key]);
      for (const locale of LOCALES) {
        expect(placeholders(TRANSLATIONS[locale][key]), `${locale}:${key}`).toEqual(expected);
      }
    }
  });

  it('resolves Bengali text for a representative key from each app area', () => {
    const keys: readonly TranslationKey[] = [
      'accounts.emptyTitle',
      'transactions.showing',
      'txform.save',
      'settings.title',
      'dashboard.allHiddenTitle',
      'notFound.title',
    ];
    for (const key of keys) {
      expect(TRANSLATIONS.bn[key], key).not.toBe(TRANSLATIONS.en[key]);
    }
  });
});
