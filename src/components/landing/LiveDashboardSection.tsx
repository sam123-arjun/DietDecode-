import React, { useState } from 'react';
import {
  Flame,
  Utensils,
  Clock,
  Droplets,
  Bell,
  CheckCircle2,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDiet } from '../../context/DietContext';
import { useESP32 } from '../../context/ESP32Context';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';

interface LiveDashboardSectionProps {
  onOpenSchedule?: () => void;
  onOpenProfile?: () => void;
}

export const LiveDashboardSection: React.FC<LiveDashboardSectionProps> = ({
  onOpenSchedule,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { profile, meals, reminders, nutritionStats, updateReminderStatus } = useDiet();
  const { triggerTestReminder, deviceState } = useESP32();
  const [loggedWater, setLoggedWater] = useState<number>(1.75);

  const completedCount = reminders.filter((r) => r.status === 'completed').length;
  const totalCount = reminders.length || 4;
  const nextReminder = reminders.find((r) => r.status === 'upcoming' && r.enabled);
  const activeReminder = reminders.find((r) => r.status === 'active');

  const targetCalories = profile?.targetCalories || nutritionStats?.targetCalories || 2250;
  const targetWater = profile?.targetWaterLiters || nutritionStats?.waterLiters || 3.0;

  const calculatedBmi =
    profile && profile.height
      ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1)
      : '23.4';
  const calculatedBmr =
    nutritionStats?.bmr ||
    (profile && profile.weight
      ? Math.round(
          10 * profile.weight +
            6.25 * profile.height -
            5 * profile.age +
            (profile.gender === 'female' ? -161 : 5)
        )
      : 1740);

  const handleAddWater = () => {
    setLoggedWater((prev) => Math.min(targetWater + 1, +(prev + 0.25).toFixed(2)));
  };

  return (
    <section
      id="dashboard"
      style={{
        padding: '6rem 0',
        position: 'relative',
        backgroundColor: '#fafafa',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3.5rem' }}>
          <div style={{ marginBottom: '0.85rem' }}>
            <span className="eyebrow-healthtech">
              Live Nutritional Intelligence
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
            Today's Clinical & Hardware Command Center
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
            Real-time telemetry syncing metabolic calorie goals, live meal adherence, and physical ESP32 reminder state.
          </p>
        </div>

        {/* Active Urgent Alert Banner when ESP32 Reminder is Ringing */}
        {deviceState.currentState === 'REMINDER_ACTIVE' && (
          <div
            className="card-waypilot"
            style={{
              background: '#ffffff',
              border: '2px solid #dc2626',
              boxShadow: '0 20px 45px -10px rgba(220, 38, 38, 0.2)',
              padding: '1.25rem 1.75rem',
              marginBottom: '2rem',
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
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#dc2626',
                  animation: 'pulse 1.4s infinite',
                  flexShrink: 0,
                }}
              >
                <Bell size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                  Active Meal Alert on Connected ESP32!
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  OLED screen is displaying your meal and buzzer is chiming. Press the tactile button (GPIO 18) or confirm below.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              {activeReminder && (
                <button
                  className="btn-crimson"
                  onClick={() => updateReminderStatus(activeReminder.id, 'completed', false)}
                  style={{
                    backgroundColor: '#dc2626',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Acknowledge Meal (Completed)</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* 4 Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}
        >
          <StatCard
            label="Today's Target"
            value={`${targetCalories} kcal`}
            subValue="Metabolic target goal"
            icon={<Flame size={20} />}
            accentColor="#dc2626"
            trend="Active Plan"
          />

          <StatCard
            label="Meals Completed"
            value={`${completedCount} of ${totalCount}`}
            subValue={completedCount === totalCount ? 'All meals logged today!' : `${totalCount - completedCount} meal(s) remaining`}
            icon={<Utensils size={20} />}
            accentColor="#059669"
            trend={`${Math.round((completedCount / totalCount) * 100)}% adherence`}
          />

          <StatCard
            label="Next Meal Alert"
            value={nextReminder ? nextReminder.time : 'None pending'}
            subValue={nextReminder ? nextReminder.mealName : 'All scheduled meals done'}
            icon={<Clock size={20} />}
            accentColor="#0284c7"
          />

          {/* Interactive Water Intake Card */}
          <div
            className="card-waypilot"
            style={{
              padding: '1.35rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Water Intake
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.35rem', lineHeight: 1.1 }}>
                  {loggedWater} <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 500 }}>/ {targetWater} L</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  {Math.round((loggedWater / targetWater) * 100)}% of daily recommendation
                </div>
              </div>

              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                  flexShrink: 0,
                }}
              >
                <Droplets size={20} />
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ flex: 1, height: '7px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(100, (loggedWater / targetWater) * 100)}%`,
                    background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <button
                onClick={handleAddWater}
                title="Add 250ml water"
                style={{
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)',
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <Plus size={12} />
                <span>0.25L</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Today's Routine (Left) + Metabolic Engine & Quick Profile (Right) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* Left Column: Today's Meal Routine (8 cols) */}
          <div style={{ gridColumn: 'span 12' }} className="dashboard-col-left">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em', margin: 0 }}>
                  Today's Prescribed Meal Routine
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Circadian-timed meals synced to your connected hardware buzzer.
                </div>
              </div>

              <span className="badge chip-dark" style={{ fontSize: '0.75rem' }}>
                4 Scheduled Windows
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              {meals.map((meal) => {
                const reminder = reminders.find((r) => r.mealId === meal.id || r.mealName === meal.name);
                const status = reminder ? reminder.status : 'upcoming';

                return (
                  <div
                    key={meal.id}
                    className="card-waypilot"
                    style={{
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                      position: 'relative',
                      borderLeft: `4px solid ${
                        status === 'completed'
                          ? '#059669'
                          : status === 'active'
                          ? '#dc2626'
                          : status === 'missed'
                          ? '#e11d48'
                          : '#cbd5e1'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.825rem',
                            fontWeight: 700,
                            color: 'var(--text-darkest)',
                            background: '#f1f5f9',
                            padding: '0.25rem 0.65rem',
                            borderRadius: '9999px',
                          }}
                        >
                          {meal.scheduledTime}
                        </span>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                          {meal.name}
                        </h4>
                      </div>

                      <span
                        className={`badge ${
                          status === 'completed'
                            ? 'chip-completed'
                            : status === 'active'
                            ? 'chip-rose'
                            : status === 'missed'
                            ? 'chip-amber'
                            : 'chip-sky'
                        }`}
                      >
                        {status === 'completed'
                          ? '✓ Completed'
                          : status === 'active'
                          ? '● Alert Ringing'
                          : status === 'missed'
                          ? 'Missed'
                          : 'Upcoming'}
                      </span>
                    </div>

                    {/* Meal items / prescription notes */}
                    <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                      {meal.recommendationNotes || meal.items.join(', ')}
                    </p>

                    {/* Macros & Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        paddingTop: '0.65rem',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.775rem' }}>
                        <span style={{ background: '#f8fafc', padding: '0.2rem 0.55rem', borderRadius: '6px', color: '#dc2626', border: '1px solid #fecdd3', fontWeight: 700 }}>
                          🔥 {meal.calories} kcal
                        </span>
                        <span style={{ background: '#f8fafc', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                          Protein: {meal.protein}g
                        </span>
                        <span style={{ background: '#f8fafc', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>
                          Carbs: {meal.carbs}g
                        </span>
                        <span style={{ background: '#f8fafc', padding: '0.2rem 0.55rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>
                          Fats: {meal.fats}g
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {reminder && status !== 'completed' && (
                          <>
                            <button
                              onClick={() => triggerTestReminder(reminder, user?.id || 'usr_demo_882')}
                              title="Send instant test alert to physical ESP32 OLED"
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #d1d5db',
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
                              <span>Test Alert</span>
                            </button>

                            <button
                              onClick={() => updateReminderStatus(reminder.id, 'completed', false)}
                              style={{
                                background: '#dc2626',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '9999px',
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.775rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Eaten</span>
                            </button>
                          </>
                        )}

                        {status === 'completed' && (
                          <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                            <CheckCircle2 size={15} /> Logged & Synced
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Metabolic Telemetry & Clinical Breakdown (4 cols) */}
          <div style={{ gridColumn: 'span 12' }} className="dashboard-col-right">
            <div
              className="card-waypilot"
              style={{
                padding: '1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.35rem',
                position: 'sticky',
                top: '90px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="eyebrow-healthtech" style={{ fontSize: '0.7rem' }}>
                  Metabolic Profile
                </span>
                <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  Mifflin-St Jeor
                </span>
              </div>

              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                  {user?.fullName || 'DietDecode User'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Goal: Caloric Deficit & Blood Glucose Stability
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Basal BMR</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.2rem' }}>
                    {calculatedBmr} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>kcal</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Body Mass BMI</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
                    {calculatedBmi} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>Normal</span>
                  </div>
                </div>
              </div>

              {/* Macronutrient Distribution Bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  <span>Macro Ratio Target</span>
                  <span>45% C • 30% P • 25% F</span>
                </div>
                <div style={{ height: '8px', width: '100%', borderRadius: '9999px', display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: '45%', background: '#0284c7' }} title="Carbs: 45%" />
                  <div style={{ width: '30%', background: '#dc2626' }} title="Protein: 30%" />
                  <div style={{ width: '25%', background: '#f59e0b' }} title="Fats: 25%" />
                </div>
              </div>

              {/* Quick Jump Buttons to other sections right on this page */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                <a
                  href="#device"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: 'var(--text-darkest)',
                    textDecoration: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Cpu size={15} color="#dc2626" />
                    <span>ESP32 Hardware Simulator</span>
                  </div>
                  <ArrowRight size={13} />
                </a>

                <a
                  href="#schedule"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: 'var(--text-darkest)',
                    textDecoration: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={15} color="#0284c7" />
                    <span>Circadian Meal Timing</span>
                  </div>
                  <ArrowRight size={13} />
                </a>

                <a
                  href="#reminders"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: 'var(--text-darkest)',
                    textDecoration: 'none',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Bell size={15} color="#f59e0b" />
                    <span>Reminder Rules & History</span>
                  </div>
                  <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Responsive grid CSS */}
        <style>{`
          @media (min-width: 992px) {
            .dashboard-col-left {
              grid-column: span 8 !important;
            }
            .dashboard-col-right {
              grid-column: span 4 !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
};
