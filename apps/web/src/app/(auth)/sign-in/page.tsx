import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthBrandLink } from '@/components/auth-brand-link';
import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Sign in — MoneyFlow',
  description: 'Sign in to your MoneyFlow account.',
};

/**
 * Sign-in route (requirements.md §4.2, §5.1). Split layout with a trust
 * panel on desktop, local validation, and a live submit connected to the
 * API session endpoints. The form reads a `?next=` return path and validates
 * it before navigating, so a crafted link cannot send a freshly signed-in
 * user to another origin. No recovery or third-party buttons exist yet —
 * they arrive only with their real flows.
 */
export default function SignInPage() {
  return (
    <AuthShell>
      <p className="mf-auth-card__brand">
        <AuthBrandLink />
      </p>
      <header className="mf-auth-card__intro">
        <h1 className="mf-auth-card__title">
          <I18nText k="auth.signInTitle" />
        </h1>
        <p className="mf-auth-card__subtitle">
          <I18nText k="auth.signInSubtitle" />
        </p>
      </header>
      <AuthForm variant="sign-in" />
      <p className="mf-auth-card__footer">
        <I18nText k="auth.newHere" />{' '}
        <Link href="/sign-up">
          <I18nText k="auth.createAccountLink" />
        </Link>
      </p>
    </AuthShell>
  );
}
