// Authentication context.
//
// Provides the verified application auth state and operations to the React
// tree. Firebase's onAuthStateChanged listener is the source of truth for
// session state; a successful sign-in response is never treated as the only
// source of session state, which avoids auth-state race conditions.
//
// Legacy behavior preserved:
//   - Fail closed: any unresolved, missing, or errored identity is treated
//     as unauthenticated / not-owner.
//   - Owner UID is audited from the legacy rules (dRHxakX2iAWM4w1IqtYPLpCZrwr2).
//   - Client-side protection is UX only; Firestore/RTDB rules remain
//     authoritative.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signIn,
  signOut,
  isAuthReady,
  FirebaseNotConfiguredError,
} from '@/services/auth';
import type {
  AuthContextValue,
  AuthUser,
  AuthError,
  AuthStatus,
} from '@/types';
import { AUTH_OWNER_UID } from '@/types';

const AuthContext = createContext<AuthContextValue | null>(null);

/** Hook to consume auth state. Throws if used outside an AuthProvider. */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: React.ReactNode;
}

/**
 * Authentication provider.
 *
 * Session state comes exclusively from Firebase's `onAuthStateChanged`
 * listener. The provider starts in `loading` while that first callback is
 * pending, so protected content is never shown before the decision is made.
 * When Firebase is unconfigured the provider fails closed into `error`.
 * The listener is unsubscribed on unmount.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>(
        isAuthReady() ? 'loading' : 'error',
    );
    const [error, setError] = useState<AuthError | null>(() =>
        isAuthReady()
            ? null
            : {
                  code: 'auth/firebase-not-configured',
                  message:
                      'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
              },
    );

    useEffect(() => {
        if (!isAuthReady()) {
            setStatus('error');
            setError((current) =>
                current ?? {
                    code: 'auth/firebase-not-configured',
                    message:
                        'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
                },
            );
            setUser(null);
            return;
        }

        const unsubscribe = onAuthStateChanged(
            (nextUser) => {
                setUser(nextUser);
                setStatus(nextUser ? 'authenticated' : 'unauthenticated');
            },
            (listenerError) => {
                // Fail closed: an errored listener clears any identity.
                setStatus('error');
                setError(listenerError);
                setUser(null);
            },
        );
        return unsubscribe;
    }, []);

    const handleSignIn = useCallback(
        async (email: string, password: string) => {
            setError(null);
            try {
                await signIn(email, password);
                // onAuthStateChanged will update user/status; do not set user
                // here directly to avoid race conditions with the listener.
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                setError(
                    error instanceof FirebaseNotConfiguredError
                        ? {
                              code: 'auth-not-configured',
                              message: error.message,
                          }
                        : {
                              code: 'auth-sign-in-failed',
                              message: err.message,
                          },
                );
                throw error;
            }
        },
        [],
    );

    const handleSignOut = useCallback(async () => {
        setError(null);
        try {
            await signOut();
            // onAuthStateChanged will set user to null / status unauthenticated.
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            setError({
                code: 'auth-sign-out-failed',
                message: err.message,
            });
            throw error;
        }
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const isOwner = Boolean(user && user.uid === AUTH_OWNER_UID);
    const isAuthenticated = Boolean(user);

    const value: AuthContextValue = {
        user,
        status,
        isOwner,
        isAuthenticated,
        error,
        signIn: handleSignIn,
        signOut: handleSignOut,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;
export { AUTH_OWNER_UID };
