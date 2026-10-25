import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  RotateCcw,
  Volume2,
  VolumeX,
  Cpu,
  Wifi,
  Database,
  CheckCircle2,
  Save,
  Server,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { useAuth } from '../context/AuthContext';
import { useESP32 } from '../context/ESP32Context';
import { AppSettings } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

export const SettingsPage: React.FC = () => {
  const { settings, saveSettings, resetAllData } = useDiet();
  const { isLiveFirebase } = useAuth();
  const { isMuted, toggleBuzzerMute } = useESP32();

  const [formData, setFormData] = useState<AppSettings>(settings);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = async () => {
    if (window.confirm('Reset all DietDecode data to initial demo state? This will reseed meals, reminders, and profile.')) {
      await resetAllData();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div>
      <PageHeader
        title="System Settings & Node Configuration"
        subtitle="Manage hardware timing thresholds, buzzer audio frequencies, and data persistence modes."
      />

      {saveSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            color: '#047857',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.75rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          <span>Configuration saved successfully!</span>
        </div>
      )}

      {resetSuccess && (
        <div
          style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            color: '#0369a1',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '1.75rem',
            fontWeight: 600,
          }}
        >
          <RotateCcw size={18} />
          <span>All meal schedules, reminders, and history successfully reset to clean seed state!</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          {/* Card 1: Reminder & Timing Parameters */}
          <div className="card-waypilot" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '-0.01em' }}>
              <Cpu size={20} color="#7c3aed" />
              <span>Reminder & Hardware Timing</span>
            </h3>

            <div className="form-group">
              <label className="form-label">Active Reminder Timeout (Seconds)</label>
              <input
                type="number"
                className="form-input"
                value={formData.reminderDurationSeconds || 300}
                onChange={(e) => setFormData({ ...formData, reminderDurationSeconds: Number(e.target.value) })}
                min={30}
                max={3600}
                step={30}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                How long the piezo buzzer and alert state stay active before timing out to missed (default: 300s).
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Snooze Duration (Minutes)</label>
              <input
                type="number"
                className="form-input"
                value={formData.snoozeDurationMinutes || 5}
                onChange={(e) => setFormData({ ...formData, snoozeDurationMinutes: Number(e.target.value) })}
                min={1}
                max={30}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Delay added when hardware push-button is double-tapped.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', marginTop: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-darkest)' }}>
                  Hardware Buzzer Sound
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Mute audio chime in browser simulator.
                </div>
              </div>

              <Button
                type="button"
                variant={isMuted ? 'outline' : 'secondary'}
                size="sm"
                onClick={toggleBuzzerMute}
                leftIcon={isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              >
                {isMuted ? 'Muted' : 'Audible'}
              </Button>
            </div>
          </div>

          {/* Card 2: Device Pairing & Data Mode */}
          <div className="card-waypilot" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', letterSpacing: '-0.01em' }}>
              <Server size={20} color="#059669" />
              <span>ESP32 Device Node Link</span>
            </h3>

            <div className="form-group">
              <label className="form-label">ESP32 REST API / Polling Endpoint</label>
              <input
                type="text"
                className="form-input"
                value={formData.esp32Endpoint || 'http://192.168.1.100/api'}
                onChange={(e) => setFormData({ ...formData, esp32Endpoint: e.target.value })}
                placeholder="http://192.168.1.100/api"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Endpoint where ESP32 polls for current alerts and pushes tactile button confirmations.
              </span>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-darkest)' }}>
                Backend Persistence State:
              </div>
              <div style={{ fontSize: '0.8rem', color: isLiveFirebase ? '#059669' : '#0284c7', marginTop: '0.2rem', fontWeight: 600 }}>
                {isLiveFirebase ? '● Live Firebase Cloud Firestore' : '● In-Memory / Local Demo Mode'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <Button
            variant="danger"
            size="md"
            type="button"
            onClick={handleReset}
            leftIcon={<RotateCcw size={15} />}
          >
            Reset to Demo Seed Data
          </Button>

          <Button
            variant="primary"
            size="md"
            type="submit"
            leftIcon={<Save size={15} />}
          >
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
