export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export type DietType =
  | 'vegetarian'
  | 'non-vegetarian'
  | 'vegan'
  | 'other';

export type HealthGoal =
  | 'weight_loss'
  | 'muscle_gain'
  | 'general_fitness'
  | 'balanced_nutrition'
  | 'weight_gain';

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

export interface User {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  isProfileComplete?: boolean;
  age: number;
  gender: Gender;
  height: number; // in cm
  weight: number; // in kg
  activityLevel: ActivityLevel;
  dietType: DietType;
  favoriteFoods: string[];
  foodsToAvoid: string[];
  allergies: string[];
  healthGoals: HealthGoal[];
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFats: number;
  targetWaterLiters: number;
  updatedAt: string;
}

/** A single meal within a DietPlanDay */
export interface DietPlanMeal {
  id: string;            // stable per-meal ID
  mealType: MealType;
  name: string;          // user-editable display name
  scheduledTime: string; // "HH:MM"
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionNote: string;
  reminderEnabled: boolean;
}

/** One day in a 7-day plan */
export interface DietPlanDay {
  dayIndex: number; // 0 = first day of the plan
  date: string;     // YYYY-MM-DD
  meals: DietPlanMeal[];
}

/** A versioned diet plan (7 days) */
export interface DietPlan {
  id: string;       // `plan_${userId}_${timestamp}`
  userId: string;
  name: string;     // e.g. "Week of Oct 9"
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  days: DietPlanDay[];
  nutritionTargets: {
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFats: number;
    targetWaterLiters: number;
  };
}

/** Legacy flat meal item — kept for backward compat */
export interface MealItem {
  id: string;
  userId: string;
  name: string;
  scheduledTime: string;
  items: string[];
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  waterMl: number;
  recommendationNotes: string;
  reminderEnabled: boolean;
  order: number;
}

export type ReminderStatus = 'upcoming' | 'active' | 'completed' | 'missed';

export type DeviceHardwareState =
  | 'READY'
  | 'REMINDER_ACTIVE'
  | 'ACKNOWLEDGED'
  | 'MISSED';

export interface Reminder {
  id: string;
  userId: string;
  mealId: string;
  mealName: string;
  date: string;
  time: string;
  status: ReminderStatus;
  enabled: boolean;
  acknowledged: boolean;
  acknowledgedAt?: string;
  scheduledTimestamp: number;
  itemsSummary: string;
  planId?: string;   // which DietPlan this reminder belongs to
  dayIndex?: number; // which day of the plan
}

export interface ReminderHistoryItem {
  id: string;
  userId: string;
  reminderId: string;
  mealName: string;
  date: string;
  time: string;
  status: 'completed' | 'missed';
  acknowledgedAt?: string;
  latencySeconds?: number;
  deviceAcknowledged: boolean;
  note?: string;
}

export interface HardwarePinConfig {
  readonly oledSda: 21;
  readonly oledScl: 22;
  readonly oledVdd: '3.3V';
  readonly oledGnd: 'GND';
  readonly buzzerPos: 23;
  readonly buzzerGnd: 'GND';
  readonly buttonSignal: 18;
  readonly buttonOther: '3.3V';
  readonly buttonMode: 'INPUT_PULLDOWN';
  readonly ledRed: 15;
  readonly ledGreen: 5;
  readonly ledBlue: 4;
  readonly ldrPin?: 19;
  readonly dhtPin?: 32;
}

export interface DeviceTelemetry {
  temperature: number | null;
  humidity: number | null;
  light: 'BRIGHT' | 'DARK' | string;
  timestamp: number;
  valid?: boolean;
}

export type DeviceCommandStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface DeviceCommand {
  commandId: string;
  type: 'STOP_BUZZER' | 'ACKNOWLEDGE';
  targetReminderId?: string;
  requestedBy?: string;
  createdAt: number;
  status: DeviceCommandStatus;
  result?: string;
  processedAt?: number;
}

export interface ESP32DeviceState {
  connected: boolean;
  ipAddress: string;
  firmwareVersion: string;
  lastPing: string;
  currentState: DeviceHardwareState;
  telemetry?: DeviceTelemetry | null;
  command?: DeviceCommand | null;
  oledDisplay: {
    line1: string;
    line2: string;
    line3: string;
    line4: string;
  };
  leds: {
    red: boolean;
    green: boolean;
    blue: boolean;
  };
  buzzerActive: boolean;
  activeReminderId?: string;
  hardwarePins: HardwarePinConfig;
  lastError?: string;
}

export interface AppSettings {
  useMockMode: boolean;
  esp32Endpoint: string;
  reminderDurationSeconds: number;
  snoozeDurationMinutes: number;
  soundEnabled: boolean;
  theme: 'dark';
  ledConfig: {
    readyColor: string;
    activeColor: string;
    missedColor: string;
  };
}

export interface NutritionEngineOutput {
  bmr: number;
  tdee: number;
  targetCalories: number;
  macroSplit: {
    proteinGrams: number;
    carbsGrams: number;
    fatsGrams: number;
  };
  waterLiters: number;
  recommendedMeals: Omit<MealItem, 'id' | 'userId'>[];
  rationale: string[];
}
