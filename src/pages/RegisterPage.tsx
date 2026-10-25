import React, { useState } from 'react';
import { User as UserIcon, Mail, Lock, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';

import { User } from '../types';

interface RegisterPageProps {
  onSuccess: (user?: User, email?: string) => void;
  onNavigateLogin: (email?: string) => void;
  onNavigateHome: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onSuccess,
  onNavigateLogin,
  onNavigateHome,
}) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await register(fullName.trim(), email, password);
      onSuccess(newUser, email.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
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
      <div style={{ width: '100%', maxWidth: '460px', position: 'relative', zIndex: 1 }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
            Create your <span className="editorial-italic">DietDecode</span> Profile
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Start tailored metabolic nutrition planning and ESP32 physical reminder alerts.
          </p>
        </div>

        {/* Registration Card */}
        <div className="card-waypilot" style={{ padding: '2.25rem', boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.08)' }}>
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                fontSize: '0.875rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
              {error.toLowerCase().includes('already registered') && (
                <button
                  type="button"
                  onClick={() => onNavigateLogin(email.trim())}
                  style={{
                    alignSelf: 'flex-start',
                    background: '#ffffff',
                    border: '1px solid #fecdd3',
                    borderRadius: '8px',
                    color: '#e11d48',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  Sign in with {email.trim() || 'this email'} now →
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@dietdecode.io"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
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

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Confirm</label>
                <input
                  type="password"
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={15} color="#059669" />
              <span>Includes automatic seed profile and mock dev auth.</span>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={16} />}
              style={{ width: '100%' }}
            >
              Register & Begin
            </Button>
          </form>

          {/* Switch to Sign In */}
          <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              onClick={() => onNavigateLogin(email.trim())}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-darkest)',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
