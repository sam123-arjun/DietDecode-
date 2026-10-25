import React from 'react';
import { Target, HeartPulse, Sparkles, Scale, Apple, ShieldAlert, Droplets, Check, Activity, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';

export const NutritionDecodedSection: React.FC = () => {
  const steps = [
    {
      icon: <Scale size={20} color="#e11d48" />,
      bg: 'rgba(225, 29, 72, 0.05)',
      border: 'rgba(225, 29, 72, 0.2)',
      title: 'Biometric Analysis',
      description: 'Calculates Basal Metabolic Rate (BMR) using Mifflin-St Jeor and scales by physical activity level to determine exact Total Daily Energy Expenditure (TDEE).',
    },
    {
      icon: <Apple size={20} color="#059669" />,
      bg: '#ecfdf5',
      border: '#a7f3d0',
      title: 'Dietary Customization',
      description: 'Adapts intelligently to Vegetarian, Vegan, or Non-Vegetarian choices with automated allergen exclusion and favorite food incorporation.',
    },
    {
      icon: <HeartPulse size={20} color="#0284c7" />,
      bg: '#f0f9ff',
      border: '#bae6fd',
      title: 'Macro Distribution',
      description: 'Optimizes protein, complex carbs, and essential fats to support weight loss, muscle gain, or long-term balanced health routines.',
    },
    {
      icon: <Droplets size={20} color="#7c3aed" />,
      bg: '#f5f3ff',
      border: '#ddd6fe',
      title: 'Hydration Target',
      description: 'Calculates daily fluid requirements based on lean mass and exercise intensity, preventing dehydration and fatigue throughout the day.',
    },
  ];

  return (
    <section id="nutrition" style={{ padding: '6rem 0', position: 'relative', backgroundColor: 'var(--bg-canvas)' }}>
      <div className="container">
        
        {/* Section Top Eyebrow & Split Heading (matching Slide 2) */}
        <div style={{ marginBottom: '1rem' }}>
          <span className="eyebrow-healthtech">
            Built for the future of nutrition
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.25rem)',
              maxWidth: '560px',
              margin: 0,
            }}
          >
            Transform clinical workflows with secure AI.
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              maxWidth: '380px',
              margin: 0,
            }}
          >
            Unlock faster workflows, smarter nutritional decisions, and effortless habit formation with AI-powered solutions designed to scale with your lifestyle.
          </p>
        </div>

        {/* 3 Large Red Metrics (matching Slide 2) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2rem',
            paddingBottom: '2.5rem',
            borderBottom: '1px solid #e5e7eb',
            marginBottom: '3rem',
          }}
        >
          <div>
            <div className="metric-number-healthtech">10x</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
              Faster workflow<br />execution
            </div>
          </div>

          <div>
            <div className="metric-number-healthtech">85%</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
              Less repetitive<br />diet tracking work
            </div>
          </div>

          <div>
            <div className="metric-number-healthtech">24/7</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.4 }}>
              Circadian Care &<br />ESP32 Reminders
            </div>
          </div>
        </div>

        {/* Panoramic Clinical Artwork Card (matching Slide 2) */}
        <div
          style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '4.5rem',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e5e7eb',
          }}
        >
          <img
            src="/images/clinical_workflow_art.jpg"
            alt="Clinical Workflow Serenity"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '440px',
              objectFit: 'cover',
              display: 'block',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(0, 0, 0, 0.45) 0%, transparent 60%)',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '2rem',
            }}
          >
            <div style={{ color: '#ffffff', maxWidth: '520px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#fda4af', marginBottom: '0.4rem' }}>
                Algorithmic Precision
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Translating metabolic equations into concrete biological routines
              </div>
            </div>
          </div>
        </div>

        {/* 4 Feature Pillars */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
            marginBottom: '3.5rem',
          }}
        >
          {steps.map((step, idx) => (
            <Card key={idx} variant="interactive" style={{ height: '100%', padding: '1.75rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: step.bg,
                  border: `1px solid ${step.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                {step.icon}
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-darkest)', marginBottom: '0.5rem' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {step.description}
              </p>
            </Card>
          ))}
        </div>

        {/* Interactive Example Breakdown Callout */}
        <div
          className="card-waypilot"
          style={{
            padding: '2.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-red)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <Activity size={14} />
              <span>LIVE COMPUTATION PROFILE</span>
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
              Sample Computation: 24-year-old Male, Moderate Activity
            </h3>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Using the clinical Mifflin-St Jeor standard, DietDecode calculates basal requirements, then multiplies by an active coefficient (1.55) to determine maintenance and target calories.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basal (BMR)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>1,745 kcal</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Need (TDEE)</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>2,705 kcal</div>
              </div>
              <div style={{ background: 'rgba(225, 29, 72, 0.05)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary-red)', fontWeight: 600 }}>Target Plan</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-red)' }}>2,250 kcal</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-darkest)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Prescribed Macronutrient Architecture:
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>Protein (30%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>169g • 675 kcal</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '30%', height: '100%', background: 'var(--primary-red)', borderRadius: '9999px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>Complex Carbs (45%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>253g • 1,013 kcal</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '45%', height: '100%', background: '#0284c7', borderRadius: '9999px' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 600 }}>Healthy Fats (25%)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>63g • 563 kcal</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ width: '25%', height: '100%', background: '#f59e0b', borderRadius: '9999px' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
