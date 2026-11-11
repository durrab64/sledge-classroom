// Login route wrapper.
//
// Renders the login form. If the user is already authenticated, redirects to
// home (matching legacy behavior where a signed-in owner does not re-login).

import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from './LoginForm';

export function LoginRoute() {
    const { user, status } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (status === 'loading') {
        return (
            <div className="sledge-page">
                <div className="sledge-card">
                    <p>Checking session…</p>
                </div>
            </div>
        );
    }

    if (user) {
        // Already signed in: return home, preserving any attempted route.
        return <Navigate to="/" replace state={{ from: location }} />;
    }

    return <LoginForm onAuthenticated={() => navigate('/')} />;
}
