import React, { useState, useEffect } from 'react';
import { VolumeX, CheckCircle2, AlertCircle, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { useESP32 } from '../../context/ESP32Context';
import { Reminder } from '../../types';

interface RemoteBuzzerControlProps {
  activeReminder?: Reminder | null;
  compact?: boolean;
}

export const RemoteBuzzerControl: React.FC<RemoteBuzzerControlProps> = ({
  activeReminder,
  compact = false,
}) => {
  const { deviceState, remoteAcknowledge } = useESP32();
  const [actionState, setActionState] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Automatically clear any stale error or confirmed state when the active reminder changes
  // or when the hardware device transitions away from REMINDER_ACTIVE
  useEffect(() => {
    setActionState('idle');
    setStatusMessage(null);
  }, [activeReminder?.id, deviceState.activeReminderId, deviceState.currentState]);

  const effectiveReminderId = activeReminder?.id || deviceState.activeReminderId;
  const isReminderActive = Boolean(
    activeReminder || deviceState.currentState === 'REMINDER_ACTIVE' || deviceState.buzzerActive
  );
  const isConnected = deviceState.connected;

  const handleRemoteAck = async () => {
    if (!isReminderActive || !isConnected || actionState === 'pending') return;

    setActionState('pending');
    setStatusMessage('Transmitting command to ESP32...');

    try {
      const res = await remoteAcknowledge(effectiveReminderId);

      if (res.success && res.status === 'CONFIRMED') {
        setActionState('confirmed');
        setStatusMessage('ESP32 confirmed: Buzzer stopped & meal acknowledged!');
        setTimeout(() => {
          setActionState('idle');
          setStatusMessage(null);
        }, 4500);
      } else if (res.status === 'OFFLINE') {
        setActionState('failed');
        setStatusMessage(res.error || 'ESP32 is offline. Check hardware Wi-Fi connection.');
      } else if (res.status === 'TIMEOUT') {
        setActionState('failed');
        setStatusMessage(res.error || 'ESP32 verification timeout (no response within 8s).');
      } else {
        setActionState('failed');
        setStatusMessage(res.error || 'Command failed: ESP32 rejected acknowledgement.');
      }
    } catch (err) {
      setActionState('failed');
      setStatusMessage((err as Error)?.message || 'Network error sending command to ESP32.');
    }
  };

  // 1. OFFLINE STATE
  if (!isConnected) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: compact ? '0.5rem 0.85rem' : '0.65rem 1.1rem',
          borderRadius: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          color: '#64748b',
          fontSize: compact ? '0.82rem' : '0.9rem',
          fontWeight: 600,
        }}
      >
        <WifiOff size={16} style={{ color: '#94a3b8' }} />
        <span>ESP32 Offline (Remote Control Unavailable)</span>
      </div>
    );
  }

  // 2. NO ACTIVE REMINDER STATE
  if (!isReminderActive && actionState === 'idle') {
    return (
      <button
        disabled
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: compact ? '0.5rem 0.85rem' : '0.65rem 1.1rem',
          borderRadius: '12px',
          background: '#f1f5f9',
          border: '1px solid #cbd5e1',
          color: '#94a3b8',
          fontSize: compact ? '0.85rem' : '0.92rem',
          fontWeight: 600,
          cursor: 'not-allowed',
          minHeight: '44px',
        }}
        title="Remote buzzer stop is only available when a reminder is active"
      >
        <VolumeX size={16} />
        <span>Buzzer Silent (No Reminder Active)</span>
      </button>
    );
  }

  // 3. CONFIRMED STATE
  if (actionState === 'confirmed') {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: compact ? '0.5rem 0.85rem' : '0.65rem 1.2rem',
          borderRadius: '12px',
          background: '#ecfdf5',
          border: '1.5px solid #10b981',
          color: '#065f46',
          fontSize: compact ? '0.85rem' : '0.92rem',
          fontWeight: 700,
          minHeight: '44px',
          animation: 'fadeIn 0.2s ease-in-out',
        }}
      >
        <CheckCircle2 size={18} style={{ color: '#059669' }} />
        <span>Confirmed • Buzzer Stopped</span>
      </div>
    );
  }

  // 4. FAILED / TIMEOUT STATE
  if (actionState === 'failed') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: compact ? '0.5rem 0.85rem' : '0.6rem 1rem',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1.5px solid #f87171',
            color: '#991b1b',
            fontSize: compact ? '0.82rem' : '0.88rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
          <span>{statusMessage || 'Command failed'}</span>
          <button
            onClick={() => setActionState('idle')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#dc2626',
              padding: '0 0.3rem',
              display: 'inline-flex',
              alignItems: 'center',
            }}
            title="Retry remote command"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    );
  }

  // 5. PENDING STATE
  if (actionState === 'pending') {
    return (
      <button
        disabled
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.6rem',
          padding: compact ? '0.5rem 1rem' : '0.7rem 1.35rem',
          borderRadius: '12px',
          background: '#fef3c7',
          border: '1.5px solid #f59e0b',
          color: '#92400e',
          fontSize: compact ? '0.85rem' : '0.95rem',
          fontWeight: 700,
          cursor: 'wait',
          minHeight: '44px',
        }}
      >
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Pending (ESP32 verifying...)</span>
      </button>
    );
  }

  // 6. ACTIVE / READY TO ACKNOWLEDGE ACTION
  return (
    <button
      onClick={handleRemoteAck}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: compact ? '0.55rem 1.1rem' : '0.75rem 1.4rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 4px 14px rgba(225, 29, 72, 0.35)',
        fontSize: compact ? '0.88rem' : '0.98rem',
        fontWeight: 800,
        letterSpacing: '0.01em',
        cursor: 'pointer',
        minHeight: '48px', // Excellent mobile touch target
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 6px 18px rgba(225, 29, 72, 0.45)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(225, 29, 72, 0.35)';
      }}
      title="Stop the ESP32 Piezo buzzer and confirm meal acknowledgement"
    >
      <VolumeX size={18} />
      <span>Acknowledge / Stop Buzzer</span>
    </button>
  );
};
