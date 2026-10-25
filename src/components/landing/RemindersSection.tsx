import React from 'react';
import { Bell, CheckCircle2, Clock, Play, Volume2, ShieldCheck, History, AlertCircle } from 'lucide-react';
import { useDiet } from '../../context/DietContext';
import { useESP32 } from '../../context/ESP32Context';
import { useAuth } from '../../context/AuthContext';
import { formatTime12Hour } from '../../utils/timeUtils';

export const RemindersSection: React.FC = () => {
  const { user } = useAuth();
  const { reminders, history, updateReminderStatus } = useDiet();
  const { triggerTestReminder, deviceState } = useESP32();

  const nextReminder = reminders.find((r) => r.status === 'upcoming' && r.enabled);

  return (
    <section
      id="reminders"
      style={{
        padding: '6rem 0',
        position: 'relative',
        backgroundColor: '#faf9f6',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3.5rem' }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <span className="eyebrow-healthtech">
              Autonomous Hardware Alerts
            </span>
          </div>

          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
              marginBottom: '1rem',
              color: 'var(--text-darkest)',
            }}
          >
            Smart Reminders & Compliance History
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Synchronize meal intervals with audio buzzer chime sequences and track historical dietary compliance.
          </p>
        </div>

        {/* 2-Column Layout: Reminders Queue (Left) & Adherence History (Right) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
          }}
        >
          {/* Left: Active Reminders Queue */}
          <div style={{ gridColumn: 'span 12' }} className="reminders-col-left">
            <div className="card-waypilot" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                    Active Alarm Queue
                  </h3>
                  <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    Hardwired to ESP32 Pin 25 Piezo Buzzer & SSD1306 Display
                  </div>
                </div>

                <span className="badge chip-dark" style={{ fontSize: '0.75rem' }}>
                  {reminders.length} Registered Alarms
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {reminders.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '1.15rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: r.status === 'completed' ? '#ecfdf5' : '#fff1f2',
                          border: `1px solid ${r.status === 'completed' ? '#a7f3d0' : '#fecdd3'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: r.status === 'completed' ? '#059669' : '#dc2626',
                          flexShrink: 0,
                        }}
                      >
                        <Bell size={18} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-darkest)' }}>
                            {r.mealName}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: 'var(--text-darkest)',
                              background: '#e2e8f0',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '6px',
                            }}
                          >
                            {formatTime12Hour(r.time)}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          Buzzer Duration: 15s • Tone: 2400Hz Pulses
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        onClick={() => triggerTestReminder(r, user?.id || 'usr_demo_882')}
                        title="Simulate alarm sound on hardware"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: 'var(--text-darkest)',
                          borderRadius: '9999px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Play size={11} />
                        <span>Simulate Chime</span>
                      </button>

                      <span
                        className={`badge ${
                          r.status === 'completed'
                            ? 'chip-completed'
                            : r.status === 'active'
                            ? 'chip-rose'
                            : 'chip-sky'
                        }`}
                        style={{ fontSize: '0.75rem' }}
                      >
                        {r.status === 'completed' ? 'Completed' : r.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Adherence History Log */}
          <div style={{ gridColumn: 'span 12' }} className="reminders-col-right">
            <div className="card-waypilot" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={18} color="#dc2626" />
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                    Adherence History
                  </h3>
                </div>
                <span className="badge chip-emerald" style={{ fontSize: '0.75rem' }}>
                  94% 7-Day Adherence
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {(history.length > 0 ? history.slice(0, 5) : [
                  { id: 'h1', mealName: 'Morning Breakfast', scheduledTime: '08:30 AM', confirmedTime: '08:34 AM', status: 'completed', date: 'Today' },
                  { id: 'h2', mealName: 'Pre-Workout Fuel', scheduledTime: '11:00 AM', confirmedTime: '11:02 AM', status: 'completed', date: 'Today' },
                  { id: 'h3', mealName: 'Macro Balanced Lunch', scheduledTime: '01:00 PM', confirmedTime: '01:15 PM', status: 'completed', date: 'Today' },
                  { id: 'h4', mealName: 'Circadian Dinner', scheduledTime: '08:00 PM', confirmedTime: '08:08 PM', status: 'completed', date: 'Yesterday' },
                ]).map((item: any, idx: number) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.85rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-darkest)' }}>
                        {item.mealName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Scheduled: {item.scheduledTime} • Confirmed: {item.confirmedTime || 'Prompted'}
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle2 size={14} /> Logged
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (min-width: 992px) {
            .reminders-col-left {
              grid-column: span 7 !important;
            }
            .reminders-col-right {
              grid-column: span 5 !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
};
