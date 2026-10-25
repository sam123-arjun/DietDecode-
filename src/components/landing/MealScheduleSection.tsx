import React from 'react';
import { Clock, Calendar, CheckCircle2, AlertCircle, Bell, ArrowRight } from 'lucide-react';
import { Card } from '../common/Card';

export const MealScheduleSection: React.FC = () => {
  const scheduleSlots = [
    {
      time: '08:00 AM',
      name: 'Breakfast',
      menu: 'Rolled Oatmeal + Banana + Skimmed Milk + Walnuts',
      status: 'completed',
      tag: 'Completed',
    },
    {
      time: '01:00 PM',
      name: 'Lunch',
      menu: 'Steamed Rice + Moong Dal Tadka + Seasonal Subzi + Salad',
      status: 'active',
      tag: 'Alert Active',
    },
    {
      time: '05:00 PM',
      name: 'Snack',
      menu: 'Roasted Foxnuts (Makhana) + Green Tea + Apple',
      status: 'upcoming',
      tag: 'Upcoming',
    },
    {
      time: '08:00 PM',
      name: 'Dinner',
      menu: 'Phulka Roti + Paneer Bhurji + Warm Turmeric Soup',
      status: 'upcoming',
      tag: 'Upcoming',
    },
  ];

  return (
    <section id="schedule" style={{ padding: '6rem 0', position: 'relative' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 4rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <span className="eyebrow-healthtech">
              Circadian Synchronization
            </span>
          </div>

          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
              marginBottom: '1.1rem',
            }}
          >
            Your meals, on time.
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Eating the right food at irregular hours sabotages metabolic health and insulin sensitivity. DietDecode schedules meal notifications to match natural circadian peaks.
          </p>
        </div>

        {/* Schedule Timeline Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.25rem',
            marginBottom: '3rem',
          }}
        >
          {scheduleSlots.map((slot, idx) => {
            const isCompleted = slot.status === 'completed';
            const isActive = slot.status === 'active';

            return (
              <div
                key={idx}
                className="card-waypilot"
                style={{
                  padding: '1.75rem 1.5rem',
                  border: isActive ? '2px solid var(--primary-red)' : '1px solid #e5e7eb',
                  boxShadow: isActive ? '0 16px 36px -8px rgba(225, 29, 72, 0.15)' : 'var(--shadow-card)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      background: 'var(--primary-red)',
                    }}
                  />
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.825rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-darkest)' }}>
                    {slot.time}
                  </span>
                  <span
                    className={`badge ${
                      isActive
                        ? 'chip-emerald'
                        : isCompleted
                        ? 'chip-completed'
                        : 'chip-sky'
                    }`}
                  >
                    {slot.tag}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
                  {slot.name}
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {slot.menu}
                </p>
              </div>
            );
          })}
        </div>

        {/* Circadian Benefits Callout Banner */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-hairline)',
            borderRadius: '20px',
            padding: '1.5rem 2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                flexShrink: 0,
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-darkest)', fontSize: '0.95rem' }}>
                Circadian Fasting Windows Respected
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                12-hour overnight metabolic rest period automatically computed between dinner and breakfast.
              </div>
            </div>
          </div>

          <span className="badge chip-dark">
            Automatic Fasting Sync
          </span>
        </div>

      </div>
    </section>
  );
};
