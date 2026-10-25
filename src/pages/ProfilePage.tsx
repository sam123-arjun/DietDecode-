import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Save,
  RotateCcw,
  Sparkles,
  Scale,
  Activity,
  Heart,
  AlertCircle,
  CheckCircle2,
  Apple,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { UserProfile, Gender, ActivityLevel, DietType, HealthGoal } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

import { useAuth } from '../context/AuthContext';
import { AppPage } from '../components/common/Navbar';

interface ProfilePageProps {
  onComplete?: () => void;
  onNavigate?: (page: AppPage) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onComplete, onNavigate }) => {
  const { user } = useAuth();
  const { profile, saveProfile, generateDietPlanFromProfile, loading } = useDiet();

  const isSetupMode = !profile?.isProfileComplete;

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    fullName: user?.fullName || '',
    age: 22,
    gender: 'male',
    height: 175,
    weight: 68,
    activityLevel: 'moderate',
    dietType: 'vegetarian',
    favoriteFoods: [],
    foodsToAvoid: [],
    allergies: [],
    healthGoals: ['balanced_nutrition'],
  });

  const [favoriteFoodsInput, setFavoriteFoodsInput] = useState<string>('');
  const [foodsToAvoidInput, setFoodsToAvoidInput] = useState<string>('');
  const [allergiesInput, setAllergiesInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        ...profile,
        fullName: profile.fullName || prev.fullName || user?.fullName || '',
      }));
      setFavoriteFoodsInput(profile.favoriteFoods?.join(', ') || '');
      setFoodsToAvoidInput(profile.foodsToAvoid?.join(', ') || '');
      setAllergiesInput(profile.allergies?.join(', ') || '');
    } else if (user) {
      setFormData((prev) => ({ ...prev, fullName: user.fullName || prev.fullName || '' }));
    }
  }, [profile, user]);


  // Calculate BMI
  const heightM = (formData.height || 175) / 100;
  const bmi = Number(((formData.weight || 68) / (heightM * heightM)).toFixed(1));
  let bmiCategory = 'Normal Weight';
  let bmiColor = '#059669';
  if (bmi < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = '#0284c7';
  } else if (bmi >= 25 && bmi < 30) {
    bmiCategory = 'Overweight';
    bmiColor = '#d97706';
  } else if (bmi >= 30) {
    bmiCategory = 'Obese';
    bmiColor = '#e11d48';
  }

  const weight = formData.weight || 68;
  const height = formData.height || 175;
  const age = formData.age || 22;
  const gender = formData.gender || 'male';
  const calculatedBmr = Math.round(10 * weight + 6.25 * height - 5 * age + (gender === 'female' ? -161 : 5));
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = activityMultipliers[formData.activityLevel || 'moderate'] || 1.55;
  const calculatedTdee = Math.round(calculatedBmr * multiplier);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const parseCommaSeparated = (text: string) =>
      text
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    try {
      await saveProfile({
        ...formData,
        favoriteFoods: parseCommaSeparated(favoriteFoodsInput),
        foodsToAvoid: parseCommaSeparated(foodsToAvoidInput),
        allergies: parseCommaSeparated(allergiesInput),
        isProfileComplete: true,
      });
      setSaveSuccess(true);
      if (onComplete) {
        onComplete();
      } else if (onNavigate) {
        onNavigate('dashboard');
      } else {
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Error saving profile, proceeding with local fallback:', err);
      if (onComplete) {
        onComplete();
      } else if (onNavigate) {
        onNavigate('dashboard');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    await handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    await generateDietPlanFromProfile();
  };

  return (
    <div>
      <PageHeader
        title={isSetupMode ? 'Complete Your Biometric Profile' : 'Biometric & Dietary Profile'}
        subtitle={
          isSetupMode
            ? 'Set your biometrics so DietDecode can compute your metabolic targets and activate physical ESP32 reminders.'
            : 'Configure physical biometrics, dietary classifications, allergens, and caloric goals.'
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {onNavigate && !isSetupMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('dashboard')}
              >
                Go to Dashboard
              </Button>
            )}
            {!isSetupMode && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRegenerate}
                leftIcon={<RotateCcw size={14} />}
              >
                Re-Synthesize Plan
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleSubmit}
              isLoading={isSaving}
              leftIcon={<Save size={14} />}
            >
              {isSetupMode ? 'Save & Launch' : 'Save Changes'}
            </Button>
          </div>
        }
      />

      {isSetupMode && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
            border: '1px solid rgba(220, 38, 38, 0.25)',
            color: 'var(--text-darkest)',
            padding: '1.25rem 1.5rem',
            borderRadius: '18px',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.9rem',
                flexShrink: 0,
              }}
            >
              2
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-darkest)' }}>
                Step 2 of 2: Complete Your Nutrition Profile
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Please review or adjust your biometrics. Once saved to Firestore, your personalized diet plan and dashboard will launch automatically.
              </div>
            </div>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#047857',
            padding: '1rem 1.25rem',
            borderRadius: '16px',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={18} />
          Profile biometrics saved and nutritional equations updated!
        </div>
      )}

      {/* Main Grid: Form Inputs (Left) + Calculated Biometric Telemetry (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Form Column */}
        <div className="card-waypilot" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '1.5rem', letterSpacing: '-0.01em' }}>
            Physical & Dietary Data
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-input"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Your Name"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Age</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.age || 22}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  min={10}
                  max={100}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Height (cm)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.height || 175}
                  onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                  min={100}
                  max={250}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Weight (kg)</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.weight || 68}
                  onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                  min={30}
                  max={250}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.1rem' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Biological Gender</label>
                <select
                  className="form-select"
                  value={formData.gender || 'male'}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                >
                  <option value="male">Male (Mifflin: +5)</option>
                  <option value="female">Female (Mifflin: -161)</option>
                  <option value="other">Other / Neutral</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Activity Level</label>
                <select
                  className="form-select"
                  value={formData.activityLevel || 'moderate'}
                  onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
                >
                  <option value="sedentary">Sedentary (1.2×)</option>
                  <option value="light">Lightly Active (1.375×)</option>
                  <option value="moderate">Moderately Active (1.55×)</option>
                  <option value="very_active">Very Active (1.725×)</option>
                  <option value="extra_active">Extremely Active (1.9×)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dietary Classification</label>
              <select
                className="form-select"
                value={formData.dietType || 'vegetarian'}
                onChange={(e) => setFormData({ ...formData, dietType: e.target.value as DietType })}
              >
                <option value="vegetarian">Vegetarian (Dairy & Plant-Based)</option>
                <option value="vegan">Strict Vegan (100% Plant-Based)</option>
                <option value="non_vegetarian">Non-Vegetarian (Includes Poultry/Fish/Meat)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Favorite Foods (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={favoriteFoodsInput}
                onChange={(e) => setFavoriteFoodsInput(e.target.value)}
                placeholder="e.g. Oatmeal, Paneer, Lentils, Apples"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Foods to Avoid / Allergies (comma-separated)</label>
              <input
                type="text"
                className="form-input"
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                placeholder="e.g. Peanuts, Gluten, Dairy, Shellfish"
              />
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSaving}
                leftIcon={<Save size={16} />}
                size={isSetupMode ? 'lg' : 'md'}
              >
                {isSetupMode ? 'Save Profile & Launch Dashboard →' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </div>

        {/* Biometric Telemetry & Science Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* BMI Status Card */}
          <div className="card-waypilot" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Body Mass Index (BMI)
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: bmiColor,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '9999px',
                }}
              >
                {bmiCategory}
              </span>
            </div>

            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {bmi} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>kg/m²</span>
            </div>

            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden', margin: '1.25rem 0' }}>
              <div
                style={{
                  width: `${Math.min(100, Math.max(10, (bmi / 35) * 100))}%`,
                  height: '100%',
                  background: bmiColor,
                  borderRadius: '9999px',
                }}
              />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Calculated dynamically from your height ({formData.height} cm) and weight ({formData.weight} kg).
            </p>
          </div>

          {/* Metabolic Formula Explanation */}
          <div className="card-waypilot" style={{ padding: '2rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Metabolic Calculations
            </div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.75rem' }}>
              Mifflin-St Jeor Equation
            </h4>

            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.775rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                padding: '0.85rem',
                borderRadius: '12px',
                color: 'var(--text-darkest)',
                marginBottom: '1rem',
                lineHeight: 1.6,
              }}
            >
              BMR = 10 × W(kg) + 6.25 × H(cm) - 5 × A(y) + s
              <br />
              TDEE = BMR × Activity Multiplier
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Calculated BMR:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-darkest)' }}>{calculatedBmr} kcal/day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Maintenance TDEE:</span>
                <span style={{ fontWeight: 700, color: 'var(--text-darkest)' }}>{calculatedTdee} kcal/day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Program Deficit Target:</span>
                <span style={{ fontWeight: 700, color: '#059669' }}>{Math.max(1200, Math.round(calculatedTdee * 0.85))} kcal/day</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
