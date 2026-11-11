'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, guardDecision } from '@/components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  isAuthReady,
  onAuthStateChanged,
} from '@/services/auth';
import type { AuthUser } from '@/types';

vi.mock('@/services/auth', () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(() => null),
  isAuthReady: vi.fn(() => true),
  onAuthStateChanged: vi.fn(),
  FirebaseNotConfiguredError: class extends Error {
    constructor() {
      super('not configured');
      this.name = 'FirebaseNotConfiguredError';
    }
  },
}));

const mockIsAuthReady = vi.mocked(isAuthReady);
const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);

type ChangeListener = (user: AuthUser | null) => void;

let currentUserValue: AuthUser | null = null;
let changeListener: ChangeListener | null = null;
let emitOnSubscribe = true;

function installListenerMock() {
  mockOnAuthStateChanged.mockImplementation((onChange: ChangeListener) => {
    changeListener = onChange;
    if (emitOnSubscribe) {
      onChange(currentUserValue);
    }
    return vi.fn();
  });
}

function TestInner() {
  const { user } = useAuth();
  return <div data-testid="inner-content">Inner: {user ? user.uid : 'none'}</div>;
}

function Guarded() {
  return (
    <ProtectedRoute>
      <TestInner />
    </ProtectedRoute>
  );
}

function renderGuarded() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <AuthProvider>
        <Routes>
          <Route path="/admin" element={<Guarded />} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const OWNER_UID = 'dRHxakX2iAWM4w1IqtYPLpCZrwr2';

beforeEach(() => {
  vi.clearAllMocks();
  currentUserValue = null;
  changeListener = null;
  emitOnSubscribe = true;
  mockIsAuthReady.mockReturnValue(true);
  installListenerMock();
});

describe('guardDecision (pure)', () => {
  it('returns loading while initializing', () => {
    expect(guardDecision('loading', false, false)).toEqual({
      canAccess: false,
      reason: 'loading',
    });
  });

  it('returns unauthenticated when not signed in', () => {
    expect(guardDecision('authenticated', false, false)).toEqual({
      canAccess: false,
      reason: 'unauthenticated',
    });
    expect(guardDecision('error', false, false)).toEqual({
      canAccess: false,
      reason: 'unauthenticated',
    });
  });

  it('returns not-owner when authenticated but not owner', () => {
    expect(guardDecision('authenticated', true, false)).toEqual({
      canAccess: false,
      reason: 'not-owner',
    });
  });

  it('returns allowed when owner', () => {
    expect(guardDecision('authenticated', true, true)).toEqual({
      canAccess: true,
      reason: 'allowed',
    });
  });
});

describe('ProtectedRoute component', () => {
  it('renders a loading state and hides children while auth is unresolved', () => {
    emitOnSubscribe = false;
    renderGuarded();
    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    expect(screen.getByText('Signing in…')).toBeInTheDocument();
  });

  it('hides children when unauthenticated and redirects to login', () => {
    currentUserValue = null;
    renderGuarded();
    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    expect(screen.queryByText('Access denied')).not.toBeInTheDocument();
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders access denied for an authenticated non-owner', () => {
    currentUserValue = { uid: 'someone-else', email: 'a@b.com', emailVerified: true };
    renderGuarded();
    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    expect(screen.getByText('Access denied')).toBeInTheDocument();
  });

  it('surfaces the Firebase-not-configured error instead of granting access', () => {
    mockIsAuthReady.mockReturnValue(false);
    renderGuarded();
    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Firebase is not configured/i),
    ).toBeInTheDocument();
  });

  it('renders children for the verified owner', () => {
    currentUserValue = { uid: OWNER_UID, email: 'a@b.com', emailVerified: true };
    renderGuarded();
    expect(screen.getByTestId('inner-content')).toBeInTheDocument();
    expect(screen.getByText(`Inner: ${OWNER_UID}`)).toBeInTheDocument();
  });

  it('reveals children when the listener resolves to the owner', () => {
    // Hold the initial callback so the guard stays in its loading state.
    emitOnSubscribe = false;
    renderGuarded();
    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
    expect(screen.getByText('Signing in…')).toBeInTheDocument();

    act(() => {
      changeListener!({ uid: OWNER_UID, email: 'a@b.com', emailVerified: true });
    });

    expect(screen.getByTestId('inner-content')).toBeInTheDocument();
  });

  it('hides children again when the owner signs out', () => {
    currentUserValue = { uid: OWNER_UID, email: 'a@b.com', emailVerified: true };
    renderGuarded();
    expect(screen.getByTestId('inner-content')).toBeInTheDocument();

    act(() => {
      changeListener!(null);
    });

    expect(screen.queryByTestId('inner-content')).not.toBeInTheDocument();
  });
});
