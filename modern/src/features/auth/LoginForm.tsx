// Login form.
//
// Reproduces the legacy admin login experience (app.js handleLogin):
//   - Email + password fields, both required
//   - Password visibility toggle
//   - Loading/disabled states during sign-in
//   - Firebase error feedback mapped to the same messages as legacy
//   - Client-side validation before any Firebase call
//
// Uses the AuthContext signIn operation; no Firebase SDK calls here.

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginFormProps {
    onAuthenticated?: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
    'auth/invalid-api-key':
        'Firebase API key is invalid or not yet configured. Please check your environment variables.',
    'auth/app-deleted':
        'Firebase API key is invalid or not yet configured. Please check your environment variables.',
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
    const { signIn, error: authError } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [formError, setFormError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setFormError(null);

        if (!email || !password) {
            setFormError('Please enter both email and password.');
            return;
        }

        setSubmitting(true);
        try {
            await signIn(email, password);
            onAuthenticated?.();
        } catch (error) {
            const code =
                error &&
                typeof error === 'object' &&
                'code' in error
                    ? String((error as { code: unknown }).code)
                    : 'auth-sign-in-failed';
            setFormError(ERROR_MESSAGES[code] ?? 'Login failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Surface configuration failures (e.g. missing VITE_FIREBASE_* / invalid
    // API key) without overwriting the mapped sign-in messages below.
    useEffect(() => {
        if (authError && authError.code === 'auth-not-configured') {
            setFormError(authError.message);
        }
    }, [authError]);

    return (
        <form className="sledge-card" onSubmit={handleSubmit} noValidate>
            <h2>Admin Login</h2>
            <p className="login-info">
                Only the admin can upload, update, and delete content. Students
                can view and download freely.
            </p>

            <div className="form-group">
                <label htmlFor="admin-email">Email</label>
                <input
                    id="admin-email"
                    type="email"
                    className="form-input"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    autoComplete="email"
                />
            </div>

            <div className="form-group">
                <label htmlFor="admin-password">Password</label>
                <div className="password-wrapper">
                    <input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={submitting}
                        autoComplete="current-password"
                    />
                    <button
                        className="password-toggle"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={submitting}
                        aria-label="Toggle password visibility"
                    >
                        <i
                            className={showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'}
                            aria-hidden="true"
                        ></i>
                    </button>
                </div>
            </div>

            {formError && (
                <div id="login-error" className="login-error" role="alert">
                    {formError}
                </div>
            )}

            <div className="modal-footer">
                <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => navigate('/')}
                    disabled={submitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                >
                    {submitting ? (
                        <>
                            <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
                            Signing in…
                        </>
                    ) : (
                        <>
                            <i className="fas fa-sign-in-alt" aria-hidden="true"></i>
                            Sign In
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
