'use strict';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Stub Firebase env vars so firebase.ts initializes with mocked modules.
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-key');
vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'test.firebaseapp.com');
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'test-project');
vi.stubEnv('VITE_FIREBASE_DATABASE_URL', 'https://test.firebaseio.com');
vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'test.appspot.com');
vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123');
vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');

vi.mock('@/services/firebase', () => ({
  auth: { currentUser: null },
  FirebaseNotConfiguredError: class FirebaseNotConfiguredError extends Error {
    constructor() {
      super('not configured');
      this.name = 'FirebaseNotConfiguredError';
    }
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

import { auth } from '@/services/firebase';
import { FirebaseNotConfiguredError } from '@/services/firebase';
import {
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  isAuthReady,
} from '@/services/auth';
import { signInWithEmailAndPassword, signOut as fbSignOut, onAuthStateChanged as fbOnAuthStateChanged } from 'firebase/auth';

const mockSignIn = vi.mocked(signInWithEmailAndPassword);
const mockSignOut = vi.mocked(fbSignOut);
const mockOnAuthStateChanged = vi.mocked(fbOnAuthStateChanged);

beforeEach(() => {
  vi.clearAllMocks();
  auth.currentUser = null;
  mockSignIn.mockResolvedValue({ user: { uid: 'owner' } });
  mockSignOut.mockResolvedValue(undefined);
  mockOnAuthStateChanged.mockImplementation((_auth: unknown, callback: (u: unknown) => void) => {
    callback(auth.currentUser);
    return vi.fn();
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isAuthReady', () => {
  it('returns true when auth is initialized', () => {
    expect(isAuthReady()).toBe(true);
  });
});

describe('signIn', () => {
  it('calls signInWithEmailAndPassword with email and password', async () => {
    await signIn('a@b.com', 'password123');
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(auth, 'a@b.com', 'password123');
  });

  it('resolves when sign-in succeeds', async () => {
    await expect(signIn('a@b.com', 'password123')).resolves.toBeUndefined();
  });

  it('rejects when sign-in fails', async () => {
    mockSignIn.mockRejectedValue(new Error('wrong password'));
    await expect(signIn('a@b.com', 'bad')).rejects.toThrow('wrong password');
  });
});

describe('signOut', () => {
  it('calls signOut', async () => {
    await signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(auth);
  });

  it('resolves when sign-out succeeds', async () => {
    await expect(signOut()).resolves.toBeUndefined();
  });

  it('rejects when sign-out fails', async () => {
    mockSignOut.mockRejectedValue(new Error('network error'));
    await expect(signOut()).rejects.toThrow('network error');
  });
});

describe('getCurrentUser', () => {
  it('returns null when no user is signed in', () => {
    auth.currentUser = null;
    expect(getCurrentUser()).toBeNull();
  });

  it('returns a mapped AuthUser when signed in', () => {
    auth.currentUser = { uid: 'owner-1', email: 'owner@example.com', emailVerified: true } as any;
    const user = getCurrentUser();
    expect(user).toEqual({
      uid: 'owner-1',
      email: 'owner@example.com',
      emailVerified: true,
    });
  });
});

describe('onAuthStateChanged', () => {
  it('calls the listener with the current user and returns an unsubscribe function', () => {
    auth.currentUser = { uid: 'owner-1', email: 'a@b.com', emailVerified: false } as any;
    const listener = vi.fn();
    const unsubscribe = onAuthStateChanged(listener);
    expect(listener).toHaveBeenCalledWith(auth.currentUser);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('calls the listener with null when signed out', () => {
    auth.currentUser = null;
    const listener = vi.fn();
    onAuthStateChanged(listener);
    expect(listener).toHaveBeenCalledWith(null);
  });
});

describe('FirebaseNotConfiguredError', () => {
  it('is exported from the firebase service', () => {
    expect(FirebaseNotConfiguredError).toBeDefined();
    const err = new FirebaseNotConfiguredError();
    expect(err.name).toBe('FirebaseNotConfiguredError');
  });
});
