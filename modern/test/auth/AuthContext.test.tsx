'use strict';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import {
  signIn,
  signOut,
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

const mockSignIn = vi.mocked(signIn);
const mockSignOut = vi.mocked(signOut);
const mockIsAuthReady = vi.mocked(isAuthReady);
const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);

type ChangeListener = (user: AuthUser | null) => void;
type ErrorListener = (error: { code: string; message: string }) => void;

let currentUserValue: AuthUser | null = null;
let changeListener: ChangeListener | null = null;
let errorListener: ErrorListener | null = null;

function installListenerMock() {
  mockOnAuthStateChanged.mockImplementation(
    (onChange: ChangeListener, onError?: ErrorListener) => {
      changeListener = onChange;
      errorListener = onError ?? null;
      // Firebase emits the current state immediately on subscription.
      onChange(currentUserValue);
      return vi.fn();
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserValue = null;
  changeListener = null;
  errorListener = null;
  mockSignIn.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockIsAuthReady.mockReturnValue(true);
  installListenerMock();
});

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthContext initial state', () => {
  it('starts unauthenticated when no user is signed in', () => {
    const { result } = renderAuth();
    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('starts authenticated when a user exists', () => {
    currentUserValue = { uid: 'owner', email: 'a@b.com', emailVerified: true };
    const { result } = renderAuth();
    expect(result.current.status).toBe('authenticated');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.uid).toBe('owner');
  });

  it('treats the audited owner UID as owner', () => {
    currentUserValue = {
      uid: 'dRHxakX2iAWM4w1IqtYPLpCZrwr2',
      email: 'a@b.com',
      emailVerified: true,
    };
    const { result } = renderAuth();
    expect(result.current.isOwner).toBe(true);
  });

  it('treats a non-owner authenticated user as not owner', () => {
    currentUserValue = { uid: 'someone-else', email: 'a@b.com', emailVerified: true };
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isOwner).toBe(false);
  });

  it('fails closed when Firebase is not configured', () => {
    mockIsAuthReady.mockReturnValue(false);
    const { result } = renderAuth();
    expect(result.current.status).toBe('error');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isOwner).toBe(false);
    expect(result.current.error?.code).toBe('auth/firebase-not-configured');
    expect(mockOnAuthStateChanged).not.toHaveBeenCalled();
  });
});

describe('AuthContext sign-in', () => {
  it('delegates to the sign-in service', async () => {
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'password');
    });
    expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'password');
    expect(result.current.error).toBeNull();
  });

  it('propagates sign-in failure and records an error', async () => {
    mockSignIn.mockRejectedValue(new Error('auth/wrong-password'));
    const { result } = renderAuth();

    await act(async () => {
      await expect(
        result.current.signIn('a@b.com', 'bad'),
      ).rejects.toThrow('auth/wrong-password');
    });

    expect(result.current.error?.code).toBe('auth-sign-in-failed');
    expect(result.current.error?.message).toBe('auth/wrong-password');
  });

  it('clears a previous error on clearError', async () => {
    mockSignIn.mockRejectedValue(new Error('boom'));
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signIn('a@b.com', 'bad').catch(() => undefined);
    });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });
});

describe('AuthContext sign-out', () => {
  it('delegates to the sign-out service', async () => {
    currentUserValue = { uid: 'owner', email: 'a@b.com', emailVerified: true };
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signOut();
    });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('records an error when sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('network error'));
    const { result } = renderAuth();
    await act(async () => {
      await result.current.signOut().catch(() => undefined);
    });
    expect(result.current.error?.code).toBe('auth-sign-out-failed');
  });
});

describe('AuthContext listener lifecycle', () => {
  it('updates state when the listener reports a user', () => {
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(false);

    act(() => {
      changeListener!({ uid: 'new-user', email: 'n@b.com', emailVerified: false });
    });

    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.uid).toBe('new-user');
    expect(result.current.isOwner).toBe(false);
  });

  it('clears identity when the listener reports sign-out', () => {
    currentUserValue = { uid: 'owner', email: 'a@b.com', emailVerified: true };
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      changeListener!(null);
    });

    expect(result.current.status).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });

  it('fails closed when the listener reports an error', () => {
    currentUserValue = { uid: 'owner', email: 'a@b.com', emailVerified: true };
    const { result } = renderAuth();
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      errorListener!({ code: 'auth/network-request-failed', message: 'listener failed' });
    });

    expect(result.current.status).toBe('error');
    expect(result.current.user).toBeNull();
    expect(result.current.isOwner).toBe(false);
    expect(result.current.error?.message).toBe('listener failed');
  });

  it('unsubscribes from the listener on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChanged.mockImplementation((onChange: ChangeListener) => {
      changeListener = onChange;
      onChange(currentUserValue);
      return unsubscribe;
    });

    const { unmount } = renderAuth();
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('subscribes exactly once per provider mount', () => {
    renderAuth();
    expect(mockOnAuthStateChanged).toHaveBeenCalledTimes(1);
  });
});
