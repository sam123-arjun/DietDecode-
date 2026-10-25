import React from 'react';
import {
  Clock,
  CheckCircle2,
  Bell,
  AlertTriangle,
  Flame,
  Utensils,
  ChevronRight,
  Sparkles,
  Play,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { useAuth } from '../context/AuthContext';
import { useESP32 } from '../context/ESP32Context';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AppPage } from '../components/common/Sidebar';
import { formatTime12Hour } from '../utils/timeUtils';

interface TodaysMealsPageProps {
  onNavigate: (page: AppPage) => void;
}

export const TodaysMealsPage: React.FC<TodaysMealsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { meals, reminders, updateReminderStatus, loading } = useDiet();
  const { triggerTestReminder, deviceState } = useESP32();

  if (loading && !meals.length) {
    return <LoadingSpinner message="Loading today's meal schedule..." />;
  }

  if (meals.length === 0) {
    return (
      <div>
        <PageHeader title="Today’s Meals" subtitle="Timeline of scheduled meals and reminder adherence." />
        <EmptyState
          icon={<Utensils size={32} />}
          title="No Meals Scheduled Today"
          description="You haven't set up any meal times for today. Generate a personalized schedule from your profile."
          actionText="Set Up Meal Schedule"
          onAction={() => onNavigate('schedule')}
        />
      </div>
    );
  }

  const completedMeals = reminders.filter((r) => r.status === 'completed').length;
  const progressPercent = Math.round((completedMeals / (meals.length || 1)) * 100);

  return (
    <div>
      <PageHeader
        title="Today’s Meals Timeline"
        subtitle="Live daily meal adherence timeline with smart reminder synchronization."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('schedule')}
            leftIcon={<Clock size={14} />}
          >
            Manage Schedule
          </Button>
        }
      />

      {/* Daily Progress Tracker Card */}
      <div
        className="card-waypilot"
        style={{
          padding: '1.75rem 2rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
            Daily Routine Adherence
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.3rem', letterSpacing: '-0.02em' }}>
            {completedMeals} of {meals.length} Meals Completed ({progressPercent}%)
          </div>
        </div>

        <div style={{ width: '100%', maxWidth: '340px' }}>
          <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                borderRadius: '9999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            <span>0%</span>
            <span>50%</span>
            <span>100% Target</span>
          </div>
        </div>
      </div>

      {/* Meals Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {meals.map((meal, idx) => {
          const reminder = reminders.find((r) => r.mealId === meal.id || r.mealName === meal.name);
          const status = reminder ? reminder.status : 'upcoming';

          return (
            <div
              key={meal.id}
              className="card-waypilot"
              style={{
                padding: '2rem',
                borderLeft: `4px solid ${
                  status === 'completed'
                    ? '#059669'
                    : status === 'active'
                    ? '#0c0f17'
                    : status === 'missed'
                    ? '#e11d48'
                    : '#cbd5e1'
                }`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: '#f1f5f9',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      color: 'var(--text-darkest)',
                    }}
                  >
                    {formatTime12Hour(meal.scheduledTime)}
                  </span>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                    {meal.name}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    className={`badge ${
                      status === 'completed'
                        ? 'chip-completed'
                        : status === 'active'
                        ? 'chip-emerald'
                        : status === 'missed'
                        ? 'chip-rose'
                        : 'chip-sky'
                    }`}
                  >
                    {status === 'completed'
                      ? 'Completed'
                      : status === 'active'
                      ? 'Alert Active'
                      : status === 'missed'
                      ? 'Missed'
                      : 'Upcoming'}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {meal.recommendationNotes || meal.items.join(', ')}
              </p>

              {/* Items & ingredients */}
              {meal.items && meal.items.length > 0 && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Ingredients & Portions:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {meal.items.map((item, i) => (
                      <span
                        key={i}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px',
                          fontSize: '0.825rem',
                          color: 'var(--text-darkest)',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Nutrition Stats & Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.825rem' }}>
                  <span style={{ background: '#f8fafc', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                    🔥 {meal.calories} kcal
                  </span>
                  <span style={{ background: '#f8fafc', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    Protein: {meal.protein}g
                  </span>
                  <span style={{ background: '#f8fafc', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    Carbs: {meal.carbs}g
                  </span>
                  <span style={{ background: '#f8fafc', padding: '0.3rem 0.65rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    Fats: {meal.fats}g
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  {reminder && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => triggerTestReminder(reminder, user?.id || 'usr_demo_882')}
                      leftIcon={<Play size={13} />}
                    >
                      Trigger Alert
                    </Button>
                  )}
                  {status !== 'completed' && reminder && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => updateReminderStatus(reminder.id, 'completed', false)}
                      leftIcon={<CheckCircle2 size={14} />}
                    >
                      Mark as Eaten
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
