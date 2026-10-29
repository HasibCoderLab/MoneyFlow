import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthForm } from './auth-form';

const BASE_URL = 'http://localhost:4000';

function mockFetchOk() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ user: { id: 'u-1', email: 'a@example.com', name: 'Ada' } }),
  } as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
  window.history.replaceState({}, '', '/sign-in');
});

async function submitValidSignIn(onAuthenticated: (destination: string) => void) {
  process.env.NEXT_PUBLIC_API_URL = BASE_URL;
  mockFetchOk();
  render(<AuthForm variant="sign-in" onAuthenticated={onAuthenticated} />);
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
  fireEvent.change(screen.getByLabelText(/^password/i), {
    target: { value: 'correct-horse-12' },
  });
  fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));
}

describe('AuthForm submission', () => {
  it('never calls the API while client-side validation fails', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const onAuthenticated = vi.fn();
    render(<AuthForm variant="sign-in" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(screen.getByText(/valid email address/i)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });

  it('returns to an internal ?next= destination after sign-in', async () => {
    window.history.replaceState({}, '', '/sign-in?next=%2Fapp%2Fgoals');
    const onAuthenticated = vi.fn();
    await submitValidSignIn(onAuthenticated);

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('/app/goals'));
  });

  it('ignores an external ?next= destination', async () => {
    window.history.replaceState({}, '', '/sign-in?next=https%3A%2F%2Fevil.example');
    const onAuthenticated = vi.fn();
    await submitValidSignIn(onAuthenticated);

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('/app/dashboard'));
  });

  it('signs in and navigates to the dashboard on success', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOk();
    const onAuthenticated = vi.fn();
    render(<AuthForm variant="sign-in" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'correct-horse-12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('/app/dashboard'));
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/auth/sign-in/email`,
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('shows the safe server message and re-enables the form on failure', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid email or password.' }),
      } as Response),
    );
    const onAuthenticated = vi.fn();
    render(<AuthForm variant="sign-in" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'wrong-password-12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/invalid email or password/i);
    expect(onAuthenticated).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^sign in$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('registers with name, email, and matching passwords', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOk();
    const onAuthenticated = vi.fn();
    render(<AuthForm variant="sign-up" onAuthenticated={onAuthenticated} />);

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bo' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'b@example.com' } });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: 'long-enough-12' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'long-enough-12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith('/app/dashboard'));
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/auth/sign-up/email`,
      expect.objectContaining({
        body: JSON.stringify({ name: 'Bo', email: 'b@example.com', password: 'long-enough-12' }),
      }),
    );
  });
});
