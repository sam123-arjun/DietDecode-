import React, { useState } from 'react';
import {
  Info,
  Cpu,
  Database,
  Layers,
  Sparkles,
  Code2,
  CheckCircle2,
  Activity,
  Shield,
  Download,
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { ESP32CodeModal } from '../components/esp32/ESP32CodeModal';

export const AboutPage: React.FC = () => {
  const [showCodeModal, setShowCodeModal] = useState<boolean>(false);

  return (
    <div>
      <PageHeader
        title="About DietDecode"
        subtitle="Final-Year Engineering Project Documentation & Hardware Architecture."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCodeModal(true)}
            leftIcon={<Code2 size={16} />}
          >
            ESP32 Arduino Firmware (.ino)
          </Button>
        }
      />

      {/* Project Title Banner */}
      <div
        className="card-waypilot"
        style={{
          padding: '3rem 2.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <span className="badge chip-dark" style={{ marginBottom: '1.25rem' }}>
          Final Year Engineering Capstone
        </span>
        <h2 className="editorial-title" style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '1rem' }}>
          DIETDECODE: IoT-Based Personalized Diet <br />
          <span className="editorial-italic">Recommendation and Reminder System</span>
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '880px' }}>
          DietDecode is an integrated cyber-physical healthcare platform designed to solve the critical adherence gap in personalized nutrition. While mobile applications frequently suffer from user alert fatigue, DietDecode pairs a deterministic nutritional algorithm with a dedicated bedside or kitchen ESP32 IoT node featuring OLED readouts, multi-color LED cues, an audible piezo chime, and a tactile button acknowledgment interface.
        </p>
      </div>

      {/* 3 Pillars of DietDecode */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        <div className="card-waypilot" style={{ padding: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              color: '#7c3aed',
            }}
          >
            <Activity size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.65rem' }}>
            1. Algorithmic Nutrition
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Calculates personalized Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation and scales by physical activity level to determine exact Total Daily Energy Expenditure (TDEE). Distributes optimal macronutrients tailored to dietary preferences (Vegetarian, Vegan, Non-Vegetarian) and automatically eliminates allergens.
          </p>
        </div>

        <div className="card-waypilot" style={{ padding: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              color: '#059669',
            }}
          >
            <Cpu size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.65rem' }}>
            2. ESP32 Physical Node
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            A standalone WiFi microcontroller (NodeMCU ESP-WROOM-32) that communicates over HTTP/REST or WebSockets. It powers a crisp SSD1306 128x64 OLED display, an active piezoelectric buzzer, tri-color status LEDs, and a tactile switch with hardware pull-down interrupt debouncing.
          </p>
        </div>

        <div className="card-waypilot" style={{ padding: '2rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              color: '#0284c7',
            }}
          >
            <Database size={22} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.65rem' }}>
            3. Cloud Telemetry
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Real-time biometric persistence backed by Firebase Cloud Firestore and secure authentication. Adherence verification logs physical button clicks, calculates response latency in seconds, and provides long-term habit analytics.
          </p>
        </div>
      </div>

      {/* Hardware Pinout Specification Table */}
      <div className="card-waypilot" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.5rem', letterSpacing: '-0.01em' }}>
          Hardware Component & GPIO Pinout Specifications
        </h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Standard wiring topology used for physical verification on the breadboard prototype:
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-darkest)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Peripheral Component</th>
                <th style={{ padding: '0.75rem 1rem' }}>ESP32 GPIO Pin</th>
                <th style={{ padding: '0.75rem 1rem' }}>Interface Protocol</th>
                <th style={{ padding: '0.75rem 1rem' }}>Operational Behavior</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>0.96" SSD1306 OLED Display</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>GPIO 21 (SDA), GPIO 22 (SCL)</td>
                <td style={{ padding: '0.75rem 1rem' }}>I2C Bus (0x3C)</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Displays real-time meal name, scheduled time, and button prompts.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Piezoelectric Buzzer</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>GPIO 23</td>
                <td style={{ padding: '0.75rem 1rem' }}>PWM Signal</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Emits 2.4 kHz audible chime pulses during active alert window.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Tactile Push Button</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>GPIO 18</td>
                <td style={{ padding: '0.75rem 1rem' }}>Digital Input (Pull-Down)</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>User acknowledgment confirmation; debounced 50ms interrupt.</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Tri-Color Status LEDs</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>GPIO 5 (Grn), 4 (Blu), 15 (Red)</td>
                <td style={{ padding: '0.75rem 1rem' }}>Digital Output</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Green = Ready/Idle, Blue = Meal Alert Active, Red = Timeout Missed.</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>Power Rail</td>
                <td style={{ padding: '0.75rem 1rem', fontFamily: 'var(--font-mono)' }}>3V3 & GND</td>
                <td style={{ padding: '0.75rem 1rem' }}>Regulated DC</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Common voltage rail powering OLED screen and LED indicators.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <ESP32CodeModal isOpen={showCodeModal} onClose={() => setShowCodeModal(false)} />
    </div>
  );
};
