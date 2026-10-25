import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RotateCcw,
  Save,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Check,
  X,
  Flame,
  Dumbbell,
  Wheat,
  Droplets,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DietPlan, DietPlanDay, DietPlanMeal } from '../types';
import { AppPage } from '../components/common/Navbar';
import { formatTime12Hour } from '../utils/timeUtils';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface DietPlanPageProps {
  onNavigate?: (page: AppPage) => void;
}

export const DietPlanPage: React.FC<DietPlanPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activePlan, saveDietPlan, generateAndSavePlan, loading: contextLoading, profile } = useDiet();

  const [draft, setDraft] = useState<DietPlan | null>(activePlan);
  // planReady = context has finished its initial load (true as soon as !contextLoading)
  const [planReady, setPlanReady] = useState<boolean>(!contextLoading);
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState<boolean>(false);
  const [editingMealId, setEditingMealId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);

  // Sync draft when activePlan changes from outside (e.g. context refresh)
  // Also mark planReady once the context finishes loading (even if plan is null)
  useEffect(() => {
    if (!contextLoading) setPlanReady(true);
    if (activePlan && !isDirty) {
      setDraft(activePlan);
    }
  }, [activePlan, contextLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDay: DietPlanDay | undefined = draft?.days[selectedDay];

  const updateMealField = useCallback(<K extends keyof DietPlanMeal>(
    dayIndex: number,
    mealId: string,
    field: K,
    value: DietPlanMeal[K]
  ) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        updatedAt: new Date().toISOString(),
        days: prev.days.map((day) =>
          day.dayIndex !== dayIndex ? day : {
            ...day,
            meals: day.meals.map((meal) =>
              meal.id !== mealId ? meal : { ...meal, [field]: value }
            ),
          }
        ),
      };
    });
    setIsDirty(true);
  }, []);

  const updateMealItems = useCallback((dayIndex: number, mealId: string, raw: string) => {
    const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
    updateMealField(dayIndex, mealId, 'items', items);
  }, [updateMealField]);

  const handleSave = async () => {
    if (!draft) return;
    setIsSaving(true);
    try {
      await saveDietPlan(draft);
      setIsDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setConfirmRegenerate(false);
    setIsGenerating(true);
    try {
      const newPlan = await generateAndSavePlan();
      if (newPlan) {
        setDraft(newPlan);
        setIsDirty(false);
        setSelectedDay(0);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Day summary totals
  const getDayTotals = (day: DietPlanDay) => ({
    calories: day.meals.reduce((s, m) => s + m.calories, 0),
    protein: day.meals.reduce((s, m) => s + m.protein, 0),
    carbs: day.meals.reduce((s, m) => s + m.carbs, 0),
    fats: day.meals.reduce((s, m) => s + m.fats, 0),
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Show spinner only during initial load
  if (!planReady) {
    return <LoadingSpinner message="Loading your personalized diet plan..." />;
  }

  // ── No Plan Yet ──────────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div>
        <PageHeader
          title="Generate Your Diet Plan"
          subtitle="Build your personalized 7-day meal plan from your biometric profile."
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center',
            gap: '2rem',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={36} color="#ffffff" />
          </div>

          <div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-darkest)', marginBottom: '0.75rem' }}>
              No Active Plan Found
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: 1.6 }}>
              {profile?.isProfileComplete
                ? 'Generate your 7-day personalized plan using your saved biometric profile.'
                : 'Complete your profile first so DietDecode can calculate your nutrition targets.'}
            </p>
          </div>

          {profile?.isProfileComplete ? (
            <Button
              variant="primary"
              size="lg"
              onClick={handleRegenerate}
              isLoading={isGenerating}
              leftIcon={<Sparkles size={18} />}
            >
              Generate My 7-Day Plan
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onNavigate?.('profile')}
            >
              Complete Profile First →
            </Button>
          )}
        </div>
      </div>
    );
  }

  const targets = draft.nutritionTargets;
  const todayTotals = currentDay ? getDayTotals(currentDay) : null;

  return (
    <div>
      <PageHeader
        title={draft.name}
        subtitle={`Personalized 7-day meal plan · ${profile?.dietType || 'Vegetarian'} · ${targets.targetCalories} kcal/day target`}
        badge={
          <span className="badge chip-dark" style={{ fontSize: '0.75rem' }}>
            <CalendarDays size={12} style={{ marginRight: '4px' }} />
            7-Day Plan
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmRegenerate(true)}
              leftIcon={<RotateCcw size={14} />}
              isLoading={isGenerating}
            >
              Regenerate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              leftIcon={<Save size={14} />}
            >
              {isDirty ? 'Save Changes' : 'Save Plan'}
            </Button>
          </div>
        }
      />

      {/* Disclaimer */}
      <div
        style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '14px',
          padding: '0.85rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          marginBottom: '1.75rem',
          fontSize: '0.82rem',
          color: '#0369a1',
        }}
      >
        <Info size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Academic Engineering Capstone:</strong> Nutrition values are estimates via Mifflin-St Jeor and are for research demonstration, not clinical prescription.
        </span>
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '0.75rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#92400e',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={15} />
          Unsaved changes — click "Save Changes" to persist your edits.
        </div>
      )}

      {/* Save success */}
      {saveSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '0.75rem 1.1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#047857',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={15} />
          Diet plan saved and activated!
        </div>
      )}

      {/* Regenerate confirm dialog */}
      {confirmRegenerate && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '14px',
            padding: '1.1rem 1.4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '1.25rem',
          }}
        >
          <div style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 600 }}>
            ⚠️ This will replace your current plan with a new one. Any unsaved edits will be lost. Continue?
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button variant="outline" size="sm" onClick={() => setConfirmRegenerate(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleRegenerate} isLoading={isGenerating}>
              Yes, Regenerate
            </Button>
          </div>
        </div>
      )}

      {/* Daily Nutrition Summary */}
      {todayTotals && (
        <div className="card-waypilot" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Day {selectedDay + 1} — Estimated Daily Totals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            {[
              { label: 'Calories', value: `${todayTotals.calories} kcal`, target: `${targets.targetCalories}`, icon: <Flame size={14} />, color: '#f59e0b' },
              { label: 'Protein', value: `${todayTotals.protein}g`, target: `${targets.targetProtein}g`, icon: <Dumbbell size={14} />, color: '#7c3aed' },
              { label: 'Carbs', value: `${todayTotals.carbs}g`, target: `${targets.targetCarbs}g`, icon: <Wheat size={14} />, color: '#059669' },
              { label: 'Fats', value: `${todayTotals.fats}g`, target: `${targets.targetFats}g`, icon: null, color: '#d97706' },
              { label: 'Water', value: `${targets.targetWaterLiters}L`, target: 'Target', icon: <Droplets size={14} />, color: '#0284c7' },
            ].map((stat) => (
              <div key={stat.label} style={{ background: '#f8fafc', borderRadius: '12px', padding: '0.9rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  {stat.label}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-darkest)' }}>{stat.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>target: {stat.target}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Day Selector Tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        {draft.days.map((day, idx) => {
          const isToday = day.date === todayStr;
          const isSelected = idx === selectedDay;
          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(idx)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                border: isSelected ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                background: isSelected ? '#7c3aed' : isToday ? '#f5f3ff' : '#f8fafc',
                color: isSelected ? '#ffffff' : isToday ? '#7c3aed' : 'var(--text-darkest)',
                fontWeight: isSelected || isToday ? 700 : 500,
                fontSize: '0.82rem',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
            >
              {DAY_NAMES[idx % 7]}
              {isToday && (
                <span style={{ fontSize: '0.68rem', background: isSelected ? 'rgba(255,255,255,0.25)' : '#ede9fe', color: isSelected ? '#fff' : '#7c3aed', padding: '0.1rem 0.4rem', borderRadius: '9999px' }}>
                  Today
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day Label */}
      {currentDay && (
        <div style={{ marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-darkest)', letterSpacing: '-0.02em' }}>
            {FULL_DAY_NAMES[selectedDay % 7]} — {currentDay.date}
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Click any meal's items to edit. Changes are marked as unsaved until you click Save Changes.
          </p>
        </div>
      )}

      {/* Meals Grid */}
      {currentDay && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {currentDay.meals.map((meal) => {
            const isEditing = editingMealId === meal.id;
            const mealColorMap: Record<string, string> = {
              breakfast: '#f59e0b',
              lunch: '#059669',
              snack: '#0284c7',
              dinner: '#7c3aed',
            };
            const color = mealColorMap[meal.mealType] || '#64748b';

            return (
              <div
                key={meal.id}
                className="card-waypilot"
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', position: 'relative' }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {meal.mealType}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={12} color="var(--text-muted)" />
                    {isEditing ? (
                      <input
                        type="time"
                        value={meal.scheduledTime}
                        onChange={(e) => updateMealField(selectedDay, meal.id, 'scheduledTime', e.target.value)}
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.8rem',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '0.15rem 0.4rem',
                          width: '90px',
                        }}
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatTime12Hour(meal.scheduledTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Name */}
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0 }}>
                  {meal.name}
                </h4>

                {/* Macros */}
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span><strong style={{ color: '#f59e0b' }}>{meal.calories}</strong> kcal</span>
                  <span><strong style={{ color: '#7c3aed' }}>P {meal.protein}g</strong></span>
                  <span><strong style={{ color: '#059669' }}>C {meal.carbs}g</strong></span>
                  <span><strong style={{ color: '#d97706' }}>F {meal.fats}g</strong></span>
                </div>

                {/* Portion note */}
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                  {meal.portionNote}
                </p>

                {/* Items */}
                {isEditing ? (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                      Food Items (comma-separated)
                    </label>
                    <textarea
                      defaultValue={meal.items.join(', ')}
                      onBlur={(e) => updateMealItems(selectedDay, meal.id, e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '0.6rem 0.8rem',
                        fontSize: '0.82rem',
                        color: 'var(--text-darkest)',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {meal.items.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          padding: '0.18rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          color: 'var(--text-darkest)',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Reminder toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id={`rem_${meal.id}`}
                    checked={meal.reminderEnabled}
                    onChange={(e) => updateMealField(selectedDay, meal.id, 'reminderEnabled', e.target.checked)}
                    style={{ accentColor: color }}
                  />
                  <label htmlFor={`rem_${meal.id}`} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    ESP32 reminder enabled
                  </label>
                </div>

                {/* Edit toggle */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  {isEditing ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => { setEditingMealId(null); setEditingField(null); }}
                      leftIcon={<Check size={13} />}
                    >
                      Done Editing
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingMealId(meal.id)}
                      leftIcon={<Edit3 size={13} />}
                    >
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Save bar */}
      {isDirty && (
        <div
          style={{
            position: 'sticky',
            bottom: '1rem',
            display: 'flex',
            justifyContent: 'center',
            paddingBottom: '0.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-glass, #fff)',
              border: '1px solid #e2e8f0',
              borderRadius: '9999px',
              padding: '0.65rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Unsaved changes
            </span>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving} leftIcon={<Save size={13} />}>
              Save Plan
            </Button>
            {onNavigate && (
              <Button variant="outline" size="sm" onClick={() => onNavigate('dashboard')}>
                Dashboard →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
