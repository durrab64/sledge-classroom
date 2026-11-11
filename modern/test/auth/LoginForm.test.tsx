'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from '@/features/auth/LoginForm';
import { AuthProvider } from '@/contexts/AuthContext';

// vi.hoisted keeps the mock reference available inside the vi.mock factory
// without triggering the module-factory temporal-dead-zone restriction.
const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));

vi.mock('@/services/auth', () => ({
  signIn: mockSignIn,
  signOut: vi.fn(),
  getCurrentUser: vi.fn(() => null),
  isAuthReady: vi.fn(() => true),
  onAuthStateChanged: vi.fn((onChange: (user: unknown) => void) => {
    onChange(null);
    return vi.fn();
  }),
  FirebaseNotConfiguredError: class extends Error {
    constructor() {
      super('not configured');
      this.name = 'FirebaseNotConfiguredError';
    }
  },
}));

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillAndSubmit(email: string, password: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignIn.mockResolvedValue(undefined);
});

describe('LoginForm validation', () => {
  it('shows an error when both fields are empty', () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter both email and password.',
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows an error when the password is empty', () => {
    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please enter both email and password.',
    );
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});

describe('LoginForm submission', () => {
  it('calls sign-in with the entered credentials', async () => {
    renderLoginForm();
    await act(async () => {
      fillAndSubmit('owner@example.com', 'secure123');
    });
    expect(mockSignIn).toHaveBeenCalledWith('owner@example.com', 'secure123');
  });

  it('disables the form and shows progress while signing in', async () => {
    let resolveSignIn: () => void = () => {};
    mockSignIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignIn = resolve;
        }),
    );

    renderLoginForm();

    await act(async () => {
      fillAndSubmit('a@b.com', 'p');
    });

    const pendingButton = screen.getByRole('button', { name: /Signing in/ });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
    expect(screen.getByLabelText('Password')).toBeDisabled();

    await act(async () => {
      resolveSignIn();
    });

    expect(screen.getByRole('button', { name: /Sign In/ })).not.toBeDisabled();
  });

  it('maps invalid-credential errors to a friendly message', async () => {
    const error = Object.assign(new Error('bad credentials'), {
      code: 'auth/invalid-credential',
    });
    mockSignIn.mockRejectedValue(error);

    renderLoginForm();
    await act(async () => {
      fillAndSubmit('a@b.com', 'wrong');
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid email or password.',
    );
  });

  it('maps too-many-requests errors', async () => {
    const error = Object.assign(new Error('rate limited'), {
      code: 'auth/too-many-requests',
    });
    mockSignIn.mockRejectedValue(error);

    renderLoginForm();
    await act(async () => {
      fillAndSubmit('a@b.com', 'p');
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Too many attempts. Please try again later.',
    );
  });

  it('falls back to a generic message for unknown failures', async () => {
    mockSignIn.mockRejectedValue(new Error('something odd'));

    renderLoginForm();
    await act(async () => {
      fillAndSubmit('a@b.com', 'p');
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Login failed. Please try again.',
    );
  });

  it('toggles password visibility', () => {
    renderLoginForm();
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle password visibility' }),
    );
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(
      screen.getByRole('button', { name: 'Toggle password visibility' }),
    );
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
