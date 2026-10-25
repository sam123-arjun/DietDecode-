import React from 'react';
import { ArrowRight, Sparkles, Activity, ShieldCheck, Cpu } from 'lucide-react';

interface CTASectionProps {
  onRegister: () => void;
  onSignIn?: () => void;
  onDemoLogin?: () => void;
  isLoggedIn?: boolean;
}

export const CTASection: React.FC<CTASectionProps> = ({
  onRegister,
  onSignIn,
  onDemoLogin,
  isLoggedIn = false,
}) => {
  return (
    <section style={{ padding: '6rem 0 7rem', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--bg-canvas)' }}>
      <div className="container">
        <div
          className="card-waypilot"
          style={{
            padding: '4.5rem 2rem',
            textAlign: 'center',
            maxWidth: '880px',
            margin: '0 auto',
            position: 'relative',
            boxShadow: '0 24px 60px -15px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <span className="eyebrow-healthtech">
              One platform, endless precision
            </span>
          </div>

          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)',
              marginBottom: '1.25rem',
            }}
          >
            Transform your daily health with <br />
            <span style={{ color: 'var(--primary-red)' }}>intelligent IoT solutions</span>
          </h2>

          <p
            style={{
              fontSize: '1.05rem',
              color: 'var(--text-secondary)',
              maxWidth: '580px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6,
            }}
          >
            Connect clinical macronutrient intelligence to physical desktop notifications. Experience zero-friction dietary adherence and real-time biometric tracking.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-crimson" onClick={onRegister} style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
              <span>{isLoggedIn ? 'Open Dashboard' : 'Register & Begin'}</span>
              <ArrowRight size={16} />
            </button>
            <button
              className="btn-outline-healthtech"
              onClick={isLoggedIn ? onDemoLogin || onSignIn : onSignIn || onDemoLogin}
              style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
            >
              <span>{isLoggedIn ? 'View Meal Schedule' : 'Sign In to Account'}</span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.75rem', marginTop: '2.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <ShieldCheck size={14} color="#059669" /> Zero Configuration Required
            </span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cpu size={14} color="var(--primary-red)" /> ESP32 Simulator Included
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
