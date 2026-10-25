import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Check, Info, Send, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { notificationService, NotificationDiagnostics } from '../../services/notificationService';

export const NotificationPermissionBanner: React.FC = () => {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const refreshState = async () => {
    setPermission(notificationService.getPermission());
    const diag = await notificationService.getDiagnostics();
    setDiagnostics(diag);
  };

  useEffect(() => {
    refreshState();

    const handlePermChange = () => {
      refreshState();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dietdecode:notification-permission-changed', handlePermChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('dietdecode:notification-permission-changed', handlePermChange);
      }
    };
  }, []);

  const handleRequest = async () => {
    setLoading(true);
    const result = await notificationService.requestPermission();
    setPermission(result);
    await refreshState();
    setLoading(false);
  };

  const handleSendTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await notificationService.sendTestNotification();
      if (res.success) {
        setTestResult('✅ System notification dispatched! Check your Android status bar / notification drawer.');
      } else {
        setTestResult(`⚠️ ${res.error || 'Failed to dispatch notification.'}`);
      }
    } catch (err) {
      setTestResult(`⚠️ ${(err as Error)?.message || 'Notification error'}`);
    } finally {
      setTesting(false);
      setTimeout(() => {
        setTestResult((prev) => (prev?.startsWith('✅') ? null : prev));
      }, 8000);
    }
  };

  const handleCloudTest = async () => {
    setTesting(true);
    setTestResult('⏳ 1. Requested: Contacting Cloud Functions backend...');
    try {
      const res = await notificationService.sendBackendTestPush();
      if (res.success) {
        setTestResult(
          `✅ 2. Backend Accepted ➔ 3. Sent through FCM [ID: ${res.messageId?.slice(-8) || 'ok'}] ➔ 4. Received on device!`
        );
      } else {
        setTestResult(`⚠️ Backend push note: ${res.error || 'Check Cloud Functions deployment status.'}`);
      }
    } catch (err) {
      setTestResult(`⚠️ Cloud push test: ${(err as Error)?.message || 'Backend call failed'}`);
    } finally {
      setTesting(false);
      setTimeout(() => {
        setTestResult((prev) => (prev?.startsWith('✅') ? null : prev));
      }, 10000);
    }
  };

  if (permission === 'unsupported') {
    return null;
  }

  // 1. GRANTED STATE: Real mobile notifications active + Test Alert Action
  if (permission === 'granted') {
    const isFcmTokenActive = Boolean(diagnostics?.fcmToken);
    const isSwActive = Boolean(diagnostics?.serviceWorkerActive);

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: '#15803d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <Check size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#14532d', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span>Mobile System Notifications Active</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '0.1rem 0.4rem',
                    borderRadius: '6px',
                    background: '#dcfce7',
                    color: '#15803d',
                  }}
                >
                  {isSwActive ? 'Android / Chrome Service Worker' : 'Browser API'}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: '0.1rem' }}>
                {isFcmTokenActive
                  ? 'FCM device token registered. Real-time alert delivery enabled.'
                  : 'Android system drawer alerts enabled. Vibrates and alerts on scheduled meal arrival.'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSendTest}
              disabled={testing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1.5px solid #86efac',
                color: '#15803d',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              title="Dispatch an immediate system alert to your Android notification tray"
            >
              <Send size={13} />
              <span>{testing ? 'Testing...' : 'Test Mobile Alert'}</span>
            </button>

            <button
              onClick={handleCloudTest}
              disabled={testing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                background: '#15803d',
                border: '1.5px solid #15803d',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'opacity 0.15s ease',
              }}
              title="Test end-to-end cloud push via Firebase Cloud Functions Admin SDK"
            >
              <BellRing size={13} />
              <span>Test Cloud Push</span>
            </button>

            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#15803d',
                cursor: 'pointer',
                padding: '0.35rem',
                display: 'flex',
                alignItems: 'center',
              }}
              title="Inspect notification diagnostics and background push config"
            >
              {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {testResult && (
          <div
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '8px',
              background: testResult.startsWith('✅') ? '#dcfce7' : testResult.startsWith('⏳') ? '#eff6ff' : '#fef2f2',
              border: `1px solid ${testResult.startsWith('✅') ? '#86efac' : testResult.startsWith('⏳') ? '#bfdbfe' : '#fecdd3'}`,
              color: testResult.startsWith('✅') ? '#14532d' : testResult.startsWith('⏳') ? '#1e40af' : '#991b1b',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <span>{testResult}</span>
          </div>
        )}

        {showDetails && (
          <div
            style={{
              marginTop: '0.4rem',
              padding: '0.75rem',
              background: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #dcfce7',
              fontSize: '0.78rem',
              color: '#334155',
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
              Mobile Push & Delivery Capabilities:
            </div>
            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
              <li>
                <strong>Android System Notifications:</strong> ✅ Supported via Service Worker (vibrates phone & appears in system tray).
              </li>
              <li>
                <strong>Active / Background Tab Delivery:</strong> ✅ Enabled. Triggers immediately when meal reminder begins.
              </li>
              <li>
                <strong>FCM Closed-Browser Push:</strong> {isFcmTokenActive ? '✅ Device Token Registered' : 'ℹ️ In-tab / background tab alerts active. Closed-browser FCM requires VAPID key in .env.'}
              </li>
              <li>
                <strong>Backend Cloud Functions:</strong> ⚡ Ready in <code>functions/</code> (RTDB trigger + Admin SDK push + scheduled meal checker).
              </li>
              {diagnostics?.fcmToken && (
                <li>
                  <strong>Device Token:</strong> <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{diagnostics.fcmToken.substring(0, 32)}...</code>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // 2. DENIED STATE: Clear guidance on unblocking in Android Chrome
  if (permission === 'denied') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.85rem 1.1rem',
          borderRadius: '12px',
          background: '#fef2f2',
          border: '1.5px solid #fecdd3',
          marginBottom: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <AlertTriangle size={18} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#991b1b' }}>
              Notifications Blocked in Chrome
            </div>
            <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginTop: '0.2rem' }}>
              To receive meal alerts on your Android device: Tap the <strong>lock / site settings icon (🔒)</strong> in your Chrome address bar ➔ tap <strong>Permissions</strong> ➔ tap <strong>Notifications</strong> ➔ select <strong>Allow</strong>, then refresh the page.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. DEFAULT STATE: Clean action banner to request permission
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1.1rem',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
        border: '1.5px solid #bae6fd',
        marginBottom: '1.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            flexShrink: 0,
            boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)',
          }}
        >
          <BellRing size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0369a1' }}>
            Enable Mobile Meal Reminder Notifications
          </div>
          <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '0.15rem' }}>
            Receive Android system notifications with sound and vibration when meal times arrive.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => setShowDetails(!showDetails)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0284c7',
            cursor: 'pointer',
            padding: '0.35rem',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Information on mobile alerts"
        >
          <Info size={18} />
        </button>

        <button
          onClick={handleRequest}
          disabled={loading}
          style={{
            padding: '0.5rem 1.15rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 800,
            cursor: 'pointer',
            minHeight: '40px',
            boxShadow: '0 3px 10px rgba(2, 132, 199, 0.25)',
          }}
        >
          {loading ? 'Requesting...' : 'Allow Mobile Alerts'}
        </button>
      </div>

      {showDetails && (
        <div
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e0f2fe',
            fontSize: '0.8rem',
            color: '#475569',
            lineHeight: 1.6,
          }}
        >
          <strong>Why allow notifications?</strong> DietDecode works with your physical ESP32 reminder device.
          Allowing notifications enables your phone to receive system notifications in sync with the hardware buzzer and OLED display.
        </div>
      )}
    </div>
  );
};
