import React, { useState } from 'react';
import { Menu, X, ArrowRight, Sparkles, Cpu, Wifi, LayoutDashboard, Calendar, Utensils, Bell, History, User, Settings, Home, Info, LogOut } from 'lucide-react';
import { useESP32 } from '../../context/ESP32Context';
import { useAuth } from '../../context/AuthContext';

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

interface NavbarProps {
  currentPage: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenProfile?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenProfile,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { deviceState, iotMode } = useESP32();
  const { user, logout } = useAuth();

  const handleSelectPage = (page: AppPage) => {
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    setMobileMenuOpen(false);
    onNavigate('home');
  };

  const authenticatedNavLinks: { page: AppPage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'dashboard', label: 'Dashboard' },
    { page: 'schedule', label: 'Schedule' },
    { page: 'diet-plan', label: 'Diet Plan' },
    { page: 'reminders', label: 'Reminders' },
    { page: 'history', label: 'History' },
    { page: 'profile', label: 'Profile' },
    { page: 'settings', label: 'Settings' },
  ];

  const publicNavLinks: { page: AppPage; label: string }[] = [
    { page: 'home', label: 'Home' },
    { page: 'about', label: 'About' },
  ];

  const isAuthView = Boolean(user && currentPage !== 'login' && currentPage !== 'register');
  const navLinks = isAuthView ? authenticatedNavLinks : publicNavLinks;

  return (
    <header className="floating-navbar-wrapper">
      <div className="floating-navbar-inner">
        {/* Brand Logo */}
        <button
          onClick={() => handleSelectPage('home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            color: '#ffffff',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
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
              boxShadow: '0 2px 10px rgba(225, 29, 72, 0.4)',
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', whiteSpace: 'nowrap' }}>
            DietDecode
          </span>
        </button>

        {/* Desktop Navigation Links */}
        <nav
          style={{ display: 'none' }}
          className="desktop-nav"
          aria-label="Main Navigation"
        >
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem',
              listStyle: 'none',
              margin: 0,
              padding: 0,
              flexWrap: 'nowrap',
            }}
          >
            {navLinks.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <li key={item.page} style={{ flexShrink: 0 }}>
                  <button
                    onClick={() => handleSelectPage(item.page)}
                    className={`nav-pill-link ${isActive ? 'active' : ''}`}
                    style={{
                      background: isActive ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.75)',
                      fontWeight: isActive ? 600 : 500,
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.34rem 0.7rem',
                      borderRadius: '9999px',
                      fontSize: '0.825rem',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Desktop Actions & Status Chip */}
        <div style={{ display: 'none', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }} className="desktop-nav">
          {/* Live Device Status Chip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '0.3rem 0.65rem',
              borderRadius: '9999px',
              fontSize: '0.725rem',
              fontFamily: 'var(--font-mono)',
              color: deviceState.connected ? '#86efac' : '#94a3b8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: deviceState.connected ? '#22c55e' : '#64748b',
                boxShadow: deviceState.connected ? '0 0 6px #22c55e' : 'none',
              }}
            />
            <span>
              {deviceState.connected
                ? iotMode === 'firebase'
                  ? 'Cloud ESP32'
                  : 'Local ESP32'
                : iotMode === 'firebase'
                ? 'Cloud ESP32'
                : 'ESP32 Idle'}
            </span>
          </div>

          {/* Desktop Actions & Buttons */}
          {user && isAuthView ? (
            <>
              {/* User Profile Pill */}
              <button
                onClick={() => (onOpenProfile ? onOpenProfile() : handleSelectPage('profile'))}
                style={{
                  background: currentPage === 'profile' ? 'rgba(220, 38, 38, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                  border: currentPage === 'profile' ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '0.28rem 0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: '#ffffff',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title="Open Profile & Biometrics"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = currentPage === 'profile' ? 'rgba(220, 38, 38, 0.25)' : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = currentPage === 'profile' ? '1px solid rgba(220, 38, 38, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)';
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                  }}
                >
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <span>{user.fullName?.split(' ')[0] || 'User'}</span>
              </button>

              {/* Sign Out Button */}
              <button
                onClick={handleLogout}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '0.35rem 0.8rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.785rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(225, 29, 72, 0.2)';
                  e.currentTarget.style.borderColor = 'rgba(225, 29, 72, 0.4)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                }}
                title="Sign out of your account"
              >
                <LogOut size={13} />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              {/* Sign In Button */}
              <button
                onClick={() => handleSelectPage('login')}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '0.38rem 0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  color: '#ffffff',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                title="Sign in to your account"
              >
                <span>Sign In</span>
              </button>

              {/* Register Button */}
              <button
                onClick={() => handleSelectPage('register')}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.38rem 1.05rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 2px 12px rgba(220, 38, 38, 0.35)',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#be123c';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                title="Register for DietDecode"
              >
                <span>Register</span>
                <ArrowRight size={13} />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '9999px',
            color: '#ffffff',
            padding: '0.4rem 0.6rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          className="mobile-toggle"
          aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
        >
          {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'absolute',
            top: '70px',
            left: '1rem',
            right: '1rem',
            background: '#0c0f17',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '24px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'auto',
          }}
        >
          {navLinks.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={item.page}
                onClick={() => handleSelectPage(item.page)}
                style={{
                  background: isActive ? 'rgba(220, 38, 38, 0.25)' : 'transparent',
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                  padding: '0.55rem 0.85rem',
                  borderRadius: '10px',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.925rem',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span>{item.label}</span>
                {isActive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#dc2626' }} />}
              </button>
            );
          })}

          <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Mobile ESP32 Status Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.85rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.78rem',
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: deviceState.connected ? '#10b981' : '#f43f5e',
                    boxShadow: deviceState.connected ? '0 0 8px #10b981' : 'none',
                  }}
                />
                <span style={{ fontWeight: 600 }}>ESP32 Node ({deviceState.connected ? 'ONLINE' : 'OFFLINE'})</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.55)', fontFamily: 'var(--font-mono)' }}>
                {deviceState.lastPing}
              </span>
            </div>

            {user && isAuthView ? (
              <>
                <button
                  onClick={() => handleSelectPage('dashboard')}
                  style={{
                    width: '100%',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Go to Live Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.45rem',
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSelectPage('login')}
                  style={{
                    width: '100%',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    padding: '0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleSelectPage('register')}
                  style={{
                    width: '100%',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  Register & Begin
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive media query styling */}
      <style>{`
        @media (min-width: 992px) {
          .desktop-nav {
            display: flex !important;
          }
          .mobile-toggle {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
