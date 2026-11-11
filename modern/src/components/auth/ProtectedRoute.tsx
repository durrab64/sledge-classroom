// Authentication route guard.
//
// Reusable guard for future admin pages. Preserves legacy owner-identity
// semantics: only the verified owner UID may access protected routes.
//
// Client-side route protection is UX, not security enforcement. Existing
// Firestore and Realtime Database security rules remain authoritative. This
// guard never weakens or replaces them.

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthContextValue, RouteGuardResult } from '@/types';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { status, isAuthenticated, isOwner, error } = useAuth();
    const location = useLocation();

    // While authentication is initializing, render a neutral loading state
    // so protected content is never flashed before the decision is made.
    if (status === 'loading') {
        return (
            <div className="sledge-page">
                <div className="sledge-card">
                    <p>Signing in…</p>
                </div>
            </div>
        );
    }

    // Firebase is not configured: surface the error rather than failing
    // silently or granting access.
    if (status === 'error') {
        return (
            <div className="sledge-page">
                <div className="sledge-card">
                    <p>{error?.message ?? 'Authentication unavailable.'}</p>
                </div>
            </div>
        );
    }

    // Not authenticated: send to the login page, preserving the attempted
    // route so the app can return after sign-in.
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Authenticated but not the owner: access denied.
    if (!isOwner) {
        return (
            <div className="sledge-page">
                <div className="sledge-card">
                    <h2>Access denied</h2>
                    <p>
                        This account is signed in but does not have owner
                        access to this page.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

/**
 * Pure decision helper for the route guard. Useful for tests that want to
 * assert the guard decision without rendering a router.
 */
export function guardDecision(
    status: AuthContextValue['status'],
    isAuthenticated: boolean,
    isOwner: boolean,
): RouteGuardResult {
    if (status === 'loading') {
        return { canAccess: false, reason: 'loading' };
    }
    if (status === 'error') {
        return { canAccess: false, reason: 'unauthenticated' };
    }
    if (!isAuthenticated) {
        return { canAccess: false, reason: 'unauthenticated' };
    }
    if (!isOwner) {
        return { canAccess: false, reason: 'not-owner' };
    }
    return { canAccess: true, reason: 'allowed' };
}
