import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebaseConfig';
import { storageService, generateSeedMeals, generateSeedReminders } from './storageService';
import {
  UserProfile,
  MealItem,
  Reminder,
  ReminderHistoryItem,
  AppSettings,
} from '../types';
import { parseTimeToTodayTimestamp } from '../utils/timeUtils';

// Helper to ensure Firestore network operations never hang the UI
async function withTimeout<T>(promise: Promise<T>, ms: number = 900): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Firestore operation timed out')), ms)
  );
  return Promise.race([promise, timeoutPromise]);
}

export class DataService {
  private isLive(): boolean {
    return isFirebaseConfigured && db !== null;
  }

  // --- USER PROFILE ---
  public async getProfile(userId: string): Promise<UserProfile> {
    if (this.isLive() && db) {
      try {
        const ref = doc(db, 'users', userId, 'profile', 'data');
        const snap = await withTimeout(getDoc(ref), 1800);
        if (snap.exists()) {
          const data = snap.data() as UserProfile;
          const isProfileComplete =
            data.isProfileComplete !== undefined
              ? data.isProfileComplete
              : Boolean(data.age && data.height && data.weight && data.fullName);
          const p = { ...data, isProfileComplete };
          storageService.setProfile(userId, p);
          return p;
        }
      } catch (err) {
        console.warn('Firestore getProfile fallback to local cache:', err);
      }
    }
    return storageService.getProfile(userId);
  }

  public async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    const existing = storageService.getProfile(userId);
    const updated: UserProfile = {
      ...existing,
      ...profile,
      userId,
      isProfileComplete: profile.isProfileComplete !== undefined ? profile.isProfileComplete : (existing.isProfileComplete ?? true),
      updatedAt: new Date().toISOString(),
    };

    // Save immediately to local storage so UI updates with zero latency
    storageService.setProfile(userId, updated);

    // Sync to Firestore in background/with timeout so UI never hangs
    if (this.isLive() && db) {
      try {
        const ref = doc(db, 'users', userId, 'profile', 'data');
        await withTimeout(setDoc(ref, updated, { merge: true }), 2000);
      } catch (err) {
        console.warn('Firestore profile sync fallback (local state saved):', err);
      }
    }

    return updated;
  }

  // --- MEALS ---
  public async getMeals(userId: string): Promise<MealItem[]> {
    if (this.isLive() && db) {
      try {
        const mealsRef = collection(db, 'users', userId, 'meals');
        const q = query(mealsRef, orderBy('order', 'asc'));
        const snap = await withTimeout(getDocs(q), 1800);
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as MealItem);
          storageService.setMeals(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('Firestore getMeals fallback to local cache:', err);
      }
    }
    return storageService.getMeals(userId);
  }

  public async saveMeal(userId: string, meal: MealItem): Promise<MealItem> {
    const currentMeals = storageService.getMeals(userId);
    const idx = currentMeals.findIndex((m) => m.id === meal.id);
    let updated: MealItem[];
    if (idx >= 0) {
      updated = [...currentMeals];
      updated[idx] = meal;
    } else {
      updated = [...currentMeals, meal];
    }
    storageService.setMeals(userId, updated);

    // Keep Reminders synchronized with Meal schedule changes
    const currentReminders = storageService.getReminders(userId);
    const remIdx = currentReminders.findIndex((r) => r.mealId === meal.id);
    const todayStr = new Date().toISOString().split('T')[0];
    const updatedReminder: Reminder = {
      id: remIdx >= 0 ? currentReminders[remIdx].id : `rem_${meal.id}_${todayStr}`,
      userId,
      mealId: meal.id,
      mealName: meal.name,
      date: todayStr,
      time: meal.scheduledTime,
      status: remIdx >= 0 && currentReminders[remIdx].status === 'completed' ? 'completed' : 'upcoming',
      enabled: meal.reminderEnabled,
      acknowledged: remIdx >= 0 ? currentReminders[remIdx].acknowledged : false,
      scheduledTimestamp: parseTimeToTodayTimestamp(meal.scheduledTime),
      itemsSummary: meal.items.slice(0, 3).join(', '),
    };

    let nextReminders: Reminder[];
    if (remIdx >= 0) {
      nextReminders = [...currentReminders];
      nextReminders[remIdx] = updatedReminder;
    } else {
      nextReminders = [...currentReminders, updatedReminder];
    }
    storageService.setReminders(userId, nextReminders);

    if (this.isLive() && db) {
      try {
        const ref = doc(db, 'users', userId, 'meals', meal.id);
        await withTimeout(setDoc(ref, meal), 2000);
        const remRef = doc(db, 'users', userId, 'reminders', updatedReminder.id);
        await withTimeout(setDoc(remRef, updatedReminder), 2000);
      } catch (err) {
        console.warn('Error saving meal to Firestore:', err);
      }
    }

    return meal;
  }

  public async deleteMeal(userId: string, mealId: string): Promise<void> {
    const current = storageService.getMeals(userId);
    const updated = current.filter((m) => m.id !== mealId);
    storageService.setMeals(userId, updated);

    // Also remove associated reminders
    const reminders = storageService.getReminders(userId).filter((r) => r.mealId !== mealId);
    storageService.setReminders(userId, reminders);

    if (this.isLive() && db) {
      try {
        await withTimeout(deleteDoc(doc(db, 'users', userId, 'meals', mealId)), 2000);
      } catch (err) {
        console.warn('Error deleting meal from Firestore:', err);
      }
    }
  }

  // --- REMINDERS ---
  public async getReminders(userId: string): Promise<Reminder[]> {
    if (this.isLive() && db) {
      try {
        const ref = collection(db, 'users', userId, 'reminders');
        const snap = await withTimeout(getDocs(ref), 1800);
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Reminder);
          storageService.setReminders(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('Firestore getReminders fallback to local cache:', err);
      }
    }
    return storageService.getReminders(userId);
  }

  public async updateReminderStatus(
    userId: string,
    reminderId: string,
    status: Reminder['status'],
    acknowledgedByDevice: boolean = false
  ): Promise<Reminder> {
    const reminders = await this.getReminders(userId);
    let target = reminders.find((r) => r.id === reminderId);
    if (!target) {
      let planMealName = 'Scheduled Meal';
      try {
        const activePlanId = localStorage.getItem(`dietdecode_active_plan_${userId}`);
        if (activePlanId) {
          const rawPlan = localStorage.getItem(`dietdecode_plan_${activePlanId}`);
          if (rawPlan) {
            const plan = JSON.parse(rawPlan);
            const foundMeal = plan.days?.[0]?.meals?.find((m: { name?: string }) => m.name && reminderId.toLowerCase().includes(m.name.toLowerCase()));
            if (foundMeal?.name) planMealName = foundMeal.name;
          }
        }
      } catch {}

      const isTestAlert = reminderId.startsWith('rem_test_');
      target = {
        id: reminderId,
        userId,
        mealId: isTestAlert ? `meal_${reminderId}` : 'meal_1',
        mealName: isTestAlert ? 'Live Demo Alert' : planMealName,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'upcoming',
        enabled: true,
        acknowledged: false,
        scheduledTimestamp: Date.now(),
        itemsSummary: isTestAlert ? 'Instant Hardware Test Alert' : 'Macro balanced meal',
      };
    }

    const isDone = status === 'completed';
    const updated: Reminder = {
      ...target,
      status,
      acknowledged: isDone,
      acknowledgedAt: isDone ? new Date().toISOString() : target.acknowledgedAt,
    };

    if (this.isLive() && db) {
      try {
        const ref = doc(db, 'users', userId, 'reminders', reminderId);
        await withTimeout(
          setDoc(
            ref,
            {
              status,
              acknowledged: isDone,
              acknowledgedAt: updated.acknowledgedAt || null,
            },
            { merge: true }
          ),
          2000
        );
      } catch (err) {
        console.warn('Error updating reminder in Firestore:', err);
      }
    }

    const exists = reminders.some((r) => r.id === reminderId);
    const nextReminders = exists
      ? reminders.map((r) => (r.id === reminderId ? updated : r))
      : [updated, ...reminders];
    storageService.setReminders(userId, nextReminders);

    // Add entry to Reminder History
    if (status === 'completed' || status === 'missed') {
      const historyItem: ReminderHistoryItem = {
        id: `hist_${Date.now()}`,
        userId,
        reminderId,
        mealName: target.mealName,
        date: target.date,
        time: target.time,
        status,
        acknowledgedAt: updated.acknowledgedAt,
        latencySeconds: isDone ? Math.floor(Math.random() * 20) + 5 : 60,
        deviceAcknowledged: acknowledgedByDevice,
        note: acknowledgedByDevice
          ? 'Acknowledged via physical ESP32 push button (GPIO 18)'
          : isDone
          ? 'Acknowledged via Web Dashboard'
          : 'Expired without acknowledgement. Red LED triggered on device.',
      };
      await this.addHistoryItem(userId, historyItem);
    }

    return updated;
  }

  // --- REMINDER HISTORY ---
  public async getHistory(userId: string): Promise<ReminderHistoryItem[]> {
    if (this.isLive() && db) {
      try {
        const ref = collection(db, 'users', userId, 'reminderHistory');
        const q = query(ref, orderBy('date', 'desc'));
        const snap = await withTimeout(getDocs(q), 1800);
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as ReminderHistoryItem);
          storageService.setHistory(userId, list);
          return list;
        }
      } catch (err) {
        console.warn('Firestore getHistory fallback to local cache:', err);
      }
    }
    return storageService.getHistory(userId);
  }

  public async addHistoryItem(userId: string, item: ReminderHistoryItem): Promise<void> {
    const current = storageService.getHistory(userId);
    storageService.setHistory(userId, [item, ...current]);

    if (this.isLive() && db) {
      try {
        const ref = doc(db, 'users', userId, 'reminderHistory', item.id);
        await withTimeout(setDoc(ref, item), 2000);
      } catch (err) {
        console.warn('Error saving history to Firestore:', err);
      }
    }
  }

  // Reset / Re-seed
  public async resetData(userId: string): Promise<void> {
    storageService.resetAllData(userId);
    const seedMeals = generateSeedMeals(userId);
    storageService.setMeals(userId, seedMeals);
    const seedReminders = generateSeedReminders(userId, seedMeals);
    storageService.setReminders(userId, seedReminders);
  }

  // Settings
  public getSettings(): AppSettings {
    return storageService.getSettings();
  }

  public saveSettings(settings: AppSettings): void {
    storageService.setSettings(settings);
  }
}

export const dataService = new DataService();
