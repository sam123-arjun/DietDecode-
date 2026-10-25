import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ESP32Provider } from './context/ESP32Context';
import { DietProvider, useDiet } from './context/DietContext';
import { dataService } from './services/dataService';
import { storageService } from './services/storageService';
import { User } from './types';

// Components (always loaded — part of the shell, needed on every page)
import { Navbar, AppPage } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ProfileModal } from './components/common/ProfileModal';
import { ESP32CodeModal } from './components/esp32/ESP32CodeModal';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Pages — directly imported for instantaneous 0ms tab navigation with zero network delay
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { MealSchedulePage } from './pages/MealSchedulePage';
import { DietPlanPage } from './pages/DietPlanPage';
import { RemindersPage } from './pages/RemindersPage';
import { ReminderHistoryPage } from './pages/ReminderHistoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { TodaysMealsPage } from './pages/TodaysMealsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

const VALID_PAGES: AppPage[] = [
  'home',
  'dashboard',
  'todays-meals',
  'schedule',
  'diet-plan',
  'reminders',
  'history',
  'profile',
  'settings',
  'about',
  'login',
  'register',
];

const PROTECTED_PAGES: AppPage[] = [
  'dashboard',
  'todays-meals',
  'schedule',
  'diet-plan',
  'reminders',
  'history',
  'profile',
  'settings',
];

function normalizePageName(raw: string): AppPage | null {
  const clean = raw.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (clean === 'meals') return 'todays-meals';
  if (clean === '' || clean === 'landing') return 'home';
  if (VALID_PAGES.includes(clean as AppPage)) return clean as AppPage;
  return null;
}

function parsePageFromLocation(): AppPage {
  if (typeof window === 'undefined') return 'home';

  // 1. Check pathname (e.g. /dashboard, /profile, /diet-plan, /meals)
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/') {
    const page = normalizePageName(pathname);
    if (page) return page;
  }

  // 2. Check hash (e.g. #dashboard, #/dashboard, #meals)
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (hash) {
    const page = normalizePageName(hash);
    if (page) return page;
  }

  return 'home';
}

const MainApplication: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const { profile, activePlan } = useDiet();

  const [currentPage, setCurrentPage] = useState<AppPage>(() => parsePageFromLocation());
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showFirmwareModal, setShowFirmwareModal] = useState<boolean>(false);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [justRegistered, setJustRegistered] = useState<boolean>(false);

  const handleNavigate = useCallback((page: AppPage, replace: boolean = false) => {
    setCurrentPage(page);
    if (typeof window !== 'undefined') {
      try {
        const targetPath = page === 'home' ? '/' : `/${page}`;
        if (window.location.pathname !== targetPath) {
          if (replace) {
            window.history.replaceState(null, '', targetPath);
          } else {
            window.history.pushState(null, '', targetPath);
          }
        }
      } catch {
        window.location.hash = page === 'home' ? '' : page;
      }
      window.scrollTo({ top: 0 }); // instant — smooth causes jank during page transitions
    }
  }, []);

  // Sync browser back/forward and hash changes
  useEffect(() => {
    const handleLocationChange = () => {
      const pageFromUrl = parsePageFromLocation();
      setCurrentPage(pageFromUrl);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Route Guards: Protect private pages and handle onboarding/redirect flows
  useEffect(() => {
    if (authLoading) return;

    const isProtected = PROTECTED_PAGES.includes(currentPage);
    const activeUser = user || storageService.getUser();

    // Unauthenticated user attempting to access protected page → login
    if (!activeUser && isProtected) {
      handleNavigate('login', true);
      return;
    }

    // Never auto-redirect away from public/auth pages (login, register, home, about).
    // The user must be allowed to complete the form without guard interference.
    if (currentPage === 'login' || currentPage === 'register' || currentPage === 'home' || currentPage === 'about') {
      return;
    }

    const currentProfile = profile || (activeUser ? storageService.getProfile(activeUser.id) : null);

    // Profile incomplete on private pages → profile page
    if (activeUser && currentProfile && currentProfile.isProfileComplete === false && currentPage !== 'profile') {
      handleNavigate('profile', true);
      return;
    }

    // No active plan on dashboard → diet-plan page
    if (activeUser && currentProfile?.isProfileComplete && !activePlan && currentPage === 'dashboard') {
      handleNavigate('diet-plan', true);
      return;
    }
  }, [user, authLoading, currentPage, profile, activePlan, handleNavigate]);

  // Handler for successful login: clear registration notice and route into app immediately
  const handleLoginSuccess = (loggedInUser?: User) => {
    setJustRegistered(false);
    setRegisteredEmail('');
    const uid = loggedInUser?.id || user?.id || storageService.getUser()?.id;
    if (!uid) {
      handleNavigate('dashboard');
      return;
    }
    const localProfile = storageService.getProfile(uid);
    const isComplete = localProfile && localProfile.isProfileComplete !== false;
    if (!isComplete) {
      handleNavigate('profile');
    } else if (!activePlan) {
      handleNavigate('diet-plan');
    } else {
      handleNavigate('dashboard');
    }
  };

  // Handler for successful registration: redirect directly to sign in page with email prefilled
  const handleRegisterSuccess = async (newUser?: User, email?: string) => {
    const targetEmail = email || newUser?.email || '';
    setRegisteredEmail(targetEmail);
    setJustRegistered(true);
    try {
      await logout();
    } catch {
      // ignore
    }
    handleNavigate('login');
  };

  // Handler for profile completion: go to diet-plan so user generates their first plan
  const handleProfileComplete = () => {
    handleNavigate('diet-plan');
  };

  // Only block the screen if user is attempting to view a PROTECTED page while auth is still resolving
  const isProtected = PROTECTED_PAGES.includes(currentPage);
  const activeUser = user || storageService.getUser();
  if (authLoading && isProtected && !activeUser) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fafafa',
        }}
      >
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'schedule':
        return <MealSchedulePage />;
      case 'diet-plan':
        return <DietPlanPage onNavigate={handleNavigate} />;
      case 'reminders':
        return <RemindersPage onNavigate={handleNavigate} />;
      case 'history':
        return <ReminderHistoryPage />;
      case 'profile':
        return (
          <ProfilePage
            onComplete={handleProfileComplete}
            onNavigate={handleNavigate}
          />
        );
      case 'settings':
        return <SettingsPage />;
      case 'about':
        return <AboutPage />;
      case 'todays-meals':
        return <TodaysMealsPage onNavigate={handleNavigate} />;
      case 'login':
        return (
          <LoginPage
            onSuccess={handleLoginSuccess}
            onNavigateRegister={() => handleNavigate('register')}
            onNavigateHome={() => handleNavigate('home')}
            initialEmail={registeredEmail}
            registrationSuccess={justRegistered}
          />
        );
      case 'register':
        return (
          <RegisterPage
            onSuccess={handleRegisterSuccess}
            onNavigateLogin={(prefillEmail) => {
              if (prefillEmail) setRegisteredEmail(prefillEmail);
              handleNavigate('login');
            }}
            onNavigateHome={() => handleNavigate('home')}
          />
        );
      case 'home':
      default:
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenProfile={() => setShowProfileModal(true)}
            onOpenFirmware={() => setShowFirmwareModal(true)}
          />
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 1. Persistent Floating Obsidian Pill Navbar across the WHOLE APP */}
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onOpenProfile={() => setShowProfileModal(true)}
      />

      {/* 2. Main Page View: Home Hero View OR HealthTech Page Shell */}
      {currentPage === 'home' ? (
        renderActivePage()
      ) : (
        <main className="healthtech-page-shell">
          {renderActivePage()}
        </main>
      )}

      {/* 3. Obsidian Contrast Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* 4. Global Modals */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      <ESP32CodeModal
        isOpen={showFirmwareModal}
        onClose={() => setShowFirmwareModal(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ESP32Provider>
        <DietProvider>
          <MainApplication />
        </DietProvider>
      </ESP32Provider>
    </AuthProvider>
  );
}

export default App;
