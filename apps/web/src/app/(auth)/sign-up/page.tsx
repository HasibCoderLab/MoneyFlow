import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthBrandLink } from '@/components/auth-brand-link';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Create account — MoneyFlow',
  description: 'Create your MoneyFlow account.',
};

/**
 * Sign-up route (requirements.md §4.2, §5.1). Split layout with a trust
 * panel on desktop, local validation, and a live submit connected to the
 * API registration endpoint. No recovery or third-party buttons exist yet —
 * they arrive only with their real flows.
 */
export default function SignUpPage() {
  return (
    <AuthShell>
      <p className="mf-auth-card__brand">
        <AuthBrandLink />
      </p>
      <header className="mf-auth-card__intro">
        <h1 className="mf-auth-card__title">
          <I18nText k="auth.signUpTitle" />
        </h1>
        <p className="mf-auth-card__subtitle">
          <I18nText k="auth.signUpSubtitle" />
        </p>
      </header>
      <AuthForm variant="sign-up" />
      <p className="mf-auth-card__footer">
        <I18nText k="auth.alreadyHave" />{' '}
        <Link href="/sign-in">
          <I18nText k="common.signIn" />
        </Link>
      </p>
    </AuthShell>
  );
}
