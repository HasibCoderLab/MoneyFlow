import { describe, expect, it } from 'vitest';

import { hasSessionCookie, isProtectedPath, safeRedirectPath, signInPathFor } from './route-access';

describe('protected path detection', () => {
  it('protects app and onboarding routes only', () => {
    expect(isProtectedPath('/app')).toBe(true);
    expect(isProtectedPath('/app/dashboard')).toBe(true);
    expect(isProtectedPath('/app/goals/123')).toBe(true);
    expect(isProtectedPath('/onboarding')).toBe(true);

    expect(isProtectedPath('/')).toBe(false);
    expect(isProtectedPath('/site-map')).toBe(false);
    expect(isProtectedPath('/sign-in')).toBe(false);
    expect(isProtectedPath('/application')).toBe(false);
  });
});

describe('session cookie presence', () => {
  it('recognises plain and secure Better Auth session cookies', () => {
    expect(hasSessionCookie([{ name: 'better-auth.session_token' }])).toBe(true);
    expect(hasSessionCookie([{ name: '__Secure-better-auth.session_token' }])).toBe(true);
  });

  it('does not mistake unrelated cookies for a session', () => {
    expect(hasSessionCookie([])).toBe(false);
    expect(hasSessionCookie([{ name: 'mf-theme' }, { name: 'mf-locale' }])).toBe(false);
  });
});

describe('safe post-sign-in destination', () => {
  it('keeps internal paths, including query strings', () => {
    expect(safeRedirectPath('/app/transactions')).toBe('/app/transactions');
    expect(safeRedirectPath('/app/reports?period=month')).toBe('/app/reports?period=month');
  });

  it('rejects other origins and protocol-relative URLs', () => {
    expect(safeRedirectPath('https://evil.example')).toBe('/app/dashboard');
    expect(safeRedirectPath('//evil.example/app')).toBe('/app/dashboard');
    expect(safeRedirectPath('/\\evil.example')).toBe('/app/dashboard');
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/app/dashboard');
  });

  it('rejects control characters and empty values', () => {
    expect(safeRedirectPath('/app/\u0000dashboard')).toBe('/app/dashboard');
    expect(safeRedirectPath('')).toBe('/app/dashboard');
    expect(safeRedirectPath(null)).toBe('/app/dashboard');
    expect(safeRedirectPath(undefined, '/app/goals')).toBe('/app/goals');
  });

  it('avoids looping back to the auth pages', () => {
    expect(safeRedirectPath('/sign-in')).toBe('/app/dashboard');
    expect(safeRedirectPath('/sign-in?next=/app')).toBe('/app/dashboard');
    expect(safeRedirectPath('/sign-up')).toBe('/app/dashboard');
  });

  it('builds an encoded sign-in URL for the requested page', () => {
    expect(signInPathFor('/app/goals?tab=active')).toBe(
      '/sign-in?next=%2Fapp%2Fgoals%3Ftab%3Dactive',
    );
  });
});
