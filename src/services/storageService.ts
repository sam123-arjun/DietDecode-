import {
  User,
  UserProfile,
  MealItem,
  Reminder,
  ReminderHistoryItem,
  AppSettings,
} from '../types';
import { calculatePersonalizedDiet } from '../utils/nutritionEngine';
import { parseTimeToTodayTimestamp } from '../utils/timeUtils';

const STORAGE_KEYS = {
  USER: 'dietdecode_current_user',
  USERS_LIST: 'dietdecode_all_users',
  PROFILE: 'dietdecode_profile_',
  MEALS: 'dietdecode_meals_',
  REMINDERS: 'dietdecode_reminders_',
  HISTORY: 'dietdecode_history_',
  SETTINGS: 'dietdecode_settings',
};

export const DEFAULT_USER: User = {
  id: 'usr_demo_882',
  email: 'user@dietdecode.app',
  fullName: 'DietDecode User',
  createdAt: '2026-09-01T10:00:00.000Z',
};

export const DEFAULT_PROFILE: UserProfile = {
  userId: DEFAULT_USER.id,
  fullName: 'DietDecode User',
  isProfileComplete: true,
  age: 22,
  gender: 'male',
  height: 175,
  weight: 68,
  activityLevel: 'moderate',
  dietType: 'vegetarian',
  favoriteFoods: ['Oatmeal', 'Paneer', 'Brown Rice', 'Lentils', 'Makhana'],
  foodsToAvoid: ['Ultra-processed snacks', 'Deep fried food', 'Excess refined sugar'],
  allergies: ['Peanuts'],
  healthGoals: ['balanced_nutrition', 'muscle_gain'],
  targetCalories: 2250,
  targetProtein: 136,
  targetCarbs: 260,
  targetFats: 62,
  targetWaterLiters: 3.2,
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_SETTINGS: AppSettings = {
  useMockMode: true,
  esp32Endpoint: 'http://192.168.1.120',
  reminderDurationSeconds: 60, // 1 minute grace period
  snoozeDurationMinutes: 10,
  soundEnabled: true,
  theme: 'dark',
  ledConfig: {
    readyColor: 'green',
    activeColor: 'blue',
    missedColor: 'red',
  },
};

function getTodayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function generateSeedMeals(userId: string): MealItem[] {
  const dietOutput = calculatePersonalizedDiet(DEFAULT_PROFILE);
  return dietOutput.recommendedMeals.map((meal, index) => ({
    ...meal,
    id: `meal_${index + 1}_${userId}`,
    userId,
  }));
}

export function generateSeedReminders(userId: string, meals: MealItem[]): Reminder[] {
  const today = getTodayDateString();
  return meals.map((m, idx) => {
    // Make first meal completed for realistic demo
    const isFirst = idx === 0;
    return {
      id: `rem_${idx + 1}_${today}`,
      userId,
      mealId: m.id,
      mealName: m.name,
      date: today,
      time: m.scheduledTime,
      status: isFirst ? 'completed' : 'upcoming',
      enabled: m.reminderEnabled,
      acknowledged: isFirst,
      acknowledgedAt: isFirst ? `${today}T08:04:15.000Z` : undefined,
      scheduledTimestamp: parseTimeToTodayTimestamp(m.scheduledTime),
      itemsSummary: m.items.slice(0, 3).join(', '),
    };
  });
}

export function generateSeedHistory(userId: string): ReminderHistoryItem[] {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDateStr = yesterday.toISOString().split('T')[0];

  return [
    {
      id: `hist_1_${yDateStr}`,
      userId,
      reminderId: 'rem_hist_1',
      mealName: 'Breakfast',
      date: yDateStr,
      time: '08:00',
      status: 'completed',
      acknowledgedAt: `${yDateStr}T08:03:12.000Z`,
      latencySeconds: 18,
      deviceAcknowledged: true,
      note: 'Acknowledged via ESP32 push button (GPIO 18)',
    },
    {
      id: `hist_2_${yDateStr}`,
      userId,
      reminderId: 'rem_hist_2',
      mealName: 'Lunch',
      date: yDateStr,
      time: '13:00',
      status: 'completed',
      acknowledgedAt: `${yDateStr}T13:01:45.000Z`,
      latencySeconds: 9,
      deviceAcknowledged: true,
      note: 'Acknowledged via ESP32 push button (GPIO 18)',
    },
    {
      id: `hist_3_${yDateStr}`,
      userId,
      reminderId: 'rem_hist_3',
      mealName: 'Evening Snack',
      date: yDateStr,
      time: '17:00',
      status: 'missed',
      latencySeconds: 60,
      deviceAcknowledged: false,
      note: 'Grace period expired without push button acknowledgement. Red LED triggered.',
    },
    {
      id: `hist_4_${yDateStr}`,
      userId,
      reminderId: 'rem_hist_4',
      mealName: 'Dinner',
      date: yDateStr,
      time: '20:00',
      status: 'completed',
      acknowledgedAt: `${yDateStr}T20:05:30.000Z`,
      latencySeconds: 24,
      deviceAcknowledged: true,
      note: 'Acknowledged via ESP32 push button (GPIO 18)',
    },
  ];
}

class StorageService {
  // Current User
  getUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setUser(user: User | null): void {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }

  // Profile
  getProfile(userId: string): UserProfile {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.PROFILE}${userId}`);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const fresh: UserProfile = {
      ...DEFAULT_PROFILE,
      userId,
      isProfileComplete: userId === DEFAULT_USER.id,
    };
    this.setProfile(userId, fresh);
    return fresh;
  }

  setProfile(userId: string, profile: UserProfile): void {
    localStorage.setItem(`${STORAGE_KEYS.PROFILE}${userId}`, JSON.stringify(profile));
  }

  // Meals
  getMeals(userId: string): MealItem[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.MEALS}${userId}`);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const seed = generateSeedMeals(userId);
    this.setMeals(userId, seed);
    return seed;
  }

  setMeals(userId: string, meals: MealItem[]): void {
    localStorage.setItem(`${STORAGE_KEYS.MEALS}${userId}`, JSON.stringify(meals));
  }

  // Reminders
  getReminders(userId: string): Reminder[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.REMINDERS}${userId}`);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const meals = this.getMeals(userId);
    const seed = generateSeedReminders(userId, meals);
    this.setReminders(userId, seed);
    return seed;
  }

  setReminders(userId: string, reminders: Reminder[]): void {
    localStorage.setItem(`${STORAGE_KEYS.REMINDERS}${userId}`, JSON.stringify(reminders));
  }

  // History
  getHistory(userId: string): ReminderHistoryItem[] {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.HISTORY}${userId}`);
      if (data) return JSON.parse(data);
    } catch {
      // fallback
    }
    const seed = generateSeedHistory(userId);
    this.setHistory(userId, seed);
    return seed;
  }

  setHistory(userId: string, history: ReminderHistoryItem[]): void {
    localStorage.setItem(`${STORAGE_KEYS.HISTORY}${userId}`, JSON.stringify(history));
  }

  // Settings
  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  }

  setSettings(settings: AppSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  resetAllData(userId: string): void {
    localStorage.removeItem(`${STORAGE_KEYS.PROFILE}${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.MEALS}${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.REMINDERS}${userId}`);
    localStorage.removeItem(`${STORAGE_KEYS.HISTORY}${userId}`);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }
}

export const storageService = new StorageService();
