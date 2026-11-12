// CP11 regression coverage: the login route must resume the route that sent
// the user to sign in through `location.state.from`, and must never redirect
// back to the login page itself.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginRoute } from '@/features/auth/LoginRoute';
import type { AuthStatus, AuthUser } from '@/types';

const authState = vi.hoisted(() => ({
  user: null as AuthUser | null,
  status: 'unauthenticated' as AuthStatus,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: authState.user,
    status: authState.status,
    isAuthenticated: Boolean(authState.user),
    isOwner: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    clearError: vi.fn(),
  }),
}));

function renderAt(entry: Parameters<typeof MemoryRouter>[0]['initialEntries'][number]) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/admin" element={<div>Admin destination</div>} />
        <Route path="/" element={<div>Home destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginRoute return path', () => {
  beforeEach(() => {
    authState.user = null;
    authState.status = 'unauthenticated';
  });

  it('shows the login form to a signed-out visitor', () => {
    renderAt({ pathname: '/login' });
    expect(
      screen.getByRole('heading', { name: 'Admin Login' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Admin destination')).not.toBeInTheDocument();
  });

  it('keeps the loading state while auth is unresolved', () => {
    authState.status = 'loading';
    renderAt({ pathname: '/login' });
    expect(screen.getByText(/Checking session/)).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Admin Login' }),
    ).not.toBeInTheDocument();
  });

  it('returns an authenticated owner to the attempted route', () => {
    authState.user = {
      uid: 'dRHxakX2iAWM4w1IqtYPLpCZrwr2',
      email: 'owner@example.com',
      emailVerified: true,
    };
    authState.status = 'authenticated';
    renderAt({
      pathname: '/login',
      state: { from: { pathname: '/admin', search: '?tab=lab', hash: '' } },
    });
    expect(screen.getByText('Admin destination')).toBeInTheDocument();
  });

  it('falls back to home when no attempted route was recorded', () => {
    authState.user = {
      uid: 'dRHxakX2iAWM4w1IqtYPLpCZrwr2',
      email: 'owner@example.com',
      emailVerified: true,
    };
    authState.status = 'authenticated';
    renderAt({ pathname: '/login' });
    expect(screen.getByText('Home destination')).toBeInTheDocument();
  });

  it('never redirects back to the login page itself', () => {
    authState.user = {
      uid: 'dRHxakX2iAWM4w1IqtYPLpCZrwr2',
      email: 'owner@example.com',
      emailVerified: true,
    };
    authState.status = 'authenticated';
    renderAt({
      pathname: '/login',
      state: { from: { pathname: '/login' } },
    });
    expect(screen.getByText('Home destination')).toBeInTheDocument();
  });
});
