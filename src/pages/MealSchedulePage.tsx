import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Bell,
  BellOff,
  Check,
  Save,
  Utensils,
} from 'lucide-react';
import { useDiet } from '../context/DietContext';
import { useAuth } from '../context/AuthContext';
import { MealItem } from '../types';
import { PageHeader } from '../components/common/PageHeader';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatTime12Hour } from '../utils/timeUtils';

export const MealSchedulePage: React.FC = () => {
  const { user } = useAuth();
  const { meals, saveMeal, deleteMeal, loading } = useDiet();

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMeal, setEditingMeal] = useState<MealItem | null>(null);

  // Form states
  const [mealName, setMealName] = useState<string>('Breakfast');
  const [scheduledTime, setScheduledTime] = useState<string>('08:00');
  const [itemsString, setItemsString] = useState<string>('');
  const [calories, setCalories] = useState<number>(500);
  const [protein, setProtein] = useState<number>(25);
  const [carbs, setCarbs] = useState<number>(65);
  const [fats, setFats] = useState<number>(15);
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const openAddModal = () => {
    setEditingMeal(null);
    setMealName('');
    setScheduledTime('12:00');
    setItemsString('');
    setCalories(450);
    setProtein(20);
    setCarbs(60);
    setFats(12);
    setReminderEnabled(true);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (meal: MealItem) => {
    setEditingMeal(meal);
    setMealName(meal.name);
    setScheduledTime(meal.scheduledTime);
    setItemsString(meal.items.join(', '));
    setCalories(meal.calories);
    setProtein(meal.protein);
    setCarbs(meal.carbs);
    setFats(meal.fats);
    setReminderEnabled(meal.reminderEnabled);
    setNotes(meal.recommendationNotes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);

    const items = itemsString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: MealItem = {
      id: editingMeal ? editingMeal.id : `meal_${Date.now()}`,
      userId: user.id,
      name: mealName.trim() || 'Meal',
      scheduledTime,
      items: items.length ? items : ['Custom Dish'],
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fats: Number(fats) || 0,
      waterMl: 400,
      recommendationNotes: notes.trim(),
      reminderEnabled,
      order: editingMeal ? editingMeal.order : meals.length + 1,
    };

    try {
      await saveMeal(payload);
      setIsModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleReminder = async (meal: MealItem) => {
    await saveMeal({
      ...meal,
      reminderEnabled: !meal.reminderEnabled,
    });
  };

  if (loading && !meals.length) {
    return <LoadingSpinner message="Loading meal schedules..." />;
  }

  return (
    <div>
      <PageHeader
        title="Meal Schedule Manager"
        subtitle="Configure meal timings, food composition, and enable/disable physical ESP32 reminders."
        actions={
          <Button variant="primary" size="sm" onClick={openAddModal} leftIcon={<Plus size={16} />}>
            Add Meal Slot
          </Button>
        }
      />

      {/* Meals Table / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {meals.map((meal) => (
          <div
            key={meal.id}
            className="card-waypilot"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
              padding: '1.75rem 2rem',
            }}
          >
            {/* Left: Time and Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--text-darkest)',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '12px',
                  minWidth: '95px',
                  textAlign: 'center',
                }}
              >
                {formatTime12Hour(meal.scheduledTime)}
              </div>

              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-darkest)', margin: 0, letterSpacing: '-0.01em' }}>
                  {meal.name}
                </h3>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {meal.items.join(', ')}
                </div>
              </div>
            </div>

            {/* Middle: Macro specs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '0.85rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-darkest)' }}>{meal.calories} kcal</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{meal.protein}g Protein</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{meal.carbs}g Carbs</span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{meal.fats}g Fats</span>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <button
                onClick={() => handleToggleReminder(meal)}
                className={`btn btn-sm ${meal.reminderEnabled ? 'btn-secondary' : 'btn-outline'}`}
                title={meal.reminderEnabled ? 'Reminder ON (Click to disable)' : 'Reminder OFF (Click to enable)'}
              >
                {meal.reminderEnabled ? (
                  <>
                    <Bell size={13} color="#059669" /> Reminder ON
                  </>
                ) : (
                  <>
                    <BellOff size={13} color="#94a3b8" /> Reminder OFF
                  </>
                )}
              </button>

              <button
                onClick={() => openEditModal(meal)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: 'var(--text-darkest)',
                  cursor: 'pointer',
                  padding: '0.45rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                title="Edit Meal Details"
              >
                <Edit2 size={15} />
              </button>

              <button
                onClick={() => deleteMeal(meal.id)}
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  cursor: 'pointer',
                  padding: '0.45rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s ease',
                }}
                title="Delete Meal Slot"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Meal Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMeal ? 'Edit Scheduled Meal Slot' : 'Add New Meal Slot'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Meal Name</label>
              <input
                type="text"
                className="form-input"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                placeholder="e.g. Morning Breakfast"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Scheduled Time (24h)</label>
              <input
                type="time"
                className="form-input"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Dishes & Ingredients (comma-separated)</label>
            <input
              type="text"
              className="form-input"
              value={itemsString}
              onChange={(e) => setItemsString(e.target.value)}
              placeholder="e.g. Scrambled Eggs, Toast, Avocado, Black Coffee"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Calories</label>
              <input
                type="number"
                className="form-input"
                value={calories}
                onChange={(e) => setCalories(Number(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Protein (g)</label>
              <input
                type="number"
                className="form-input"
                value={protein}
                onChange={(e) => setProtein(Number(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Carbs (g)</label>
              <input
                type="number"
                className="form-input"
                value={carbs}
                onChange={(e) => setCarbs(Number(e.target.value))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Fats (g)</label>
              <input
                type="number"
                className="form-input"
                value={fats}
                onChange={(e) => setFats(Number(e.target.value))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="reminderCheck"
              checked={reminderEnabled}
              onChange={(e) => setReminderEnabled(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#0c0f17' }}
            />
            <label htmlFor="reminderCheck" style={{ fontSize: '0.875rem', color: 'var(--text-darkest)', fontWeight: 600 }}>
              Enable physical ESP32 OLED alert & buzzer notification for this meal
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" isLoading={isSaving} leftIcon={<Save size={16} />}>
              Save Meal Slot
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
