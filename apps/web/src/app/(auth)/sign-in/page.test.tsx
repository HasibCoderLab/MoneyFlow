import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SignInPage from './page';

describe('sign-in route', () => {
  it('renders the form with a working submit action', () => {
    render(<SignInPage />);
    expect(screen.getByRole('heading', { level: 1, name: /sign in/i })).toBeTruthy();
    const submit = screen.getByRole('button', { name: /^sign in$/i });
    expect(submit.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText(/httponly cookie/i)).toBeTruthy();
  });

  it('rejects malformed email addresses with a field error', () => {
    render(<SignInPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.blur(screen.getByLabelText(/email/i));
    expect(screen.getByText(/valid email address/i)).toBeTruthy();
  });

  it('requires email and password once the form is touched', () => {
    render(<SignInPage />);
    fireEvent.blur(screen.getByLabelText(/email/i));
    expect(screen.getByText(/enter your email address/i)).toBeTruthy();
    expect(screen.getByText(/enter your password/i)).toBeTruthy();
  });

  it('has no password-confirmation field', () => {
    render(<SignInPage />);
    expect(screen.queryByLabelText(/confirm password/i)).toBeNull();
  });

  it('links to sign-up and home, and offers no fake recovery or third-party flows', () => {
    render(<SignInPage />);
    expect(screen.getByRole('link', { name: /create an account/i }).getAttribute('href')).toBe(
      '/sign-up',
    );
    const homeLinks = screen.getAllByRole('link', { name: /moneyflow home/i });
    expect(homeLinks.length).toBeGreaterThan(0);
    for (const link of homeLinks) {
      expect(link.getAttribute('href')).toBe('/');
    }
    expect(screen.queryByText(/forgot.*password/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('provides a skip link for keyboard users', () => {
    render(<SignInPage />);
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeTruthy();
  });

  it('lets the reviewer reveal and re-hide the password (local only, no session)', () => {
    render(<SignInPage />);
    const password = screen.getByLabelText(/^password/i);
    expect(password.getAttribute('type')).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(password.getAttribute('type')).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(password.getAttribute('type')).toBe('password');
  });
});
