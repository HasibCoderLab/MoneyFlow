import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SignUpPage from './page';

describe('sign-up route', () => {
  it('renders the form with a working submit action', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('heading', { level: 1, name: /create your account/i })).toBeTruthy();
    const submit = screen.getByRole('button', { name: /create account/i });
    expect(submit.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText(/httponly cookie/i)).toBeTruthy();
  });

  it('rejects malformed email addresses with a field error', () => {
    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.blur(screen.getByLabelText(/email/i));
    expect(screen.getByText(/valid email address/i)).toBeTruthy();
  });

  it('requires the confirmation to match the password', () => {
    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'secret-one' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'secret-two' },
    });
    fireEvent.blur(screen.getByLabelText(/confirm password/i));
    expect(screen.getByText(/passwords do not match/i)).toBeTruthy();
  });

  it('links to sign-in and home, and offers no fake recovery or third-party flows', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('link', { name: /^sign in$/i }).getAttribute('href')).toBe('/sign-in');
    expect(screen.getByRole('link', { name: /moneyflow home/i }).getAttribute('href')).toBe('/');
    expect(screen.queryByText(/forgot.*password/i)).toBeNull();
    expect(screen.queryByText(/google/i)).toBeNull();
  });

  it('provides a skip link for keyboard users', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('link', { name: /skip to main content/i })).toBeTruthy();
  });

  it('collects a full name and shows the accepted minimum password length', () => {
    render(<SignUpPage />);
    expect(screen.getByLabelText(/full name/i)).toBeTruthy();
    expect(screen.getByText(/at least 12 characters/i)).toBeTruthy();
  });

  it('flags a short password once the form is touched', () => {
    render(<SignUpPage />);
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'too-short' } });
    fireEvent.blur(screen.getByLabelText(/^password/i));
    expect(screen.getByText(/passwords must be at least 12 characters/i)).toBeTruthy();
  });
});
