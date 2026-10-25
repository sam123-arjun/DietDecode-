import React, { useState } from 'react';
import { Cpu, ArrowRight, Laptop, Database, Bell, Radio, CheckCircle, Volume2, Lightbulb, Code2, Sparkles } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';

interface ConnectedDeviceSectionProps {
  onOpenFirmware: () => void;
}

export const ConnectedDeviceSection: React.FC<ConnectedDeviceSectionProps> = ({
  onOpenFirmware,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(1); // Default to Step 02 (Automate / Compute) as in screenshot!

  const pipeline = [
    {
      step: '01',
      label: 'Intake',
      title: 'Biometric Intake Web App',
      subtitle: 'React 18 + TypeScript Client',
      desc: 'Users input biometric vitals, dietary restrictions, and meal schedule preferences. Formulates personalized nutrition objectives.',
      icon: <Laptop size={20} color="#e11d48" />,
      detail: 'Validates height, weight, activity multipliers, and food allergies to establish custom daily dietary constraints.',
    },
    {
      step: '02',
      label: 'Automate',
      title: 'Autonomous Metabolic Computation',
      subtitle: 'Mifflin-St Jeor Engine + Cloud Queue',
      desc: 'Real-time algorithm calculates exact BMR/TDEE targets, splits macronutrients, and registers circadian reminder events.',
      icon: <Database size={20} color="#e11d48" />,
      detail: 'Automates scheduling for Breakfast, Lunch, Snack, and Dinner. Emits synchronized alert states across cloud endpoints.',
    },
    {
      step: '03',
      label: 'Sync',
      title: 'FreeRTOS ESP32 Microcontroller',
      subtitle: 'Dual-Core Tensilica Xtensa 240MHz',
      desc: 'IoT device connects securely to WiFi and polls local REST endpoints every 10 seconds for active meal alerts.',
      icon: <Cpu size={20} color="#e11d48" />,
      detail: 'Dual-core task management ensures non-blocking I2C OLED rendering while maintaining HTTP polling connectivity.',
    },
    {
      step: '04',
      label: 'Remind',
      title: 'Physical Multi-Sensory Alert',
      subtitle: 'SSD1306 OLED + RGB LEDs + Buzzer',
      desc: 'When a meal window arrives, the physical unit pulses the blue LED, sounds a 2.4kHz piezo chime, and displays the meal description.',
      icon: <Bell size={20} color="#e11d48" />,
      detail: 'Eliminates screen fatigue by providing an unignorable, ambient, tactile notification right on your desk.',
    },
    {
      step: '05',
      label: 'Confirm',
      title: 'Tactile Push-Button Confirmation',
      subtitle: 'GPIO 18 Interrupt Debounce',
      desc: 'Pressing the physical button acknowledges the meal, silences the alert chime, and posts timestamped confirmation to the dashboard.',
      icon: <CheckCircle size={20} color="#e11d48" />,
      detail: 'Logs response latency (seconds) to verify dietary adherence and automatically advances device status to READY (Green LED).',
    },
  ];

  const activeItem = pipeline[activeStepIndex];

  return (
    <section id="device" style={{ padding: '6rem 0', position: 'relative', backgroundColor: 'var(--bg-canvas)' }}>
      <div className="container">
        
        {/* Section Top Eyebrow & Split Heading (matching Slide 3) */}
        <div style={{ marginBottom: '1rem' }}>
          <span className="eyebrow-healthtech">
            One platform, endless possibilities
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          <h2
            className="headline-sub"
            style={{
              fontSize: 'clamp(2.2rem, 4vw, 3.25rem)',
              maxWidth: '560px',
              margin: 0,
            }}
          >
            Flexible solutions that fit your medical workflows
          </h2>

          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              maxWidth: '380px',
              margin: 0,
            }}
          >
            Built for individuals and clinical nutritionists alike, our platform simplifies dietary adherence, synchronizes with IoT hardware, and drives lasting habit formation.
          </p>
        </div>

        {/* Circular Stepper Chain (Direct match to Slide 3) */}
        <div className="stepper-chain-container">
          <div className="stepper-chain-line" />
          {pipeline.map((item, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div key={idx} className="stepper-chain-node">
                <button
                  type="button"
                  onClick={() => setActiveStepIndex(idx)}
                  className={`stepper-circle ${isActive ? 'active' : ''}`}
                >
                  <span>{item.step}</span>
                  <span className="step-subtext">{item.label}</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Active Stage Detailed Card */}
        <div
          className="card-waypilot"
          style={{
            padding: '2.5rem',
            maxWidth: '820px',
            margin: '2rem auto 4rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'center',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e5e7eb',
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-red)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <span>STAGE {activeItem.step} IN PROGRESS</span>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.35rem' }}>
              {activeItem.title}
            </h3>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {activeItem.subtitle}
            </div>
            <p style={{ fontSize: '0.925rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {activeItem.desc}
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-darkest)', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0', lineHeight: 1.5 }}>
              <strong>Execution:</strong> {activeItem.detail}
            </div>
          </div>

          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: '2rem', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(225, 29, 72, 0.06)',
                border: '1.5px solid rgba(225, 29, 72, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--primary-red)',
                marginBottom: '1rem',
              }}
            >
              {activeItem.icon}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-darkest)' }}>
              Step {activeItem.step} of 05
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
              Click any circle above to inspect sequence
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-outline-healthtech"
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                disabled={activeStepIndex === 0}
                onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn-crimson"
                style={{ padding: '0.5rem 1.2rem', fontSize: '0.8rem' }}
                disabled={activeStepIndex === pipeline.length - 1}
                onClick={() => setActiveStepIndex((prev) => Math.min(pipeline.length - 1, prev + 1))}
              >
                <span>Next Stage</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Hardware Pinout & Wiring Table */}
        <div className="card-waypilot" style={{ padding: '2.5rem', marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>
                ESP32 Hardware Pinout & Wiring Configuration
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Standard 3.3V logic level wiring for the ESP-WROOM-32 development board.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<Code2 size={16} />}
              onClick={onOpenFirmware}
            >
              View C++ Firmware Code
            </Button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table-waypilot" style={{ width: '100%', fontSize: '0.875rem' }}>
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Hardware Part</th>
                  <th>Pin Connection</th>
                  <th>Mode / Voltage</th>
                  <th>Operational Role</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>OLED Screen</strong></td>
                  <td>0.96" SSD1306 (128x64)</td>
                  <td><span className="badge chip-dark">GPIO 21 (SDA) • GPIO 22 (SCL)</span></td>
                  <td>3.3V Logic • I2C Bus</td>
                  <td>Shows meal title, portion items, and countdown timer</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>Piezo Buzzer</strong></td>
                  <td>Active 5V/3.3V Buzzer</td>
                  <td><span className="badge chip-dark">GPIO 23</span></td>
                  <td>PWM Output • 2.4 kHz</td>
                  <td>Emits repeating audible chime during active meal window</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>Tactile Button</strong></td>
                  <td>Momentary Push Button</td>
                  <td><span className="badge chip-dark">GPIO 18</span></td>
                  <td>INPUT_PULLDOWN (10kΩ)</td>
                  <td>Acknowledge meal on physical press; silences buzzer</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>Green Status LED</strong></td>
                  <td>3mm / 5mm Through-Hole</td>
                  <td><span className="badge chip-dark">GPIO 5</span></td>
                  <td>OUTPUT • 220Ω Resistor</td>
                  <td>Illuminates when device is idle and waiting for next meal</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>Blue Alert LED</strong></td>
                  <td>3mm / 5mm Through-Hole</td>
                  <td><span className="badge chip-dark">GPIO 4</span></td>
                  <td>OUTPUT • 220Ω Resistor</td>
                  <td>Flashes during ACTIVE reminder window until acknowledged</td>
                </tr>
                <tr>
                  <td><strong style={{ color: 'var(--text-darkest)' }}>Red Missed LED</strong></td>
                  <td>3mm / 5mm Through-Hole</td>
                  <td><span className="badge chip-dark">GPIO 15</span></td>
                  <td>OUTPUT • 220Ω Resistor</td>
                  <td>Lights up if reminder window expires without user button press</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
};
