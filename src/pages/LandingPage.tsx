import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { LiveDashboardSection } from '../components/landing/LiveDashboardSection';
import { NutritionDecodedSection } from '../components/landing/NutritionDecodedSection';
import { MealScheduleSection } from '../components/landing/MealScheduleSection';
import { ConnectedDeviceSection } from '../components/landing/ConnectedDeviceSection';
import { RemindersSection } from '../components/landing/RemindersSection';
import { CTASection } from '../components/landing/CTASection';
import { useAuth } from '../context/AuthContext';
import { AppPage } from '../components/common/Navbar';

export interface LandingPageProps {
  onNavigate: (page: AppPage) => void;
  onOpenProfile: () => void;
  onOpenFirmware: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onOpenProfile,
  onOpenFirmware,
}) => {
  const { user } = useAuth();

  return (
    <main>
      {/* Section 1: Monumental HealthTech Hero Banner (No trespassing / collisions) */}
      <HeroSection
        onGetStarted={() => onNavigate(user ? 'dashboard' : 'register')}
        onExplore={() => onNavigate('about')}
        onSignIn={() => onNavigate('login')}
        isLoggedIn={Boolean(user)}
      />

      {/* Section 2: Real-time Live Clinical Dashboard on THIS SAME WEB */}
      <LiveDashboardSection
        onOpenProfile={onOpenProfile}
        onOpenSchedule={() => onNavigate('schedule')}
      />

      {/* Section 3: Dietary Science & Metabolic Engine */}
      <NutritionDecodedSection />

      {/* Section 4: Circadian Rhythm & Meal Schedule Timing */}
      <MealScheduleSection />

      {/* Section 5: Connected ESP32 Hardware Node, Circular Stepper & OLED Simulator */}
      <ConnectedDeviceSection
        onOpenFirmware={onOpenFirmware}
      />

      {/* Section 6: Smart Reminders & Adherence Compliance History */}
      <RemindersSection />

      {/* Section 7: Clinical CTA */}
      <CTASection
        onRegister={() => onNavigate(user ? 'dashboard' : 'register')}
        onSignIn={() => onNavigate('login')}
        onDemoLogin={() => onNavigate('schedule')}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
};
