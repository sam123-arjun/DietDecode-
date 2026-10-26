import React, { useState, useMemo } from 'react';
import {
  Flame,
  Utensils,
  Bell,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Cpu,
  Droplets,
  Calendar,
  AlertTriangle,
  Plus,
  Play,
  RotateCcw,
  Thermometer,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDiet } from '../context/DietContext';
import { useESP32 } from '../context/ESP32Context';
import { Card } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { ESP32Simulator } from '../components/esp32/ESP32Simulator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AppPage } from '../components/common/Sidebar';
import { RemoteBuzzerControl } from '../components/common/RemoteBuzzerControl';
import { NotificationPermissionBanner } from '../components/common/NotificationPermissionBanner';
import { formatTime12Hour, getTimeRemaining, parseTimeToTodayTimestamp } from '../utils/timeUtils';

interface DashboardPageProps {
  onNavigate: (page: AppPage) => void;
}

const WATER_KEY = (userId: string) => `dietdecode_water_${userId}_${new Date().toISOString().split('T')[0]}`;

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    profile,
    meals,
    reminders,
    nutritionStats,
    loading,
    updateReminderStatus,
    activePlan,
    currentTime,
    nextReminder,
    activeReminder,
    scheduleNextWaterReminder,
  } = useDiet();
  const { triggerTestReminder, deviceState, iotMode } = useESP32();

  const [loggedWater, setLoggedWater] = useState<number>(() => {
    if (!user) return 0;
    const saved = localStorage.getItem(WATER_KEY(user.id));
    return saved ? parseFloat(saved) : 0;
  });
  const [mealAlertErrors, setMealAlertErrors] = useState<Record<string, string | null>>({});
  const [testingReminderId, setTestingReminderId] = useState<string | null>(null);

  const effectiveActiveReminder = useMemo(() => {
    if (activeReminder) return activeReminder;
    const activeFromList = reminders.find((r) => r.status === 'active');
    if (activeFromList) return activeFromList;

    if (deviceState.currentState === 'REMINDER_ACTIVE' || deviceState.activeReminderId) {
      if (deviceState.activeReminderId) {
        const found = reminders.find((r) => r.id === deviceState.activeReminderId);
        if (found) return found;
      }
      if (deviceState.currentState === 'REMINDER_ACTIVE' || deviceState.buzzerActive) {
        return {
          id: deviceState.activeReminderId || 'rem_active',
          userId: user?.id || 'usr_demo_882',
          mealId: 'meal_active',
          mealName: deviceState.oledDisplay.line2 || 'Active Meal Alert',
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'active' as const,
          enabled: true,
          acknowledged: false,
          scheduledTimestamp: Date.now(),
          itemsSummary: 'Hardware Alert Active',
        };
      }
    }
    return null;
  }, [activeReminder, deviceState, reminders, user]);

  const handleTestAlert = async (reminder: (typeof reminders)[0]) => {
    setTestingReminderId(reminder.id);
    setMealAlertErrors((prev) => ({ ...prev, [reminder.id]: null }));
    try {
      await Promise.race([
        (async () => {
          await updateReminderStatus(reminder.id, 'active');
          const result = await triggerTestReminder(reminder, user?.id || 'usr_demo_882');
          if (!result.success) {
            setMealAlertErrors((prev) => ({ ...prev, [reminder.id]: result.error || 'Failed to alert device.' }));
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Device alert request timed out. Please check device connectivity.')), 4500)
        ),
      ]);
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to alert device.';
      setMealAlertErrors((prev) => ({ ...prev, [reminder.id]: msg }));
    } finally {
      setTestingReminderId(null);
    }
  };

  if (loading && !profile && meals.length === 0) {
    return <LoadingSpinner message="Synchronizing personalized diet & device records..." />;
  }

  // No active plan — nudge user to generate one
  if (!activePlan && profile?.isProfileComplete && !loading) {
    return (
      <div>
        <PageHeader
          title={`${new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'}, ${user?.fullName || 'User'}`}
          subtitle="Your dashboard is ready — generate your diet plan to get started."
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            gap: '1.5rem',
          }}
        >
          <div style={{ fontSize: '4rem' }}>🥗</div>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.6rem' }}>
              No Active Diet Plan
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.6 }}>
              Generate your personalized 7-day meal plan so your dashboard and ESP32 reminders have real data to work with.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => onNavigate('diet-plan')} leftIcon={<Sparkles size={18} />}>
            Generate Diet Plan →
          </Button>
        </div>
      </div>
    );
  }

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const completedCount = reminders.filter((r) => r.status === 'completed').length;
  const totalCount = reminders.length || 4;

  const targetCalories = profile?.targetCalories || nutritionStats?.targetCalories || 2250;
  const targetWater = profile?.targetWaterLiters || nutritionStats?.waterLiters || 3.0;

  const calculatedBmi = profile && profile.height ? (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1) : '23.4';
  const calculatedBmr = nutritionStats?.bmr || (profile && profile.weight ? Math.round(10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.gender === 'female' ? -161 : 5)) : 1740);

  const handleAddWater = () => {
    setLoggedWater((prev) => {
      const next = Math.min((targetWater || 3) + 1, +(prev + 0.25).toFixed(2));
      if (user) localStorage.setItem(WATER_KEY(user.id), String(next));
      return next;
    });
    // Automatically queue next water reminder for 1 hour later
    scheduleNextWaterReminder(1).catch(() => {});
  };

  // Environmental Telemetry state calculations
  const telemetry = deviceState.telemetry;
  const isConnected = deviceState.connected;

  const getTelemetryStatus = () => {
    if (!isConnected) {
      return { status: 'offline', text: 'ESP32 Offline', isStale: true };
    }
    if (!telemetry || !telemetry.timestamp) {
      return { status: 'loading', text: 'Awaiting initial telemetry...', isStale: true };
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - telemetry.timestamp) / 1000));
    if (ageSeconds > 60) {
      return { status: 'stale', text: `Stale • Synced ${Math.floor(ageSeconds / 60)}m ago`, isStale: true };
    }
    if (ageSeconds > 10) {
      return { status: 'delayed', text: `Synced ${ageSeconds}s ago`, isStale: false };
    }
    return { status: 'live', text: 'Live • Synced just now', isStale: false };
  };

  const telemetryStatus = getTelemetryStatus();

  const tempDisplay = !isConnected
    ? 'Offline'
    : !telemetry
    ? 'Connecting...'
    : telemetry.temperature === null || telemetry.temperature === undefined
    ? 'Sensor Err'
    : `${telemetry.temperature.toFixed(1)} °C`;

  const tempSub = !isConnected
    ? 'Connect ESP32 to view'
    : !telemetry
    ? 'Awaiting DHT22 broadcast'
    : telemetry.temperature === null
    ? 'Check GPIO 32 connection'
    : `${telemetryStatus.text} • DHT22`;

  const humidityDisplay = !isConnected
    ? 'Offline'
    : !telemetry
    ? 'Connecting...'
    : telemetry.humidity === null || telemetry.humidity === undefined
    ? 'Sensor Err'
    : `${telemetry.humidity.toFixed(1)} %`;

  const humiditySub = !isConnected
    ? 'Connect ESP32 to view'
    : !telemetry
    ? 'Awaiting DHT22 broadcast'
    : telemetry.humidity === null
    ? 'Check GPIO 32 connection'
    : `${telemetryStatus.text} • Relative Humidity`;

  const lightDisplay = !isConnected
    ? 'Offline'
    : !telemetry
    ? 'Connecting...'
    : !telemetry.light || telemetry.light === 'UNKNOWN'
    ? 'Reading...'
    : telemetry.light;

  const lightSub = !isConnected
    ? 'Connect ESP32 to view'
    : !telemetry
    ? 'Awaiting GPIO 19 LDR'
    : telemetry.light === 'DARK'
    ? 'Hand detected / Low Light'
    : 'Hand away / Ambient Light';

  return (
    <div>
      {/* Page Header */}
      <PageHeader
        title={`${greeting}, ${user?.fullName || 'User'}`}
        subtitle="Here is your personalized nutrition overview and connected ESP32 reminder state for today."
        badge={
          <span className="badge chip-emerald" style={{ fontSize: '0.75rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }} />
            ESP32 {deviceState.currentState}
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onNavigate('reminders')}
              leftIcon={<Bell size={14} />}
            >
              Reminders Panel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('diet-plan')}
              rightIcon={<ArrowRight size={14} />}
            >
              Full Diet Plan
            </Button>
          </div>
        }
      />

      {/* Browser Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Active Reminder Urgent Banner if REMINDER_ACTIVE or activeReminder */}
      {(deviceState.currentState === 'REMINDER_ACTIVE' || Boolean(effectiveActiveReminder)) && (
        <div
          className="card-waypilot"
          style={{
            background: '#ffffff',
            border: '2px solid #0c0f17',
            boxShadow: '0 20px 40px -10px rgba(12, 15, 23, 0.2)',
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
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#fef2f2',
                border: '1px solid #fecdd3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48',
                animation: 'pulse 1.5s infinite',
                flexShrink: 0,
              }}
            >
              <Bell size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                Meal Reminder Active on ESP32 Hardware!
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {effectiveActiveReminder ? effectiveActiveReminder.mealName : 'Scheduled meal'} is alerting. OLED screen is displaying your meal and Piezo buzzer is active.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <RemoteBuzzerControl activeReminder={effectiveActiveReminder} />
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
          subValue="Personalized goal"
          icon={<Flame size={20} />}
          accentColor="#f59e0b"
        />

        <StatCard
          label="Completed Meals"
          value={`${completedCount} of ${totalCount}`}
          subValue={completedCount === totalCount ? 'All meals logged!' : `${totalCount - completedCount} remaining`}
          icon={<Utensils size={20} />}
          accentColor="#059669"
        />

        <StatCard
          label="Next Meal Alert"
          value={nextReminder ? formatTime12Hour(nextReminder.time) : 'None pending'}
          subValue={
            nextReminder
              ? `${nextReminder.mealName} • ${
                  getTimeRemaining(parseTimeToTodayTimestamp(nextReminder.time, currentTime), currentTime.getTime()).formatted
                }`
              : 'All done today'
          }
          icon={<Clock size={20} />}
          accentColor="#0284c7"
        />

        <StatCard
          label="Water Intake"
          value={`${loggedWater} / ${targetWater} L`}
          subValue={`${Math.round((loggedWater / targetWater) * 100)}% of recommendation`}
          icon={<Droplets size={20} />}
          accentColor="#7c3aed"
        />
      </div>

      {/* Live ESP32 Sensor Telemetry Section */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Cpu size={18} style={{ color: '#059669' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em', margin: 0 }}>
              Live Environmental Telemetry
            </h3>
            <span
              className={`badge ${telemetryStatus.status === 'live' ? 'chip-emerald' : telemetryStatus.status === 'stale' ? 'chip-amber' : 'chip-slate'}`}
              style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: telemetryStatus.status === 'live' ? '#059669' : telemetryStatus.status === 'stale' ? '#f59e0b' : '#94a3b8',
                }}
              />
              {telemetryStatus.status === 'live' ? 'Node 01 Realtime' : telemetryStatus.text}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={13} />
            <span>Path: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>/devices/dietdecode-device-01/telemetry</code></span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          <StatCard
            label="Ambient Temperature"
            value={tempDisplay}
            subValue={tempSub}
            icon={<Thermometer size={20} />}
            trend={telemetryStatus.status === 'live' ? 'DHT22 Live' : undefined}
            accentColor="#ea580c"
          />

          <StatCard
            label="Relative Humidity"
            value={humidityDisplay}
            subValue={humiditySub}
            icon={<Droplets size={20} />}
            trend={telemetryStatus.status === 'live' ? 'DHT22 Live' : undefined}
            accentColor="#0284c7"
          />

          <StatCard
            label="Ambient Light (LDR)"
            value={lightDisplay}
            subValue={lightSub}
            icon={telemetry?.light === 'DARK' ? <Moon size={20} /> : <Sun size={20} />}
            trend="GPIO 19 Optical"
            accentColor={telemetry?.light === 'DARK' ? '#6366f1' : '#eab308'}
          />
        </div>
      </div>

      {/* Main Grid: Today's Diet Plan (Left) + ESP32 Live Device (Right) */}
      <div className="grid-dashboard-main">
        {/* Left Column: Today's Meal Plan Schedule */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em' }}>
              Today's Meal Routine
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('schedule')}
              leftIcon={<Calendar size={14} />}
            >
              Adjust Schedule
            </Button>
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
                        ? '#0c0f17'
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
                        {formatTime12Hour(meal.scheduledTime)}
                      </span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                        {meal.name}
                      </h3>
                    </div>

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

                  {/* Meal description & nutritional chips */}
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {meal.recommendationNotes || meal.items.join(', ')}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.775rem' }}>
                      <span style={{ background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0', fontWeight: 600 }}>
                        🔥 {meal.calories} kcal
                      </span>
                      <span style={{ background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>
                        P: {meal.protein}g
                      </span>
                      <span style={{ background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>
                        C: {meal.carbs}g
                      </span>
                      <span style={{ background: '#f8fafc', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-secondary)', border: '1px solid #e2e8f0' }}>
                        F: {meal.fats}g
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {reminder && status !== 'completed' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestAlert(reminder)}
                            isLoading={testingReminderId === reminder.id}
                            title="Send instant test alert to physical ESP32"
                            leftIcon={<Play size={12} />}
                          >
                            Test Alert
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => updateReminderStatus(reminder.id, 'completed', false)}
                            leftIcon={<CheckCircle2 size={13} />}
                          >
                            Mark Eaten
                          </Button>
                        </>
                      )}
                      {status === 'completed' && (
                        <span style={{ fontSize: '0.8rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600 }}>
                          <CheckCircle2 size={15} /> Logged
                        </span>
                      )}
                    </div>
                  </div>
                  {reminder && mealAlertErrors[reminder.id] && (
                    <div
                      role="alert"
                      style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        border: '1px solid #fecdd3',
                        color: '#b91c1c',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.4rem',
                      }}
                    >
                      <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                      <span><strong>Device not alerted:</strong> {mealAlertErrors[reminder.id]}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: ESP32 Hardware Simulator & Quick Utilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Hardware Simulator Node */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em' }}>
                ESP32 Hardware Node
              </h2>
              <span className={`badge ${deviceState.connected ? 'chip-emerald' : 'chip-dark'}`} style={{ fontSize: '0.7rem' }}>
                {iotMode === 'firebase' ? 'FIREBASE' : 'LOCAL REST'}
              </span>
            </div>

            <ESP32Simulator compact={true} />
          </div>

          {/* Quick Water Logger Card */}
          <div className="card-waypilot" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
                  <Droplets size={16} />
                </div>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-darkest)' }}>Hydration Logger</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: {targetWater} Liters / day</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => scheduleNextWaterReminder(1)}
                  title="Schedule a water reminder for 1 hour from now"
                >
                  ⏰ In 1h
                </Button>
                <Button size="sm" variant="secondary" onClick={handleAddWater} leftIcon={<Plus size={13} />}>
                  +250 ml
                </Button>
              </div>
            </div>

            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', marginTop: '1rem' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.round((loggedWater / targetWater) * 100))}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38bdf8 0%, #0284c7 100%)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              <span>{loggedWater} L logged</span>
              <span>{Math.max(0, +(targetWater - loggedWater).toFixed(2))} L to goal</span>
            </div>
          </div>

          {/* Biometric Summary Pill */}
          <div className="card-waypilot" style={{ padding: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Metabolic Profile
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                  BMI: {calculatedBmi}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Normal Health Range</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>
                  BMR: {calculatedBmr}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>kcal / day basal</div>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              style={{ width: '100%' }}
              onClick={() => onNavigate('profile')}
            >
              Update Biometric Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
