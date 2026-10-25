import React from 'react';
import {
  LayoutDashboard,
  UtensilsCrossed,
  Clock,
  CalendarDays,
  BellRing,
  History,
  UserCheck,
  Settings,
  Info,
  LogOut,
  Cpu,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useESP32 } from '../../context/ESP32Context';

export type AppPage =
  | 'home'
  | 'dashboard'
  | 'todays-meals'
  | 'schedule'
  | 'diet-plan'
  | 'reminders'
  | 'history'
  | 'profile'
  | 'settings'
  | 'about'
  | 'login'
  | 'register';

interface SidebarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onNavigateHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, onNavigateHome }) => {
  const { user, logout } = useAuth();
  const { deviceState } = useESP32();

  const navItems: { page: AppPage; label: string; icon: React.ReactNode; badge?: string }[] = [
    { page: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
    { page: 'diet-plan', label: 'Diet Plan', icon: <UtensilsCrossed size={17} /> },
    { page: 'todays-meals', label: 'Today’s Meals', icon: <Clock size={17} /> },
    { page: 'schedule', label: 'Meal Schedule', icon: <CalendarDays size={17} /> },
    { page: 'reminders', label: 'Reminders', icon: <BellRing size={17} />, badge: deviceState.currentState === 'REMINDER_ACTIVE' ? 'ALERT' : undefined },
    { page: 'history', label: 'Reminder History', icon: <History size={17} /> },
    { page: 'profile', label: 'My Profile', icon: <UserCheck size={17} /> },
    { page: 'settings', label: 'Settings', icon: <Settings size={17} /> },
    { page: 'about', label: 'About DietDecode', icon: <Info size={17} /> },
  ];

  return (
    <aside className="app-sidebar">
      <div>
        {/* Brand Header */}
        <div
          onClick={onNavigateHome}
          style={{
            padding: '1.4rem 1.25rem',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: onNavigateHome ? 'pointer' : 'default',
          }}
          title={onNavigateHome ? 'Click to return to HealthTech Landing Page' : undefined}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(225, 29, 72, 0.35)',
            }}
          >
            <Sparkles size={17} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              DietDecode
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
              IoT Nutrition System
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ padding: '0.85rem 0.85rem' }} aria-label="Sidebar Navigation">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              style={{
                width: '100%',
                marginBottom: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid rgba(225, 29, 72, 0.25)',
                background: 'rgba(225, 29, 72, 0.04)',
                color: 'var(--primary-red)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span>← View Landing Page</span>
            </button>
          )}

          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.65rem 0.5rem' }}>
            Menu
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <li key={item.page}>
                  <button
                    onClick={() => onNavigate(item.page)}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: isActive ? 'var(--bg-obsidian)' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderRadius: '9999px',
                      padding: '0.55rem 0.9rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: isActive ? '#ffffff' : 'var(--text-secondary)' }}>
                        {item.icon}
                      </span>
                      <span style={{ color: isActive ? '#ffffff' : 'inherit' }}>
                        {item.label}
                      </span>
                    </div>

                    {item.badge && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          background: '#e11d48',
                          color: '#ffffff',
                          animation: 'pulse 1.5s infinite',
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Footer Area: Device Status & User Profile */}
      <div style={{ padding: '1rem 0.85rem', borderTop: '1px solid rgba(0, 0, 0, 0.05)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Device Status Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Cpu size={14} color="#64748b" />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-darkest)', letterSpacing: '0.02em' }}>
                ESP32 Hardware
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: deviceState.connected ? '#22c55e' : '#94a3b8',
                  boxShadow: deviceState.connected ? '0 0 6px #22c55e' : 'none',
                }}
              />
              <span style={{ fontSize: '0.675rem', fontFamily: 'var(--font-mono)', color: deviceState.connected ? '#15803d' : '#64748b', fontWeight: 600 }}>
                {deviceState.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Syncing meals & OLED screen
          </div>
        </div>

        {/* User Card & Sign Out */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.4rem 0.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#0c0f17',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.825rem',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-darkest)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.fullName || 'Diet User'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {user?.email || 'user@dietdecode.io'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
