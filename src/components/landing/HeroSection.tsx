import React from 'react';
import { ArrowRight, Cpu, Sparkles, Activity, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
  onExplore: () => void;
  onSignIn?: () => void;
  isLoggedIn?: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStarted,
  onExplore,
  onSignIn,
  isLoggedIn = false,
}) => {
  const partners = [
    { name: 'Mifflin-St Jeor Research', mark: '⬡' },
    { name: 'ESP32 FreeRTOS Node', mark: '◈' },
    { name: 'SSD1306 OLED Protocol', mark: '◉' },
    { name: 'W3C Open Health APIs', mark: '❖' },
    { name: 'HIPAA-Compliant Care', mark: '☤' },
  ];

  return (
    <section
      id="hero"
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        paddingTop: 'clamp(135px, 16vh, 175px)',
        paddingBottom: '3.5rem',
        overflow: 'hidden',
        backgroundColor: '#fafafa',
      }}
    >
      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Layer 1: Eyebrow Tag + Monumental HEALTHTECH title (completely clear of floating navbar) */}
        <div
          style={{
            textAlign: 'center',
            width: '100%',
            position: 'relative',
            zIndex: 1,
            userSelect: 'none',
          }}
        >
          <div style={{ marginBottom: '1rem' }}>
            <span
              className="eyebrow-healthtech"
              style={{
                fontSize: '0.725rem',
                letterSpacing: '0.12em',
                background: 'rgba(220, 38, 38, 0.06)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#dc2626',
              }}
            >
              DietDecode • Autonomous IoT Nutrition & Clinical Reminders
            </span>
          </div>

          <h1
            className="headline-healthtech"
            style={{
              fontSize: 'clamp(3.8rem, 12vw, 11rem)',
              lineHeight: 0.88,
              letterSpacing: '0.02em',
              color: '#dc2626',
              margin: '0 auto',
            }}
          >
            HEALTHTECH
          </h1>
        </div>

        {/* Layer 2: 3-Column Overlapping Hero Grid */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            alignItems: 'center',
            marginTop: '0.75rem',
          }}
          className="hero-grid-healthtech"
        >
          {/* Left Column: Mission Description & Social Proof */}
          <div
            style={{
              gridColumn: 'span 12',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '2.5rem',
              padding: '1rem',
            }}
            className="hero-col-left"
          >
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.65,
                maxWidth: '310px',
                margin: 0,
              }}
            >
              Empower healthcare teams with AI-powered tools that simplify workflows, improve decision-making and deliver better patient experiences.
            </p>

            {/* Social Proof Avatar Pill (Direct match to screenshot) */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.65rem',
                background: 'rgba(254, 226, 226, 0.45)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.35rem 0.85rem 0.35rem 0.45rem',
                borderRadius: '9999px',
                width: 'fit-content',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80"
                  alt="Doctor"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    objectFit: 'cover',
                  }}
                />
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80"
                  alt="Clinician"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    marginLeft: '-7px',
                    objectFit: 'cover',
                  }}
                />
                <img
                  src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&auto=format&fit=crop&q=80"
                  alt="Dietitian"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: '2px solid #ffffff',
                    marginLeft: '-7px',
                    objectFit: 'cover',
                  }}
                />
              </div>

              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#374151' }}>
                Trusted by healthcare teams worldwide
              </span>
            </div>
          </div>

          {/* Center Column: Surreal Hero Artwork overlapping the word HEALTHTECH */}
          <div
            style={{
              gridColumn: 'span 12',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="hero-col-center"
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '410px',
                WebkitMaskImage: 'radial-gradient(ellipse 90% 88% at 50% 50%, black 50%, transparent 95%)',
                maskImage: 'radial-gradient(ellipse 90% 88% at 50% 50%, black 50%, transparent 95%)',
              }}
            >
              <img
                src="/images/healthtech_hero_art.jpg"
                alt="HealthTech Botanical Neuro-Sculpture"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                  mixBlendMode: 'multiply',
                  filter: 'contrast(1.02) brightness(0.99)',
                }}
              />

              {/* Bottom Mist Fade Gradient */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '80px',
                  background: 'linear-gradient(to top, #fafafa 25%, transparent)',
                  pointerEvents: 'none',
                }}
              />

              {/* Live ESP32 Hardware Status Tag */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '9999px',
                  padding: '0.3rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    boxShadow: '0 0 6px #10b981',
                  }}
                />
                <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#111827' }}>
                  ESP32 FreeRTOS Node Online
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Automation Message, Headline & Action Buttons */}
          <div
            style={{
              gridColumn: 'span 12',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '1.75rem',
              padding: '1rem',
            }}
            className="hero-col-right"
          >
            <p
              style={{
                fontSize: '0.95rem',
                color: '#4b5563',
                lineHeight: 1.65,
                maxWidth: '330px',
                margin: 0,
              }}
            >
              Automate administrative tasks, support clinical operations, and help healthcare professionals focus on delivering smarter, faster care.
            </p>

            <div>
              <h2
                className="headline-sub"
                style={{
                  fontSize: 'clamp(1.75rem, 2.4vw, 2.35rem)',
                  maxWidth: '360px',
                  lineHeight: 1.18,
                  marginBottom: '1.5rem',
                  color: '#111827',
                }}
              >
                Transform healthcare with intelligent AI solutions
              </h2>

              {/* Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  className="btn-crimson"
                  onClick={onGetStarted}
                  style={{
                    backgroundColor: '#dc2626',
                    padding: '0.75rem 1.6rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  <span>{isLoggedIn ? 'Open Dashboard' : 'Register & Begin'}</span>
                  <ArrowRight size={14} />
                </button>
                <button
                  className="btn-outline-healthtech"
                  onClick={isLoggedIn ? onExplore : (onSignIn || onExplore)}
                  style={{
                    padding: '0.75rem 1.6rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    border: '1px solid #d1d5db',
                  }}
                >
                  <span>{isLoggedIn ? 'Explore Science' : 'Sign In'}</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive CSS for Overlapping 3-Column Layout */}
        <style>{`
          @media (min-width: 992px) {
            .hero-col-left {
              grid-column: span 3 !important;
              text-align: left;
              align-self: flex-start;
              padding-top: 1.5rem;
            }
            .hero-col-center {
              grid-column: span 6 !important;
              margin-top: clamp(-4rem, -6.5vw, -8rem) !important;
            }
            .hero-col-right {
              grid-column: span 3 !important;
              text-align: left;
              align-self: flex-start;
              padding-top: 1.5rem;
            }
          }
        `}</style>

        {/* Partner / Standards Continuous Segmented Strip (Direct match to screenshot) */}
        <div style={{ textAlign: 'center', marginTop: '3.5rem' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <span
              className="eyebrow-healthtech"
              style={{
                background: 'rgba(254, 226, 226, 0.5)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: '#dc2626',
                padding: '0.35rem 0.95rem',
              }}
            >
              Powering teams across industries
            </span>
          </div>

          {/* Continuous segmented horizontal container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              maxWidth: '980px',
              margin: '0 auto',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
              flexWrap: 'wrap',
            }}
          >
            {partners.map((partner, i) => (
              <div
                key={i}
                style={{
                  flex: '1 1 180px',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRight: i < partners.length - 1 ? '1px solid #f1f5f9' : 'none',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#4b5563',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{partner.mark}</span>
                <span>{partner.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};
