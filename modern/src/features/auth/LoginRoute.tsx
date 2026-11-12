// Login route wrapper.
//
// Renders the login form. If the user is already authenticated, redirects to
// the attempted route (set by ProtectedRoute via `state.from`) or home. This
// preserves the legacy behavior where a signed-in owner does not re-login and
// returns to the page that required authentication.

import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from './LoginForm';

interface LoginLocationState {
  from?: { pathname?: string; search?: string; hash?: string };
}

export function LoginRoute() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LoginLocationState | null;
  const attempted = state?.from;
  // Never redirect back to the login page itself.
  const destination =
    attempted?.pathname && attempted.pathname !== '/login'
      ? `${attempted.pathname}${attempted.search ?? ''}${attempted.hash ?? ''}`
      : '/';

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
    return <Navigate to={destination} replace />;
  }

  return (
    <LoginForm onAuthenticated={() => navigate(destination, { replace: true })} />
  );
}
