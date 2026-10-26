import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Cpu,
  Wifi,
  Volume2,
  AlertTriangle,
  History,
  Activity,
  Zap,
  Timer,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { useAuth } from '../context/AuthContext';
import { useESP32 } from '../context/ESP32Context';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ESP32Simulator } from '../components/esp32/ESP32Simulator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { AppPage } from '../components/common/Sidebar';
import { RemoteBuzzerControl } from '../components/common/RemoteBuzzerControl';
import { NotificationPermissionBanner } from '../components/common/NotificationPermissionBanner';
import {
  formatTime12Hour,
  getTimeRemaining,
  formatGraceCountdown,
  parseTimeToTodayTimestamp,
} from '../utils/timeUtils';

interface RemindersPageProps {
  onNavigate: (page: AppPage) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    reminders,
    updateReminderStatus,
    loading,
    currentTime,
    activeGraceRemainingSeconds,
    triggerQuickTestReminder,
    scheduleNextWaterReminder,
    triggerQuickWaterTest,
    hourlyWaterRemindersEnabled,
    setHourlyWaterRemindersEnabled,
    activeReminder,
    nextReminder,
  } = useDiet();
  const { triggerTestReminder, pressPhysicalButton, triggerMissedTimeout, deviceState } = useESP32();
  const [alertError, setAlertError] = useState<string | null>(null);
  const [reminderAlertErrors, setReminderAlertErrors] = useState<Record<string, string | null>>({});
  const [isQuickTesting, setIsQuickTesting] = useState<boolean>(false);
  const [isSchedulingWater, setIsSchedulingWater] = useState<boolean>(false);
  const [isTestingWater, setIsTestingWater] = useState<boolean>(false);
  const [testingReminderId, setTestingReminderId] = useState<string | null>(null);

  const effectiveActiveReminder = useMemo(() => {
    if (activeReminder) return activeReminder;
    const activeInList = reminders.find((r) => r.status === 'active');
    if (activeInList) return activeInList;

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
    setAlertError(null);
    setReminderAlertErrors((prev) => ({ ...prev, [reminder.id]: null }));

    try {
      await Promise.race([
        (async () => {
          // Explicitly update reminder status to 'active' so DietContext activeReminder
          // and the spotlight banner bind to this exact reminder
          await updateReminderStatus(reminder.id, 'active');

          const result = await triggerTestReminder(reminder, user?.id || 'usr_demo_882');
          if (!result.success) {
            setAlertError(result.error || 'Failed to alert device.');
            setReminderAlertErrors((prev) => ({ ...prev, [reminder.id]: result.error || 'Failed to alert device.' }));
          }
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Device alert request timed out. Please check device connectivity.')), 4500)
        ),
      ]);
    } catch (err) {
      const msg = (err as Error)?.message || 'Failed to alert device.';
      setAlertError(msg);
      setReminderAlertErrors((prev) => ({ ...prev, [reminder.id]: msg }));
    } finally {
      setTestingReminderId(null);
    }
  };

  const handleQuickTest = async () => {
    setIsQuickTesting(true);
    try {
      await triggerQuickTestReminder(10, 'Live 10s Demo Alert');
    } finally {
      setTimeout(() => setIsQuickTesting(false), 1000);
    }
  };

  const handleScheduleWater = async () => {
    setIsSchedulingWater(true);
    try {
      await scheduleNextWaterReminder(1);
    } finally {
      setIsSchedulingWater(false);
    }
  };

  const handleTestWater = async () => {
    setIsTestingWater(true);
    try {
      await triggerQuickWaterTest();
    } finally {
      setTimeout(() => setIsTestingWater(false), 1200);
    }
  };

  if (loading && !reminders.length) {
    return <LoadingSpinner message="Loading smart reminder queue..." />;
  }

  return (
    <div>
      <PageHeader
        title="Smart Reminders & Hardware Hub"
        subtitle="Manage upcoming alerts and simulate or control the physical ESP32 reminder node."
        badge={
          <span
            className="badge chip-emerald"
            style={{ fontSize: '0.75rem' }}
          >
            ● State: {deviceState.currentState}
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('history')}
            leftIcon={<History size={14} />}
          >
            View History
          </Button>
        }
      />

      {/* Browser Notification Permission Banner */}
      <NotificationPermissionBanner />

      {/* Top Banner: Next Reminder Spotlight / Active Alert */}
      <div
        className="card-waypilot"
        style={{
          padding: '2.5rem',
          marginBottom: '2.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
          borderLeft: activeReminder ? '6px solid #e11d48' : '6px solid #7c3aed',
          background: effectiveActiveReminder ? 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)' : '#ffffff',
        }}
      >
        <div>
          {effectiveActiveReminder ? (
            <span
              className="badge chip-rose"
              style={{
                marginBottom: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              <Bell size={13} />
              ALERT ACTIVE NOW • PIEZO BUZZER PULSING
            </span>
          ) : (
            <span className="badge chip-violet" style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={13} />
              Next Scheduled Reminder
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.85rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em', margin: 0 }}>
              {effectiveActiveReminder
                ? effectiveActiveReminder.mealName
                : nextReminder
                ? nextReminder.mealName
                : 'All Meals Completed Today'}
            </h2>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.4rem',
                color: effectiveActiveReminder ? '#b91c1c' : 'var(--text-darkest)',
                fontWeight: 800,
                background: effectiveActiveReminder ? '#fee2e2' : '#f1f5f9',
                border: effectiveActiveReminder ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                padding: '0.2rem 0.65rem',
                borderRadius: '10px',
                letterSpacing: '0.02em',
              }}
            >
              {effectiveActiveReminder
                ? formatTime12Hour(effectiveActiveReminder.time)
                : nextReminder
                ? formatTime12Hour(nextReminder.time)
                : '--:--'}
            </span>

            {/* Live real-time ticking countdown badge */}
            {effectiveActiveReminder ? (
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  color: '#991b1b',
                  fontWeight: 800,
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Timer size={14} />
                {formatGraceCountdown(activeGraceRemainingSeconds ?? 60)} Remaining
              </span>
            ) : nextReminder ? (
              (() => {
                const countdown = getTimeRemaining(
                  parseTimeToTodayTimestamp(nextReminder.time, currentTime),
                  currentTime.getTime()
                );
                return (
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.95rem',
                      color: countdown.isDueNow ? '#b91c1c' : '#7c3aed',
                      fontWeight: 700,
                      background: countdown.isDueNow ? '#fee2e2' : '#f5f3ff',
                      border: countdown.isDueNow ? '1px solid #fecdd3' : '1px solid #ddd6fe',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                    }}
                  >
                    <Clock size={14} />
                    {countdown.isDueNow ? 'Due Now (Alerting)' : countdown.formatted}
                  </span>
                );
              })()
            ) : null}
          </div>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            {effectiveActiveReminder
              ? 'ESP32 controller is currently buzzing and OLED displays this meal. Acknowledge on hardware or tap button below to log your meal before the grace timeout.'
              : 'Our dynamic real-time engine monitors your local schedule every second. When meal time arrives, your ESP32 illuminates the LED, rings the Piezo buzzer, and streams the meal onto the OLED screen.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {effectiveActiveReminder ? (
                <>
                  <RemoteBuzzerControl activeReminder={effectiveActiveReminder} />
                  <Button
                    variant="outline"
                    size="md"
                    onClick={() => updateReminderStatus(effectiveActiveReminder.id, 'completed', false)}
                    leftIcon={<CheckCircle2 size={16} />}
                  >
                    Local App Log Only
                  </Button>
                </>
              ) : (
                <>
                  <RemoteBuzzerControl activeReminder={null} />
                  {nextReminder && (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleTestAlert(nextReminder)}
                      isLoading={testingReminderId === nextReminder.id}
                      leftIcon={<Play size={16} />}
                    >
                      Send Instant Test Alert
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleQuickTest}
                    isLoading={isQuickTesting}
                    leftIcon={<Zap size={16} />}
                  >
                    ⚡ Test 10s Countdown
                  </Button>
                  <Button
                    variant="outline"
                    size="md"
                    onClick={handleTestWater}
                    isLoading={isTestingWater}
                    leftIcon={<span style={{ fontSize: '1rem' }}>💧</span>}
                  >
                    Test Water Alert (10s)
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleScheduleWater}
                    isLoading={isSchedulingWater}
                    leftIcon={<span style={{ fontSize: '1rem' }}>⏰</span>}
                  >
                    +1 Hour Water Alert
                  </Button>
                </>
              )}
            </div>

            {/* Hourly Hydration Tracker Banner */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(56, 189, 248, 0.04) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(2, 132, 199, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                  }}
                >
                  💧
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0369a1', fontSize: '0.95rem' }}>
                    Hourly Hydration Reminders
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Alerts your ESP32 buzzer and phone every 1 hour to drink 250ml water. Automatically notifies if missed.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Button
                  variant={hourlyWaterRemindersEnabled ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setHourlyWaterRemindersEnabled(!hourlyWaterRemindersEnabled)}
                >
                  {hourlyWaterRemindersEnabled ? '● Hourly Alerts ON' : '○ Enable Hourly Alerts'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleScheduleWater}
                  isLoading={isSchedulingWater}
                >
                  💧 Schedule in 1 Hour
                </Button>
              </div>
            </div>

            {alertError && (
              <div
                role="alert"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  color: '#b91c1c',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  maxWidth: '480px',
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                <span><strong>Device not alerted:</strong> {alertError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Status Callout Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-darkest)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Live Node Telemetry</span>
            <span style={{ color: '#059669', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              ● Live Engine Active
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>System Clock:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-darkest)' }}>
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>WiFi Connection:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-darkest)' }}>
              Connected ({deviceState.ipAddress})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Current State:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: activeReminder ? '#e11d48' : '#059669' }}>
              {deviceState.currentState}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Buzzer PWM:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-darkest)' }}>
              {deviceState.buzzerActive ? 'PULSING (2.4 kHz)' : 'ARMED / IDLE'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Interrupt Pin:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-darkest)' }}>
              GPIO 18 (PULLDOWN)
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Optical Trigger (LDR):</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-darkest)' }}>
              GPIO 19 ({deviceState.telemetry?.light ? deviceState.telemetry.light : 'INPUT'})
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Ambient Temp (DHT22):</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#ea580c' }}>
              {deviceState.telemetry?.temperature !== null && deviceState.telemetry?.temperature !== undefined
                ? `${deviceState.telemetry.temperature.toFixed(1)} °C`
                : deviceState.connected ? 'Reading...' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Humidity (DHT22):</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#0284c7' }}>
              {deviceState.telemetry?.humidity !== null && deviceState.telemetry?.humidity !== undefined
                ? `${deviceState.telemetry.humidity.toFixed(1)} % RH`
                : deviceState.connected ? 'Reading...' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Light State (LDR):</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: deviceState.telemetry?.light === 'DARK' ? '#6366f1' : '#eab308' }}>
              {deviceState.telemetry?.light || (deviceState.connected ? 'Reading...' : 'Offline')}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Telemetry Freshness:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#059669', fontSize: '0.78rem' }}>
              {(() => {
                if (!deviceState.connected) return 'Disconnected';
                if (!deviceState.telemetry?.timestamp) return 'Awaiting broadcast';
                const ageSec = Math.max(0, Math.floor((Date.now() - deviceState.telemetry.timestamp) / 1000));
                if (ageSec > 60) return `Stale (${Math.floor(ageSec / 60)}m ago)`;
                if (ageSec <= 5) return 'Live (syncing)';
                return `${ageSec}s ago`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Reminders List (Left) + ESP32 Live Simulator (Right) */}
      <div className="grid-dashboard-main">
        {/* Left Column: Reminders Queue */}
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Daily Reminder Queue
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {reminders.map((reminder) => {
              const schedTs = parseTimeToTodayTimestamp(reminder.time, currentTime);
              const countdown = getTimeRemaining(schedTs, currentTime.getTime());
              const isActive = reminder.status === 'active';
              const isCompleted = reminder.status === 'completed';
              const isMissed = reminder.status === 'missed';
              const isUpcoming = reminder.status === 'upcoming';

              return (
                <div
                  key={reminder.id}
                  className="card-waypilot"
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderLeft: `4px solid ${
                      isCompleted
                        ? '#059669'
                        : isActive
                        ? '#2563eb'
                        : isMissed
                        ? '#e11d48'
                        : '#cbd5e1'
                    }`,
                    background: isActive ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: isActive ? '#1d4ed8' : 'var(--text-darkest)',
                        background: isActive ? '#dbeafe' : '#f1f5f9',
                        border: isActive ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime12Hour(reminder.time)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                          {reminder.mealName}
                        </h4>
                        {isActive && (
                          <span className="badge chip-rose" style={{ fontSize: '0.75rem' }}>
                            🔔 ALERTING • {formatGraceCountdown(activeGraceRemainingSeconds ?? 60)} left
                          </span>
                        )}
                        {isUpcoming && (
                          <span
                            className="badge chip-sky"
                            style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Clock size={11} />
                            {countdown.isDueNow ? 'Due Now' : countdown.formatted}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="badge chip-completed" style={{ fontSize: '0.75rem' }}>
                            ✓ Completed
                          </span>
                        )}
                        {isMissed && (
                          <span className="badge chip-rose" style={{ fontSize: '0.75rem' }}>
                            ⚠ Missed
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Status: <strong style={{ textTransform: 'uppercase' }}>{reminder.status}</strong>
                        {reminder.acknowledgedAt && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)' }}>
                            • Logged at {new Date(reminder.acknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestAlert(reminder)}
                        isLoading={testingReminderId === reminder.id}
                        leftIcon={<Play size={13} />}
                      >
                        Test Alert
                      </Button>
                      {reminder.status !== 'completed' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => updateReminderStatus(reminder.id, 'completed', false)}
                          leftIcon={<CheckCircle2 size={13} />}
                        >
                          Acknowledge
                        </Button>
                      )}
                    </div>
                    {reminderAlertErrors[reminder.id] && (
                      <div
                        role="alert"
                        style={{
                          padding: '0.3rem 0.5rem',
                          borderRadius: '5px',
                          background: '#fef2f2',
                          border: '1px solid #fecdd3',
                          color: '#b91c1c',
                          fontSize: '0.72rem',
                          display: 'flex',
                          gap: '0.35rem',
                          maxWidth: '260px',
                        }}
                      >
                        <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                        <span>{reminderAlertErrors[reminder.id]}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Hardware Simulator */}
        <div>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Hardware Control Node
          </h3>
          <ESP32Simulator compact={true} />
        </div>
      </div>
    </div>
  );
};
