import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

import { User } from '../types';

interface LoginPageProps {
  onSuccess: (user?: User) => void;
  onNavigateRegister: () => void;
  onNavigateHome: () => void;
  initialEmail?: string;
  registrationSuccess?: boolean;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onSuccess,
  onNavigateRegister,
  onNavigateHome,
  initialEmail = '',
  registrationSuccess = false,
}) => {
  const { login, demoLogin, isLiveFirebase } = useAuth();
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const loggedUser = await login(email, password);
      onSuccess(loggedUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please verify and try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const demoUser = await demoLogin();
      onSuccess(demoUser);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign-in failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.25rem',
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            onClick={onNavigateHome}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.65rem',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 10px rgba(168, 85, 247, 0.25)',
              }}
            >
              <Sparkles size={18} color="#ffffff" />
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em' }}>
              DietDecode
            </span>
          </button>

          <h1 className="editorial-title" style={{ fontSize: '1.9rem', marginBottom: '0.4rem' }}>
            Welcome back to <span className="editorial-italic">DietDecode</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Enter your credentials to access your personalized nutrition dashboard.
          </p>
        </div>

        {/* Form Card */}
        <div className="card-waypilot" style={{ padding: '2.25rem', boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.08)' }}>
          {registrationSuccess && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                marginBottom: '1.25rem',
                fontWeight: 500,
              }}
            >
              <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
              <span>Account created successfully! Please sign in with your password to set up your profile.</span>
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@dietdecode.io"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Button
                variant="primary"
                size="lg"
                type="submit"
                isLoading={isLoading}
                rightIcon={<ArrowRight size={16} />}
                style={{ width: '100%' }}
              >
                Sign In
              </Button>

              <Button
                variant="secondary"
                size="md"
                type="button"
                onClick={handleDemoSignIn}
                style={{ width: '100%' }}
              >
                Instant 1-Click Demo Login
              </Button>
            </div>
          </form>

          {/* Switch to Register */}
          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button
              onClick={onNavigateRegister}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-darkest)',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
