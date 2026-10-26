import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  UserProfile,
  MealItem,
  Reminder,
  ReminderHistoryItem,
  AppSettings,
  NutritionEngineOutput,
  DietPlan,
} from '../types';
import { dataService } from '../services/dataService';
import { storageService } from '../services/storageService';
import { savePlan, getActivePlan, getPlanHistory } from '../services/planService';
import { useAuth } from './AuthContext';
import { calculatePersonalizedDiet, generate7DayPlan } from '../utils/nutritionEngine';
import { parseTimeToTodayTimestamp, formatTime12Hour } from '../utils/timeUtils';
import { esp32Service } from '../services/esp32Service';
import { notificationService } from '../services/notificationService';
import { buzzerAudio } from '../utils/audio';

interface DietContextType {
  profile: UserProfile | null;
  meals: MealItem[];
  reminders: Reminder[];
  history: ReminderHistoryItem[];
  settings: AppSettings;
  nutritionStats: NutritionEngineOutput | null;
  loading: boolean;
  activeReminder: Reminder | null;
  nextReminder: Reminder | null;
  /** Current real-time clock, synchronized second-by-second */
  currentTime: Date;
  /** Countdown in seconds remaining for active reminder grace period (null when no active reminder) */
  activeGraceRemainingSeconds: number | null;
  /** Trigger a quick demo alert in specified seconds for testing real-time scheduling */
  triggerQuickTestReminder: (seconds?: number, mealName?: string) => Promise<void>;
  /** Schedule a water reminder 1 hour from now (or specified hours ahead) */
  scheduleNextWaterReminder: (hoursAhead?: number) => Promise<Reminder>;
  /** Test a live 10-second water alert (buzzer, OLED, and hydration notification) */
  triggerQuickWaterTest: () => Promise<void>;
  /** Whether hourly water reminders are enabled */
  hourlyWaterRemindersEnabled: boolean;
  /** Toggle hourly water reminders */
  setHourlyWaterRemindersEnabled: (enabled: boolean) => void;
  /** The currently active 7-day DietPlan (null if none has been generated yet) */
  activePlan: DietPlan | null;
  /** All saved plan versions, newest first */
  planHistory: DietPlan[];
  saveProfile: (profile: Partial<UserProfile>) => Promise<UserProfile>;
  saveMeal: (meal: MealItem) => Promise<MealItem>;
  deleteMeal: (mealId: string) => Promise<void>;
  updateReminderStatus: (reminderId: string, status: Reminder['status'], byDevice?: boolean) => Promise<void>;
  /** Save a (possibly edited) DietPlan and mark it as active */
  saveDietPlan: (plan: DietPlan) => Promise<void>;
  /** Generate a brand new 7-day plan from the current profile and save it */
  generateAndSavePlan: () => Promise<DietPlan | null>;
  /** Legacy: kept for DietPlanPage button */
  generateDietPlanFromProfile: () => Promise<void>;
  resetAllData: () => Promise<void>;
  saveSettings: (settings: AppSettings) => void;
  refreshData: () => Promise<void>;
}

const DietContext = createContext<DietContextType | undefined>(undefined);

/** Derive today's flat MealItem[] from a DietPlan for backward compat consumers */
function mealsFromPlan(plan: DietPlan, userId: string): MealItem[] {
  const todayStr = new Date().toISOString().split('T')[0];
  const today = plan.days.find((d) => d.date === todayStr) ?? plan.days[0];
  if (!today) return [];

  return today.meals.map((pm, idx) => ({
    id: pm.id,
    userId,
    name: pm.name,
    scheduledTime: pm.scheduledTime,
    items: pm.items,
    calories: pm.calories,
    protein: pm.protein,
    carbs: pm.carbs,
    fats: pm.fats,
    waterMl: 400,
    recommendationNotes: pm.portionNote,
    reminderEnabled: pm.reminderEnabled,
    order: idx + 1,
  }));
}

/** Derive today's Reminders from today's plan meals */
function remindersFromMeals(
  planMeals: MealItem[],
  userId: string,
  planId: string
): Reminder[] {
  const todayStr = new Date().toISOString().split('T')[0];
  return planMeals.map((m, idx) => ({
    id: `rem_plan_${m.id}`,
    userId,
    mealId: m.id,
    mealName: m.name,
    date: todayStr,
    time: m.scheduledTime,
    status: 'upcoming' as const,
    enabled: m.reminderEnabled,
    acknowledged: false,
    scheduledTimestamp: parseTimeToTodayTimestamp(m.scheduledTime),
    itemsSummary: m.items.slice(0, 3).join(', '),
    planId,
    dayIndex: 0,
  }));
}

export const DietProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [activePlan, setActivePlan] = useState<DietPlan | null>(() => {
    const u = storageService.getUser();
    if (!u) return null;
    try {
      const planId = localStorage.getItem(`dietdecode_active_plan_${u.id}`);
      if (planId) {
        const raw = localStorage.getItem(`dietdecode_plan_${planId}`);
        if (raw) return JSON.parse(raw) as DietPlan;
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [planHistory, setPlanHistory] = useState<DietPlan[]>(() => {
    const u = storageService.getUser();
    if (!u) return [];
    try {
      const raw = localStorage.getItem(`dietdecode_plan_history_${u.id}`);
      if (raw) return JSON.parse(raw) as DietPlan[];
    } catch {
      // ignore
    }
    return [];
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const u = storageService.getUser();
    return u ? storageService.getProfile(u.id) : null;
  });

  const [meals, setMeals] = useState<MealItem[]>(() => {
    const u = storageService.getUser();
    if (!u) return [];
    // If active plan exists locally, derive meals from it immediately
    try {
      const planId = localStorage.getItem(`dietdecode_active_plan_${u.id}`);
      if (planId) {
        const raw = localStorage.getItem(`dietdecode_plan_${planId}`);
        if (raw) {
          const plan = JSON.parse(raw) as DietPlan;
          return mealsFromPlan(plan, u.id);
        }
      }
    } catch {}
    return storageService.getMeals(u.id);
  });

  const [reminders, setReminders] = useState<Reminder[]>(() => {
    const u = storageService.getUser();
    if (!u) return [];
    try {
      const planId = localStorage.getItem(`dietdecode_active_plan_${u.id}`);
      if (planId) {
        const raw = localStorage.getItem(`dietdecode_plan_${planId}`);
        if (raw) {
          const plan = JSON.parse(raw) as DietPlan;
          const planMeals = mealsFromPlan(plan, u.id);
          const pr = remindersFromMeals(planMeals, u.id, plan.id);
          const stored = storageService.getReminders(u.id);
          return pr.map((r) => {
            const ex = stored.find((s) => s.mealId === r.mealId);
            return ex ? { ...r, status: ex.status, acknowledged: ex.acknowledged } : r;
          });
        }
      }
    } catch {}
    return storageService.getReminders(u.id);
  });

  const [history, setHistory] = useState<ReminderHistoryItem[]>(() => {
    const u = storageService.getUser();
    return u ? storageService.getHistory(u.id) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(dataService.getSettings());
  const [loading, setLoading] = useState<boolean>(false);
  const [hourlyWaterRemindersEnabled, setHourlyWaterRemindersEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('dietdecode_hourly_water_enabled');
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const setHourlyWaterRemindersEnabled = (enabled: boolean) => {
    setHourlyWaterRemindersEnabledState(enabled);
    try {
      localStorage.setItem('dietdecode_hourly_water_enabled', String(enabled));
    } catch {}
    if (enabled) {
      scheduleNextWaterReminder(1).catch(() => {});
    }
  };

  const refreshData = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setMeals([]);
      setReminders([]);
      setHistory([]);
      setActivePlan(null);
      setPlanHistory([]);
      setLoading(false);
      return;
    }

    // 1. Hydrate immediately from local cache with zero latency
    const localProfile = storageService.getProfile(user.id);
    const localHistory = storageService.getHistory(user.id);
    setProfile(localProfile);
    setHistory(localHistory);
    setLoading(false);

    // 2. Background sync from Firestore (non-blocking)
    (async () => {
      try {
        const [plan, hist] = await Promise.all([
          getActivePlan(user.id),
          getPlanHistory(user.id),
        ]);
        if (plan) {
          setActivePlan(plan);
          setPlanHistory(hist);
          const planMeals = mealsFromPlan(plan, user.id);
          const planReminders = remindersFromMeals(planMeals, user.id, plan.id);
          setMeals(planMeals);
          const storedReminders = storageService.getReminders(user.id);
          const mergedReminders = planReminders.map((pr) => {
            const existing = storedReminders.find((sr) => sr.mealId === pr.mealId);
            return existing ? { ...pr, status: existing.status, acknowledged: existing.acknowledged, acknowledgedAt: existing.acknowledgedAt } : pr;
          });
          setReminders(mergedReminders);
        }
      } catch (err) {
        console.warn('[DietContext] Plan load used local cache:', err);
      }

      try {
        const [p, r, h] = await Promise.all([
          dataService.getProfile(user.id),
          dataService.getReminders(user.id),
          dataService.getHistory(user.id),
        ]);
        setProfile(p);
        if (!activePlan) {
          setReminders(r);
        }
        setHistory(h);
      } catch (err) {
        console.warn('[DietContext] Firestore refresh used local cache:', err);
      }
    })();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Synchronize when physical ESP32 or Firebase cloud acknowledges
  useEffect(() => {
    const unsub = esp32Service.onReminderAcknowledged((ackedId, byDevice) => {
      const currentU = user || storageService.getUser();
      if (!currentU) return;
      const target = ackedId
        ? reminders.find((r) => r.id === ackedId)
        : reminders.find((r) => r.status === 'active');
      if (target && target.status !== 'completed') {
        updateReminderStatus(target.id, 'completed', byDevice ?? true);
      }
    });

    const handleHwEvent = (e: Event) => {
      const custom = e as CustomEvent<{ reminderId?: string; byDevice?: boolean }>;
      const targetId = custom.detail?.reminderId;
      const currentU = user || storageService.getUser();
      if (!currentU) return;
      const target = targetId
        ? reminders.find((r) => r.id === targetId)
        : reminders.find((r) => r.status === 'active');
      if (target && target.status !== 'completed') {
        updateReminderStatus(target.id, 'completed', true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('dietdecode:reminder-acknowledged', handleHwEvent);
    }

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('dietdecode:reminder-acknowledged', handleHwEvent);
      }
    };
  }, [user, reminders]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time synchronization state
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [activeGraceRemainingSeconds, setActiveGraceRemainingSeconds] = useState<number | null>(null);
  const activeStartTimeRef = useRef<number | null>(null);
  const autoTriggeredIdsRef = useRef<Set<string>>(new Set());

  // 1-second interval: real-time ticker, auto-triggering scheduled meals, and grace period countdown
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      const nowMs = now.getTime();

      // 1. Monitor active reminder grace period countdown & notifications
      const currentActive = reminders.find((r) => r.status === 'active');
      if (currentActive) {
        notificationService.notifyMealAlert(currentActive);

        if (!activeStartTimeRef.current) {
          activeStartTimeRef.current = nowMs;
        }
        const graceTotal = settings.reminderDurationSeconds || 60;
        const elapsed = Math.floor((nowMs - activeStartTimeRef.current) / 1000);
        const remaining = Math.max(0, graceTotal - elapsed);
        setActiveGraceRemainingSeconds(remaining);

        if (remaining <= 0) {
          // Grace period expired without acknowledgement -> transition to missed
          const expiredReminder = { ...currentActive };
          activeStartTimeRef.current = null;
          setActiveGraceRemainingSeconds(null);
          updateReminderStatus(currentActive.id, 'missed');
          notificationService.notifyMissedAlert(expiredReminder).catch(() => {});
          if (user) {
            esp32Service.markReminderMissed(user.id, currentActive.id).catch(() => {});
          }
        }
      } else {
        activeStartTimeRef.current = null;
        setActiveGraceRemainingSeconds(null);
      }

      // 2. Monitor upcoming reminders and auto-trigger on arrival of scheduled time
      if (user) {
        reminders.forEach((r) => {
          if (r.status === 'upcoming' && r.enabled) {
            const schedTs = r.scheduledTimestamp || parseTimeToTodayTimestamp(r.time, now);
            const diffSec = Math.floor((nowMs - schedTs) / 1000);
            // If current time is within 0-59 seconds of scheduled time and not yet triggered
            if (diffSec >= 0 && diffSec < 60 && !autoTriggeredIdsRef.current.has(r.id)) {
              autoTriggeredIdsRef.current.add(r.id);
              updateReminderStatus(r.id, 'active');
              notificationService.notifyMealAlert(r, true);
              esp32Service.triggerReminder(user.id, r).catch((err) => {
                console.warn('[RealTimeTimer] Auto-trigger warning:', err);
              });
            }
          }
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reminders, settings.reminderDurationSeconds, user]);

  // Derive nutrition stats from profile
  const nutritionStats = profile ? calculatePersonalizedDiet(profile) : null;

  // Derive active and next reminder with dynamic time awareness
  const activeReminder = reminders.find((r) => r.status === 'active') || null;

  const upcomingReminders = reminders
    .filter((r) => r.status === 'upcoming' && r.enabled)
    .sort((a, b) => {
      const tsA = parseTimeToTodayTimestamp(a.time, currentTime);
      const tsB = parseTimeToTodayTimestamp(b.time, currentTime);
      return tsA - tsB;
    });

  // Next reminder is either the one due right now / in future, or first pending
  const nextReminder =
    upcomingReminders.find((r) => {
      const ts = parseTimeToTodayTimestamp(r.time, currentTime);
      return ts >= currentTime.getTime() - 60000;
    }) || upcomingReminders[0] || null;

  const saveProfile = async (updates: Partial<UserProfile>): Promise<UserProfile> => {
    if (!user) throw new Error('Not authenticated');
    const updated = await dataService.updateProfile(user.id, updates);
    setProfile(updated);
    return updated;
  };

  const saveMeal = async (meal: MealItem): Promise<MealItem> => {
    if (!user) throw new Error('Not authenticated');
    const saved = await dataService.saveMeal(user.id, meal);
    const updatedMeals = await dataService.getMeals(user.id);
    const updatedReminders = await dataService.getReminders(user.id);
    setMeals(updatedMeals);
    setReminders(updatedReminders);
    return saved;
  };

  const deleteMeal = async (mealId: string): Promise<void> => {
    if (!user) throw new Error('Not authenticated');
    await dataService.deleteMeal(user.id, mealId);
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
    setReminders((prev) => prev.filter((r) => r.mealId !== mealId));
  };

  const updateReminderStatus = async (
    reminderId: string,
    status: Reminder['status'],
    byDevice: boolean = false
  ): Promise<void> => {
    if (!user) return;
    const updated = await dataService.updateReminderStatus(user.id, reminderId, status, byDevice);

    if (status === 'completed') {
      buzzerAudio.stopAlarm();
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#00e5ff', '#00f5d4', '#10b981', '#38bdf8'],
        });
      } catch {
        // confetti fallback
      }

      // If completed from the web, ensure ESP32 hardware/simulator halts buzzer & transitions
      if (!byDevice) {
        esp32Service.acknowledgeReminder(user.id, reminderId).catch(() => {});
      }

      // If completed reminder was a water reminder, automatically schedule the next 1-hour water reminder!
      if (updated.mealName.toLowerCase().includes('water') && hourlyWaterRemindersEnabled) {
        scheduleNextWaterReminder(1).catch(() => {});
      }
    } else if (status === 'missed') {
      // Dispatch high-priority missed notification
      notificationService.notifyMissedAlert(updated).catch(() => {});
      if (!byDevice) {
        esp32Service.markReminderMissed(user.id, reminderId).catch(() => {});
      }

      // If a water reminder was missed, continue hydration cycle 1 hour later
      if (updated.mealName.toLowerCase().includes('water') && hourlyWaterRemindersEnabled) {
        scheduleNextWaterReminder(1).catch(() => {});
      }
    }

    // Preserve in-memory plan reminders and test alerts without wiping them from UI
    setReminders((prev) => {
      const exists = prev.some((r) => r.id === reminderId);
      if (exists) {
        return prev.map((r) => (r.id === reminderId ? updated : r));
      }
      return [updated, ...prev];
    });

    const h = await dataService.getHistory(user.id);
    setHistory(h);
  };

  /** Save a DietPlan (after user edits or on generation) and update UI state */
  const saveDietPlan = async (plan: DietPlan): Promise<void> => {
    if (!user) return;
    try {
      await savePlan(user.id, plan);
      setActivePlan(plan);
      setPlanHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== plan.id);
        return [plan, ...filtered];
      });
      // Update derived meals + reminders for today
      const planMeals = mealsFromPlan(plan, user.id);
      const planReminders = remindersFromMeals(planMeals, user.id, plan.id);
      setMeals(planMeals);
      setReminders(planReminders);
    } catch (err) {
      console.error('[DietContext] Failed to save plan:', err);
    }
  };

  /** Generate a new 7-day plan from the current profile, save and activate it */
  const generateAndSavePlan = async (): Promise<DietPlan | null> => {
    if (!user || !profile) return null;
    // generate7DayPlan is synchronous; saveDietPlan manages its own loading state
    const newPlan = generate7DayPlan(profile, user.id);
    await saveDietPlan(newPlan);
    return newPlan;
  };

  /** Legacy method — wraps generateAndSavePlan for backward compat */
  const generateDietPlanFromProfile = async (): Promise<void> => {
    await generateAndSavePlan();
  };

  const triggerQuickTestReminder = async (seconds: number = 10, mealName?: string): Promise<void> => {
    if (!user) return;
    const testDate = new Date(Date.now() + seconds * 1000);
    const hours = testDate.getHours().toString().padStart(2, '0');
    const minutes = testDate.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    const testTitle = mealName || 'Live 10s Demo Alert';

    const testReminder: Reminder = {
      id: `rem_test_${Date.now()}`,
      userId: user.id,
      mealId: `meal_test_${Date.now()}`,
      mealName: testTitle,
      date: testDate.toISOString().split('T')[0],
      time: timeStr,
      status: 'upcoming',
      enabled: true,
      acknowledged: false,
      scheduledTimestamp: testDate.getTime(),
      itemsSummary: 'Real-time test simulation',
    };

    // Prevent premature auto-trigger by ticker during countdown
    autoTriggeredIdsRef.current.add(testReminder.id);

    // Save into storage service so it persists across status updates
    const existingStored = storageService.getReminders(user.id);
    storageService.setReminders(user.id, [
      testReminder,
      ...existingStored.filter((r) => !r.id.startsWith('rem_test_')),
    ]);

    setReminders((prev) => [testReminder, ...prev.filter((r) => !r.id.startsWith('rem_test_'))]);

    setTimeout(async () => {
      await updateReminderStatus(testReminder.id, 'active');
      notificationService.notifyMealAlert(testReminder, true).catch(() => {});
      esp32Service.triggerReminder(user.id, testReminder).catch(() => {});
    }, seconds * 1000);
  };

  /** Schedule a dedicated water reminder 1 hour from now (or specified hours ahead) */
  const scheduleNextWaterReminder = async (hoursAhead: number = 1): Promise<Reminder> => {
    const targetUserId = user?.id || 'usr_demo_882';
    const targetDate = new Date();
    targetDate.setTime(targetDate.getTime() + hoursAhead * 60 * 60 * 1000);

    const timeStr = targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = targetDate.toISOString().split('T')[0];
    const waterId = `rem_water_${Date.now()}`;

    const waterReminder: Reminder = {
      id: waterId,
      userId: targetUserId,
      mealId: `meal_${waterId}`,
      mealName: 'Drink Water (Hydration)',
      date: dateStr,
      time: timeStr,
      status: 'upcoming',
      enabled: true,
      acknowledged: false,
      scheduledTimestamp: targetDate.getTime(),
      itemsSummary: '250ml Fresh Water • Hourly Hydration Goal',
    };

    const existing = storageService.getReminders(targetUserId);
    const updated = [waterReminder, ...existing];
    storageService.setReminders(targetUserId, updated);
    setReminders((prev) => [waterReminder, ...prev]);

    return waterReminder;
  };

  /** Test a live 10-second water alert (buzzer, OLED, and hydration notification) */
  const triggerQuickWaterTest = async (): Promise<void> => {
    const targetUserId = user?.id || 'usr_demo_882';
    const now = new Date();
    const testTarget = new Date(now.getTime() + 10000);
    const timeStr = testTarget.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = testTarget.toISOString().split('T')[0];
    const testWaterId = `rem_test_water_${Date.now()}`;

    const testReminder: Reminder = {
      id: testWaterId,
      userId: targetUserId,
      mealId: `meal_${testWaterId}`,
      mealName: 'Drink Water (Hydration)',
      date: dateStr,
      time: timeStr,
      status: 'upcoming',
      enabled: true,
      acknowledged: false,
      scheduledTimestamp: testTarget.getTime(),
      itemsSummary: 'Instant 10s Water Reminder Alert (250ml)',
    };

    const existingStored = storageService.getReminders(targetUserId);
    storageService.setReminders(targetUserId, [
      testReminder,
      ...existingStored.filter((r) => !r.id.startsWith('rem_test_')),
    ]);

    setReminders((prev) => [testReminder, ...prev.filter((r) => !r.id.startsWith('rem_test_'))]);

    setTimeout(async () => {
      await updateReminderStatus(testReminder.id, 'active');
      notificationService.notifyWaterAlert(testReminder, true).catch(() => {});
      esp32Service.triggerReminder(targetUserId, testReminder).catch(() => {});
    }, 10000);
  };

  const resetAllData = async (): Promise<void> => {
    if (!user) return;
    await dataService.resetData(user.id);
    setActivePlan(null);
    setPlanHistory([]);
    await refreshData();
  };

  const saveSettings = (newSettings: AppSettings): void => {
    dataService.saveSettings(newSettings);
    setSettings(newSettings);
  };

  return (
    <DietContext.Provider
      value={{
        profile,
        meals,
        reminders,
        history,
        settings,
        nutritionStats,
        loading,
        activeReminder,
        nextReminder,
        currentTime,
        activeGraceRemainingSeconds,
        triggerQuickTestReminder,
        scheduleNextWaterReminder,
        triggerQuickWaterTest,
        hourlyWaterRemindersEnabled,
        setHourlyWaterRemindersEnabled,
        activePlan,
        planHistory,
        saveProfile,
        saveMeal,
        deleteMeal,
        updateReminderStatus,
        saveDietPlan,
        generateAndSavePlan,
        generateDietPlanFromProfile,
        resetAllData,
        saveSettings,
        refreshData,
      }}
    >
      {children}
    </DietContext.Provider>
  );
};

export const useDiet = (): DietContextType => {
  const context = useContext(DietContext);
  if (!context) {
    throw new Error('useDiet must be used within a DietProvider');
  }
  return context;
};
