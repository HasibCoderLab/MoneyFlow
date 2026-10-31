'use client';

import Link from 'next/link';

import { useLocale } from '@/lib/i18n/locale-context';

/** Brand link shared by the sign-in and sign-up cards. */
export function AuthBrandLink() {
  const { t } = useLocale();
  return (
    <Link className="mf-auth-card__brand-link" href="/" aria-label={t('auth.home')}>
      <span className="mf-brand-mark" aria-hidden="true">
        M
      </span>
      <span>MoneyFlow</span>
    </Link>
  );
}
