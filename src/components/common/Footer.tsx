import React from 'react';
import { Sparkles, Code2, Globe, Share2, ShieldCheck, Heart } from 'lucide-react';
import { AppPage } from './Navbar';

interface FooterProps {
  onNavigate?: (page: AppPage) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="obsidian-footer">
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '3rem',
            marginBottom: '3.5rem',
          }}
        >
          {/* Brand & Mission */}
          <div style={{ maxWidth: '320px' }}>
            <div
              onClick={() => onNavigate && onNavigate('home')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '1rem',
                cursor: onNavigate ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 10px rgba(225, 29, 72, 0.4)',
                }}
              >
                <Sparkles size={17} color="#ffffff" />
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
                DietDecode
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.6 }}>
              Personalized Nutrition. Smarter Reminders. An IoT-integrated cyber-physical health platform combining clinical diet calculations with physical ESP32 OLED reminders.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginTop: '1.25rem' }}>
              {[
                { icon: <Code2 size={15} />, label: 'GitHub Repository' },
                { icon: <Globe size={15} />, label: 'Documentation' },
                { icon: <Share2 size={15} />, label: 'Share Platform' },
                { icon: <ShieldCheck size={15} />, label: 'Verified IoT' },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href="#"
                  aria-label={item.label}
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9999px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>

          {/* System Architecture */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Architecture
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.875rem' }}>
              <li><a href="#nutrition">Mifflin-St Jeor Engine</a></li>
              <li><a href="#schedule">Macronutrient Distribution</a></li>
              <li><a href="#device">ESP32 Firmware (C++)</a></li>
              <li><a href="#device">SSD1306 OLED (I2C)</a></li>
              <li><a href="#device">Tactile Snooze Interrupt</a></li>
            </ul>
          </div>

          {/* Hardware Pinout */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ESP32 Pinout
            </h4>
            <div style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'rgba(255, 255, 255, 0.65)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div><span style={{ color: '#38bdf8' }}>I2C OLED:</span> GPIO 21 / 22</div>
              <div><span style={{ color: '#fbbf24' }}>Piezo Buzzer:</span> GPIO 23</div>
              <div><span style={{ color: '#4ade80' }}>Tactile Switch:</span> GPIO 18</div>
              <div><span style={{ color: '#86efac' }}>LED Green:</span> GPIO 5</div>
              <div><span style={{ color: '#93c5fd' }}>LED Blue:</span> GPIO 4</div>
              <div><span style={{ color: '#fca5a5' }}>LED Red:</span> GPIO 15</div>
            </div>
          </div>

          {/* Engineering Project Note */}
          <div>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Project Standards
            </h4>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1rem',
                fontSize: '0.8rem',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#86efac', fontWeight: 600, marginBottom: '0.4rem' }}>
                <ShieldCheck size={16} />
                <span>Verified Capstone</span>
              </div>
              Final-Year Engineering Project Capstone. Zero mobile alert fatigue through physical, tangible feedback.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.825rem',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          <div>
            © {new Date().getFullYear()} DietDecode IoT System. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              Engineered with <Heart size={13} color="#f43f5e" fill="#f43f5e" /> for Health IoT
            </span>
            <span>v2.4.0 Editorial Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
