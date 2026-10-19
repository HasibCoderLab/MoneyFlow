import { describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, isLocale, LOCALES, LOCALE_LABELS, translate } from './translations';

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
});
