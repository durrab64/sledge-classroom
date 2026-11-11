// Authentication service.
//
// Thin, typed wrapper around the Firebase Auth modular SDK. All Firebase SDK
// calls live in this service layer; React components and the AuthContext
// consume it through this interface and never import firebase/auth directly.
//
// Behavior mirrors the legacy implementation (app.js §AUTHENTICATION):
//   - signInWithEmailAndPassword for email/password sign-in
//   - signOut for sign-out
//   - onAuthStateChanged as the source of truth for session state
//   - default SDK persistence (browser local storage) is preserved
//   - no password reset (legacy does not offer it)
//   - client-side Auth is UX only; Firestore/RTDB rules remain authoritative
//
// Firebase is initialized lazily in src/services/firebase.ts. When it is not
// configured, every method here returns a clear FirebaseNotConfiguredError
// rather than failing silently or inventing data.

import {
  type Auth,
  onAuthStateChanged as fbOnAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  signInWithEmailAndPassword as fbSignInWithEmailAndPassword,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth, FirebaseNotConfiguredError } from './firebase';
import type { AuthUser, AuthError } from '@/types';

function mapFirebaseUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email ?? null,
    emailVerified: user.emailVerified,
  };
}

function mapAuthError(error: unknown): AuthError {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code)
      : 'auth-unknown-error';
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);
  return { code, message };
}

/** True when the Auth service is ready to use. */
export function isAuthReady(): boolean {
  return auth !== null;
}

/** Sign in with email and password. Throws FirebaseNotConfiguredError if unconfigured. */
export async function signIn(email: string, password: string): Promise<void> {
  if (!auth) {
    throw new FirebaseNotConfiguredError();
  }
  await fbSignInWithEmailAndPassword(auth, email, password);
}

/** Sign out. Throws FirebaseNotConfiguredError if unconfigured. */
export async function signOut(): Promise<void> {
  if (!auth) {
    throw new FirebaseNotConfiguredError();
  }
  await fbSignOut(auth);
}

/** Get the current Firebase user (synchronous, may be null). */
export function getCurrentUser(): AuthUser | null {
  if (!auth) return null;
  return mapFirebaseUser(auth.currentUser);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 *
 * The listener receives the mapped AuthUser (or null on sign-out). Errors
 * from the underlying listener are surfaced through the error callback so
 * callers can fail closed, matching the legacy behavior.
 */
export function onAuthStateChanged(
  onChange: (user: AuthUser | null) => void,
  onError?: (error: AuthError) => void,
): () => void {
  if (!auth) {
    if (onError) {
      onError({
        code: 'auth/firebase-not-configured',
        message: 'Firebase is not configured.',
      });
    }
    return () => {
      /* no-op when unconfigured */
    };
  }
  const unsubscribe = fbOnAuthStateChanged(
    auth,
    (user) => {
      onChange(mapFirebaseUser(user));
    },
    (error) => {
      if (onError) {
        onError(mapAuthError(error));
      }
    },
  );
  return unsubscribe;
}

export type { Auth };
export { mapFirebaseUser, mapAuthError, FirebaseNotConfiguredError };
