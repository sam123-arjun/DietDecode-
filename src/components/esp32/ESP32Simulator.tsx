import React, { useState } from 'react';
import {
  Cpu,
  Volume2,
  VolumeX,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Wifi,
} from 'lucide-react';
import { useESP32 } from '../../context/ESP32Context';
import { useDiet } from '../../context/DietContext';
import { useAuth } from '../../context/AuthContext';
import { Reminder } from '../../types';
import { Button } from '../common/Button';
import { RemoteBuzzerControl } from '../common/RemoteBuzzerControl';
import { ESP32CodeModal } from './ESP32CodeModal';

interface ESP32SimulatorProps {
  compact?: boolean;
}

export const ESP32Simulator: React.FC<ESP32SimulatorProps> = ({ compact = false }) => {
  const { user } = useAuth();
  const {
    deviceState,
    isMuted,
    toggleBuzzerMute,
    pressPhysicalButton,
    triggerMissedTimeout,
    triggerTestReminder,
    iotMode,
    deviceId,
  } = useESP32();
  const {
    reminders,
    currentTime,
    updateReminderStatus,
    activeReminder,
  } = useDiet();
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const fallbackReminder: Reminder = {
    id: `rem_test_${Date.now()}`,
    userId: user?.id || 'usr_demo_882',
    mealId: 'meal_1',
    mealName: 'Nutrient Dense Lunch',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: 'active',
    enabled: true,
    acknowledged: false,
    scheduledTimestamp: Date.now(),
    itemsSummary: 'Grilled Chicken, Brown Rice, Steamed Veggies',
  };

  const activeOrUpcoming =
    activeReminder ||
    reminders.find((r) => r.status === 'active') ||
    reminders.find((r) => r.status === 'upcoming') ||
    reminders[0] ||
    fallbackReminder;

  // In Firebase cloud mode, the physical ESP32 state in RTDB is authoritative.
  // When physical button, LDR, or cloud acknowledgement stops the alert, isAlertActive becomes false.
  // In local mode, fallback to local reminders if bridge is offline.
  const isAlertActive =
    iotMode === 'firebase'
      ? deviceState.currentState === 'REMINDER_ACTIVE'
      : (deviceState.currentState === 'REMINDER_ACTIVE' || Boolean(activeReminder) || reminders.some((r) => r.status === 'active'));

  const handleButtonPress = async () => {
    setIsPressing(true);
    try {
      const targetUserId = user?.id || 'usr_demo_882';
      const targetId = activeReminder?.id || deviceState.activeReminderId || activeOrUpcoming?.id;
      
      // 1. Immediately update DietContext React state and trigger confetti
      if (targetId) {
        await updateReminderStatus(targetId, 'completed', false);
      }

      // 2. Transmit physical acknowledgement to ESP32 hardware and Firebase RTDB
      await pressPhysicalButton(targetUserId, targetId);
    } catch (err) {
      console.error('[ESP32 UI] Error acknowledging reminder:', err);
    } finally {
      setTimeout(() => setIsPressing(false), 200);
    }
  };

  const handleTriggerTest = async () => {
    setIsTriggering(true);
    setAlertError(null);
    const targetUserId = user?.id || 'usr_demo_882';
    const targetReminder = activeOrUpcoming;
    
    // Set reminder as active in DietContext so both web banner and hardware alert
    if (targetReminder.id) {
      await updateReminderStatus(targetReminder.id, 'active', false);
    }
    
    const result = await triggerTestReminder(targetReminder, targetUserId);
    if (!result.success) {
      setAlertError(result.error || 'Failed to send alert to physical device.');
    }
    setIsTriggering(false);
  };

  const handleSimulateMissed = async () => {
    try {
      const targetUserId = user?.id || 'usr_demo_882';
      const targetId = activeReminder?.id || deviceState.activeReminderId || activeOrUpcoming?.id;
      if (targetId) {
        await updateReminderStatus(targetId, 'missed', false);
      }
      await triggerMissedTimeout(targetUserId, targetId);
    } catch (err) {
      console.error('[ESP32 UI] Error simulating missed reminder:', err);
    }
  };

  return (
    <div className="esp32-enclosure" style={{ width: '100%' }}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Cpu size={20} color="var(--cyan-primary)" />
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-pure)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>ESP32 Physical IoT Reminder</span>
              <span className="badge badge-upcoming" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                NodeMCU ESP-WROOM-32
              </span>
            </div>
            <div className="esp32-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
              <span style={{ color: deviceState.connected ? 'var(--green-accent)' : '#f87171', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Wifi size={12} /> {iotMode === 'firebase' ? 'FIREBASE' : 'LOCAL REST'}
              </span>
              <span>• Device: {deviceId}</span>
              <span>• {deviceState.connected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={toggleBuzzerMute}
            className="btn btn-outline btn-sm"
            style={{ padding: '0.35rem 0.65rem' }}
            title={isMuted ? 'Unmute Piezo Buzzer' : 'Mute Piezo Buzzer'}
            aria-label="Toggle buzzer sound"
          >
            {isMuted ? <VolumeX size={15} color="#f87171" /> : <Volume2 size={15} color="var(--cyan-primary)" />}
          </button>

          <button
            onClick={() => setShowCodeModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.35rem 0.75rem' }}
            title="Inspect & Copy Arduino C++ Firmware Sketch"
          >
            <Code2 size={15} /> {!compact && 'Firmware .ino'}
          </button>
        </div>
      </div>

      {/* Main Hardware Layout: OLED Screen + Hardware Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem',
          alignItems: 'center',
        }}
      >
        {/* Physical 128x64 SSD1306 OLED Screen */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <span>OLED SSD1306 (128×64)</span>
            <span>I2C: GPIO 21 (SDA), 22 (SCL)</span>
          </div>
          <div className="oled-screen" aria-label="ESP32 OLED Display">
            <div className="oled-line-title">
              <span>{deviceState.oledDisplay.line1}</span>
              <span style={{ fontSize: '0.7rem', color: '#38bdf8' }}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <div className="oled-line-meal">
              {deviceState.oledDisplay.line2}
            </div>
            <div className="oled-line-msg">
              {deviceState.oledDisplay.line3}
            </div>
            <div className="oled-line-action">
              {deviceState.oledDisplay.line4}
            </div>
          </div>
        </div>

        {/* Physical Components: LEDs, Buzzer, Tactile Push Button */}
        <div
          style={{
            background: 'rgba(5, 10, 16, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
          }}
        >
          {/* LED Indicators & Buzzer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
            {/* Green LED (GPIO 5) */}
            <div style={{ textAlign: 'center' }}>
              <div
                className={`hardware-led led-green ${deviceState.leds.green ? 'active' : ''}`}
                style={{ margin: '0 auto 0.35rem' }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                READY
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>GPIO 5</div>
            </div>

            {/* Blue LED (GPIO 4) */}
            <div style={{ textAlign: 'center' }}>
              <div
                className={`hardware-led led-blue ${deviceState.leds.blue ? 'active' : ''}`}
                style={{ margin: '0 auto 0.35rem' }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                ALERT
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>GPIO 4</div>
            </div>

            {/* Red LED (GPIO 15) */}
            <div style={{ textAlign: 'center' }}>
              <div
                className={`hardware-led led-red ${deviceState.leds.red ? 'active' : ''}`}
                style={{ margin: '0 auto 0.35rem' }}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                MISSED
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>GPIO 15</div>
            </div>

            {/* Piezo Buzzer (GPIO 23) */}
            <div style={{ textAlign: 'center' }}>
              <div
                className={`buzzer-grill ${deviceState.buzzerActive ? 'active' : ''}`}
                style={{ margin: '0 auto 0.35rem' }}
                title="Buzzer GPIO 23"
              >
                <span className="buzzer-hole" />
                <span className="buzzer-hole" />
                <span className="buzzer-hole" />
                <span className="buzzer-hole" />
                <span className="buzzer-hole" />
                <span className="buzzer-hole" />
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                BUZZER
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b' }}>GPIO 23</div>
            </div>
          </div>

          {/* Physical Push Button (GPIO 18) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              border: '1px solid rgba(255, 255, 255, 0.04)',
            }}
          >
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-pure)' }}>
                Physical Push Button
              </div>
              <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)' }}>
                GPIO 18 (INPUT_PULLDOWN)
              </div>
              <div style={{ fontSize: '0.7rem', color: isAlertActive ? '#e11d48' : '#38bdf8', marginTop: '0.2rem', fontWeight: 600 }}>
                {isAlertActive
                  ? '⚡ Press to Acknowledge Meal!'
                  : 'Ready for reminder signal'}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className="tactile-button"
                onClick={handleButtonPress}
                style={{
                  transform: isPressing ? 'translateY(3px)' : 'none',
                  borderColor: isAlertActive ? '#e11d48' : '#3b4e68',
                }}
                aria-label="Push Button to acknowledge meal reminder"
                title="Click to simulate pressing the ESP32 physical push button"
              >
                <div
                  className="tactile-button-inner"
                  style={{
                    boxShadow: isAlertActive ? '0 0 16px #e11d48' : 'none',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Simulator Control Action Buttons */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '0.9rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          State:{' '}
          <strong style={{ color: isAlertActive ? 'var(--cyan-primary)' : deviceState.currentState === 'MISSED' ? '#ef4444' : 'var(--green-accent)' }}>
            {deviceState.currentState}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="primary"
            onClick={handleTriggerTest}
            isLoading={isTriggering}
            leftIcon={<Play size={14} />}
            title="Trigger a meal reminder on the ESP32 right now"
          >
            Trigger Meal Alarm
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleButtonPress}
            leftIcon={<CheckCircle2 size={14} />}
            disabled={!isAlertActive}
            title="Simulate pressing the physical button on GPIO 18"
          >
            Physical Button (GPIO 18)
          </Button>

          <RemoteBuzzerControl compact activeReminder={activeReminder || (isAlertActive ? activeOrUpcoming : null)} />

          <Button
            size="sm"
            variant="danger"
            onClick={handleSimulateMissed}
            leftIcon={<AlertTriangle size={14} />}
            disabled={!isAlertActive}
            title="Simulate user missing the reminder grace period"
          >
            Timeout (Missed)
          </Button>
        </div>
      </div>

      {deviceState.lastError && (
        <div
          style={{
            marginTop: '0.85rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          <span><strong>Cloud RTDB Notice:</strong> {deviceState.lastError}</span>
        </div>
      )}

      {alertError && (
        <div
          role="alert"
          style={{
            marginTop: '0.65rem',
            padding: '0.6rem 0.85rem',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
          <span>
            <strong style={{ color: '#f87171' }}>Test Alert failed — physical device NOT notified.</strong>
            {' '}{alertError}
          </span>
        </div>
      )}


      {/* Arduino Firmware Code Inspector Modal */}
      <ESP32CodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} />
    </div>
  );
};
