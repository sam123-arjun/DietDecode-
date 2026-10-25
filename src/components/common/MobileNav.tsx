import React, { useState } from 'react';
import { Menu, X, Cpu, LogOut, Sparkles } from 'lucide-react';
import { AppPage } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useESP32 } from '../../context/ESP32Context';

interface MobileNavProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onNavigateHome?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentPage, onNavigate, onNavigateHome }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const { deviceState } = useESP32();

  const navItems: { page: AppPage; label: string; badge?: string }[] = [
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'diet-plan', label: 'Diet Plan' },
    { page: 'todays-meals', label: 'Today’s Meals' },
    { page: 'schedule', label: 'Meal Schedule' },
    { page: 'reminders', label: 'Reminders', badge: deviceState.currentState === 'REMINDER_ACTIVE' ? 'ALERT' : undefined },
    { page: 'history', label: 'Reminder History' },
    { page: 'profile', label: 'My Profile' },
    { page: 'settings', label: 'Settings' },
    { page: 'about', label: 'About DietDecode' },
  ];

  const handleSelect = (page: AppPage) => {
    onNavigate(page);
    setIsOpen(false);
  };

  return (
    <div className="mobile-nav-bar" style={{ display: 'none' }}>
      <header
        style={{
          height: '62px',
          background: '#ffffff',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        {/* Brand */}
        <div
          onClick={onNavigateHome}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            cursor: onNavigateHome ? 'pointer' : 'default',
          }}
          title={onNavigateHome ? 'Return to HealthTech Landing Page' : undefined}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(225, 29, 72, 0.35)',
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em' }}>
            DietDecode
          </span>
        </div>

        {/* Device Status & Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              fontSize: '0.7rem',
              color: deviceState.connected ? '#059669' : '#64748b',
              background: '#f8fafc',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: deviceState.connected ? '#10b981' : '#94a3b8' }} />
            <span>{deviceState.connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              color: 'var(--text-darkest)',
              padding: '0.45rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle navigation drawer"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '62px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(12, 15, 23, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 99,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {onNavigateHome && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigateHome();
                }}
                style={{
                  width: '100%',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '9999px',
                  border: '1px solid rgba(225, 29, 72, 0.25)',
                  background: 'rgba(225, 29, 72, 0.05)',
                  color: 'var(--primary-red)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <span>← View Landing Page</span>
              </button>
            )}

            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => handleSelect(item.page)}
                  style={{
                    background: isActive ? 'var(--bg-obsidian)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-darkest)',
                    border: 'none',
                    padding: '0.65rem 1rem',
                    borderRadius: '9999px',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.925rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px' }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {user?.fullName}
              </div>
              <button
                onClick={() => { setIsOpen(false); logout(); }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .mobile-nav-bar {
            display: block !important;
          }
          .app-sidebar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
