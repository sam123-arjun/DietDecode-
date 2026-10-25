import React from 'react';
import { LayoutDashboard, CheckCircle2, Clock, Flame, Apple, Sparkles, ChevronRight, Activity } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

interface DashboardPreviewSectionProps {
  onExploreDashboard: () => void;
}

export const DashboardPreviewSection: React.FC<DashboardPreviewSectionProps> = ({
  onExploreDashboard,
}) => {
  return (
    <section id="dashboard-preview" style={{ padding: '6rem 0', position: 'relative' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 3.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="eyebrow-healthtech">
              Clinical Dashboard Ecosystem
            </span>
          </div>

          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
              marginBottom: '1.1rem',
            }}
          >
            One system. A healthier routine.
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Real-time biometric telemetry, nutrition adherence, and hardware synchronization unified in an ultra-crisp editorial dashboard.
          </p>
        </div>

        {/* Dashboard Preview Card Mockup */}
        <div
          className="card-waypilot"
          style={{
            padding: '2.5rem',
            maxWidth: '1060px',
            margin: '0 auto 2.5rem',
            boxShadow: '0 24px 50px -12px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Top Mockbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                Good morning, DietDecode User
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Personalized dietary metrics & ESP32 device status for today.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span className="badge chip-emerald">
                ● ESP32 Hardware Synced
              </span>
              <span className="badge chip-dark">
                Day 14 Streak
              </span>
            </div>
          </div>

          {/* 4 Quick Stat Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              marginBottom: '2rem',
            }}
          >
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Daily Energy</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.35rem' }}>2,250 <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>kcal</span></div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Deficit Target</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Meals Taken</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald-text)', marginTop: '0.35rem' }}>1 of 4</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Breakfast confirmed</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Next Prompt</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-sky-text)', marginTop: '0.35rem' }}>01:00 PM</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Lunch alert queued</div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Hydration Target</div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.35rem' }}>1.8 / 3.0 L</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>60% completed</div>
            </div>
          </div>

          {/* Active Meal Schedule Item */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#f5f3ff',
                  border: '1px solid #ddd6fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                  flexShrink: 0,
                }}
              >
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Target Window</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                  Lunch at 01:00 PM: Steamed Rice + Moong Dal Tadka + Vegetable Stir-fry
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="badge chip-violet">ESP32 Buzzer Armed</span>
            </div>
          </div>
        </div>

        {/* CTA to Enter Dashboard */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-crimson"
            onClick={onExploreDashboard}
            style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
          >
            <span>Access Live Dashboard</span>
            <ChevronRight size={16} />
          </button>
        </div>

      </div>
    </section>
  );
};
