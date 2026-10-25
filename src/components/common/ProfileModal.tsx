import React, { useState } from 'react';
import { X, User, Activity, Flame, Scale, Ruler, Sparkles, CheckCircle2 } from 'lucide-react';
import { useDiet } from '../../context/DietContext';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, ActivityLevel, HealthGoal } from '../../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { profile, saveProfile } = useDiet();

  const [formData, setFormData] = useState<{
    fullName: string;
    age: number;
    gender: 'male' | 'female' | 'other';
    height: number;
    weight: number;
    activityLevel: ActivityLevel;
    healthGoal: HealthGoal;
  }>({
    fullName: user?.fullName || 'DietDecode User',
    age: profile?.age || 28,
    gender: profile?.gender || 'male',
    height: profile?.height || 178,
    weight: profile?.weight || 74,
    activityLevel: profile?.activityLevel || 'moderate',
    healthGoal: profile?.healthGoals?.[0] || 'weight_loss',
  });

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Mifflin-St Jeor calculation preview
  const bmr =
    10 * (formData.weight || 74) +
    6.25 * (formData.height || 178) -
    5 * (formData.age || 28) +
    (formData.gender === 'female' ? -161 : 5);

  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[formData.activityLevel] || 1.55));
  const suggestedCalories =
    formData.healthGoal === 'weight_loss'
      ? Math.round(tdee - 450)
      : formData.healthGoal === 'muscle_gain'
      ? Math.round(tdee + 350)
      : tdee;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const updated: Partial<UserProfile> = {
      fullName: formData.fullName,
      age: formData.age,
      gender: formData.gender,
      height: formData.height,
      weight: formData.weight,
      activityLevel: formData.activityLevel,
      healthGoals: [formData.healthGoal],
      targetCalories: suggestedCalories,
      updatedAt: new Date().toISOString(),
    };
    await saveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(12, 15, 23, 0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="card-waypilot"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2.25rem',
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <span className="eyebrow-healthtech" style={{ fontSize: '0.7rem' }}>
              Metabolic Configuration
            </span>
            <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-darkest)', marginTop: '0.35rem' }}>
              Personal Health Profile
            </h3>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Age (years)
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Weight (kg)
              </label>
              <input
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Activity Level
              </label>
              <select
                value={formData.activityLevel}
                onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value as ActivityLevel })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              >
                <option value="sedentary">Sedentary (Desk work)</option>
                <option value="light">Lightly Active (1-3 days)</option>
                <option value="moderate">Moderately Active (3-5 days)</option>
                <option value="very_active">Very Active (6-7 days)</option>
                <option value="extra_active">Extra Active (Athlete)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Primary Goal
              </label>
              <select
                value={formData.healthGoal}
                onChange={(e) => setFormData({ ...formData, healthGoal: e.target.value as HealthGoal })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #d1d5db',
                  marginTop: '0.35rem',
                  fontSize: '0.95rem',
                }}
              >
                <option value="weight_loss">Fat Loss (-450 kcal)</option>
                <option value="balanced_nutrition">Maintenance</option>
                <option value="muscle_gain">Muscle Gain (+350 kcal)</option>
                <option value="general_fitness">General Fitness</option>
              </select>
            </div>
          </div>

          {/* Computed Preview Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-around',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>BMR</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>{Math.round(bmr)} kcal</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>TDEE</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)' }}>{tdee} kcal</div>
            </div>
            <div style={{ borderLeft: '1px solid #e2e8f0' }} />
            <div>
              <div style={{ fontSize: '0.7rem', color: '#dc2626', textTransform: 'uppercase', fontWeight: 700 }}>Target Daily</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#dc2626' }}>{suggestedCalories} kcal</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                padding: '0.65rem 1.25rem',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-crimson"
              style={{
                backgroundColor: '#dc2626',
                padding: '0.65rem 1.6rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Recalculate & Save</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
