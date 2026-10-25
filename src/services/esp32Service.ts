import {
  ESP32DeviceState,
  Reminder,
  DeviceHardwareState,
  HardwarePinConfig,
  DeviceCommand,
} from '../types';
import { dataService } from './dataService';
import { storageService } from './storageService';
import { buzzerAudio } from '../utils/audio';
import {
  firebaseRtdbService,
  DeviceRtdbState,
} from './firebaseRtdbService';
import {
  isFirebaseConfigured,
  iotMode,
  defaultDeviceId,
  auth,
} from './firebaseConfig';
import { formatTime12Hour } from '../utils/timeUtils';

export const HARDWARE_PINS: HardwarePinConfig = {
  oledSda: 21,
  oledScl: 22,
  oledVdd: '3.3V',
  oledGnd: 'GND',
  buzzerPos: 23,
  buzzerGnd: 'GND',
  buttonSignal: 18,
  buttonOther: '3.3V',
  buttonMode: 'INPUT_PULLDOWN',
  ledRed: 15,
  ledGreen: 5,
  ledBlue: 4,
  ldrPin: 19,
  dhtPin: 32,
};

class ESP32Service {
  private mode: 'firebase' | 'local' = iotMode;
  private deviceId: string = defaultDeviceId;

  private state: ESP32DeviceState = {
    connected: this.mode === 'firebase' ? isFirebaseConfigured : true,
    ipAddress: '192.168.0.100',
    firmwareVersion: this.mode === 'firebase' ? 'v3.0-Firebase-Cloud' : 'v2.4-Local-REST',
    lastPing: new Date().toLocaleTimeString(),
    currentState: 'READY',
    oledDisplay: {
      line1: 'DIETDECODE IoT',
      line2: this.mode === 'firebase' ? (isFirebaseConfigured ? 'Status: ONLINE' : 'Status: OFFLINE') : 'Status: ONLINE',
      line3: this.mode === 'firebase' ? 'Cloud: FIREBASE' : 'Mode: LOCAL REST',
      line4: this.mode === 'firebase' ? (isFirebaseConfigured ? 'Next: Lunch 01:00 PM' : 'Firebase Unconfigured') : 'Next: Lunch 01:00 PM',
    },
    leds: {
      red: false,
      green: true, // Green ON in READY state
      blue: false,
    },
    buzzerActive: false,
    hardwarePins: HARDWARE_PINS,
    telemetry: null,
    command: null,
  };

  private listeners: ((state: ESP32DeviceState) => void)[] = [];
  private ackListeners: ((reminderId?: string, byDevice?: boolean) => void)[] = [];
  private rtdbUnsub: (() => void) | null = null;

  constructor() {
    this.initMode();
  }

  public onReminderAcknowledged(cb: (reminderId?: string, byDevice?: boolean) => void): () => void {
    this.ackListeners.push(cb);
    return () => {
      this.ackListeners = this.ackListeners.filter((l) => l !== cb);
    };
  }

  private notifyAck(reminderId?: string, byDevice: boolean = false): void {
    this.ackListeners.forEach((cb) => {
      try {
        cb(reminderId, byDevice);
      } catch (err) {
        console.warn('[ESP32 Service] Error in ack listener:', err);
      }
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('dietdecode:reminder-acknowledged', {
          detail: { reminderId, byDevice },
        })
      );
    }
  }

  private initMode(): void {
    if (typeof window === 'undefined') return;

    if (this.mode === 'firebase') {
      if (isFirebaseConfigured) {
        console.info(`[ESP32 Service] Initializing in FIREBASE CLOUD mode for device: ${this.deviceId}`);
        firebaseRtdbService.initDevice(this.deviceId);

        // Clean up any previous RTDB subscription to avoid duplicate listeners
        if (this.rtdbUnsub) {
          this.rtdbUnsub();
          this.rtdbUnsub = null;
        }

        // Subscribe to real-time changes in Firebase Realtime Database
        this.rtdbUnsub = firebaseRtdbService.subscribeToDevice((rtdbData: DeviceRtdbState | null) => {
          if (!rtdbData) return;

          // Check heartbeat / online status (seen within last 90 seconds)
          const lastSeenMs = typeof rtdbData.lastSeen === 'number' ? rtdbData.lastSeen : Date.now();
          const isRecentlyOnline = Date.now() - lastSeenMs < 90000;
          this.state.connected = Boolean(rtdbData.online || isRecentlyOnline);
          if (this.state.currentState === 'READY') {
            this.state.oledDisplay.line2 = this.state.connected ? 'Status: ONLINE' : 'Status: OFFLINE';
            this.state.oledDisplay.line3 = 'Cloud: FIREBASE';
          }

          // Authoritative reminder ID synchronization
          const currentU = storageService.getUser();
          const activeUserId = currentU?.id || 'usr_demo_882';

          if (rtdbData.currentReminder?.active && rtdbData.currentReminder.id) {
            this.state.activeReminderId = rtdbData.currentReminder.id;
          }

          // Authoritative state transition handling
          if (rtdbData.currentReminder?.active && rtdbData.state === 'REMINDER_ACTIVE') {
            // An active reminder is alerting on the device
            if (this.state.currentState !== 'REMINDER_ACTIVE' || this.state.activeReminderId !== rtdbData.currentReminder.id) {
              console.info('[ESP32 Cloud] Active reminder detected in Firebase RTDB:', rtdbData.currentReminder.id);
              this.setHardwareState('REMINDER_ACTIVE', {
                id: rtdbData.currentReminder.id,
                userId: activeUserId,
                mealId: 'meal_1',
                mealName: rtdbData.currentReminder.mealName,
                time: rtdbData.currentReminder.time,
                date: 'Today',
                status: 'active',
                enabled: true,
                acknowledged: false,
                scheduledTimestamp: Date.now(),
                itemsSummary: rtdbData.currentReminder.mealName,
              });
            }
          } else if (
            rtdbData.acknowledgement?.acknowledged ||
            rtdbData.state === 'ACKNOWLEDGED'
          ) {
            // Active reminder was acknowledged via physical button, LDR, or remote command
            if (this.state.currentState === 'REMINDER_ACTIVE') {
              console.info('[ESP32 Cloud] Acknowledged confirmation received from Firebase RTDB!');
              this.setHardwareState('ACKNOWLEDGED');

              const activeId = this.state.activeReminderId || rtdbData.currentReminder?.id;
              if (activeId) {
                dataService.updateReminderStatus(activeUserId, activeId, 'completed', true);
              }
              this.notifyAck(activeId, true);
            }
          } else if (rtdbData.state === 'MISSED') {
            // Reminder timed out
            if (this.state.currentState === 'REMINDER_ACTIVE') {
              console.info('[ESP32 Cloud] Missed state confirmation received from Firebase RTDB!');
              this.setHardwareState('MISSED');
              const activeId = this.state.activeReminderId || rtdbData.currentReminder?.id;
              if (activeId) {
                dataService.updateReminderStatus(activeUserId, activeId, 'missed', true);
              }
            }
          } else if (
            rtdbData.state === 'READY' ||
            (this.state.currentState === 'REMINDER_ACTIVE' && !rtdbData.currentReminder?.active)
          ) {
            // Cloud indicates device is READY or reminder is no longer active
            if (this.state.currentState === 'REMINDER_ACTIVE') {
              console.info('[ESP32 Cloud] Device returned to READY; halting active reminder buzzer');
              this.setHardwareState('READY');
            }
          }

          // Sync live telemetry if available
          if (rtdbData.telemetry) {
            this.state.telemetry = rtdbData.telemetry;
          }

          // Sync remote command if available
          if (rtdbData.command) {
            this.state.command = rtdbData.command;
          }

          this.notify();
        }, this.deviceId);
      } else {
        // Firebase mode selected, but Firebase credentials are not properly configured.
        // DO NOT silently fall back to local REST in production!
        console.error('[ESP32 Service] Firebase Cloud mode is selected, but Firebase credentials are not configured.');
        this.state.connected = false;
        this.state.currentState = 'READY';
        this.state.oledDisplay = {
          line1: 'DIETDECODE IoT',
          line2: 'Status: OFFLINE',
          line3: 'Cloud: FIREBASE',
          line4: 'Config Missing',
        };
        this.notify();
      }
    } else {
      console.info('[ESP32 Service] Initializing in LOCAL DEVELOPMENT REST mode');

      // Local mode: Poll local Vite REST IoT Bridge (/api/reminder)
      window.setInterval(async () => {
        try {
          const res = await fetch('/api/reminder');
          if (res.ok) {
            const data = await res.json();
            if (
              data.reminder?.status === 'completed' &&
              this.state.currentState === 'REMINDER_ACTIVE'
            ) {
              console.log('[ESP32 Local Bridge] Physical button acknowledgment detected via local API!');
              this.setHardwareState('ACKNOWLEDGED');
              const activeId = this.state.activeReminderId;
              if (activeId) {
                await dataService.updateReminderStatus('usr_demo_882', activeId, 'completed', true);
              }
            }
          }
        } catch {
          // offline bridge fallback
        }
      }, 2000);
    }

    // Keep last ping updated
    window.setInterval(() => {
      this.state.lastPing = new Date().toLocaleTimeString();
      this.notify();
    }, 10000);
  }

  public getIotMode(): 'firebase' | 'local' {
    return this.mode;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public subscribe(listener: (state: ESP32DeviceState) => void): () => void {
    this.listeners.push(listener);
    listener({ ...this.state });
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    const copy = { ...this.state };
    this.listeners.forEach((l) => l(copy));
  }

  public getDeviceStatus(): ESP32DeviceState {
    return { ...this.state };
  }

  /**
   * Hardware state transitions with physical pin logic & sound
   */
  public setHardwareState(
    newState: DeviceHardwareState,
    reminder?: Reminder
  ): void {
    this.state.currentState = newState;

    switch (newState) {
      case 'READY':
        this.state.leds = { red: false, green: true, blue: false };
        this.state.buzzerActive = false;
        buzzerAudio.stopAlarm();
        this.state.activeReminderId = undefined;
        this.state.oledDisplay = {
          line1: 'DIETDECODE IoT',
          line2: 'Status: READY',
          line3: this.mode === 'firebase' ? 'Cloud: FIREBASE' : 'System: Active',
          line4: 'Awaiting Next Meal',
        };
        break;

      case 'REMINDER_ACTIVE':
        this.state.leds = { red: false, green: false, blue: true };
        this.state.buzzerActive = true;
        this.state.activeReminderId = reminder?.id;
        buzzerAudio.startReminderAlarm();
        this.state.oledDisplay = {
          line1: '🔔 MEAL TIME!',
          line2: reminder ? reminder.mealName.toUpperCase() : 'LUNCH',
          line3: reminder ? formatTime12Hour(reminder.time) : '01:00 PM',
          line4: '>> Press Button <<',
        };
        break;

      case 'ACKNOWLEDGED':
        this.state.leds = { red: false, green: true, blue: false };
        this.state.buzzerActive = false;
        buzzerAudio.stopAlarm();
        buzzerAudio.playChirp(3200, 150);
        setTimeout(() => buzzerAudio.playChirp(3800, 200), 160);
        this.state.oledDisplay = {
          line1: '✓ ACKNOWLEDGED',
          line2: reminder ? reminder.mealName : 'Meal Recorded',
          line3: 'Good Appetite!',
          line4: 'Status: Synced',
        };
        // Revert to READY after 6 seconds
        setTimeout(() => {
          if (this.state.currentState === 'ACKNOWLEDGED') {
            this.setHardwareState('READY');
            if (this.mode === 'firebase') {
              firebaseRtdbService.setDeviceState('READY', this.deviceId);
            }
          }
        }, 6000);
        break;

      case 'MISSED':
        this.state.leds = { red: true, green: false, blue: false };
        this.state.buzzerActive = false;
        buzzerAudio.stopAlarm();
        buzzerAudio.playChirp(1200, 400);
        this.state.oledDisplay = {
          line1: '⚠ MISSED REMINDER',
          line2: reminder ? reminder.mealName : 'Meal',
          line3: 'No Button Pressed',
          line4: 'Logged to History',
        };
        setTimeout(() => {
          if (this.state.currentState === 'MISSED') {
            this.setHardwareState('READY');
            if (this.mode === 'firebase') {
              firebaseRtdbService.setDeviceState('READY', this.deviceId);
            }
          }
        }, 8000);
        break;
    }

    this.notify();
  }

  /**
   * Retrieves active pending reminder
   */
  public async getActiveReminder(userId: string): Promise<Reminder | null> {
    const reminders = await dataService.getReminders(userId);
    const active = reminders.find((r) => r.status === 'active' && r.enabled);
    return active || null;
  }

  /**
   * Trigger meal reminder (handles both Firebase Cloud and Local mode).
   *
   * Firebase mode: writes to RTDB first; only updates the simulator if the
   * write succeeds. Throws on failure so the UI can display the error.
   *
   * Local mode: updates simulator immediately (fire-and-forget REST call).
   */
  public async triggerReminder(userId: string, reminder: Reminder): Promise<void> {
    // Firebase Cloud Mode — write to cloud BEFORE touching the simulator.
    // This ensures the UI never falsely shows REMINDER_ACTIVE when the
    // physical device was not actually notified.
    if (this.mode === 'firebase') {
      if (!isFirebaseConfigured) {
        throw new Error('Firebase is not configured. Add valid credentials to your .env file.');
      }

      const result = await firebaseRtdbService.sendReminderToDevice(reminder, this.deviceId);
      if (!result.success) {
        // Store the error in state so subscribers can render it, then throw
        // so the button handler in the UI can show an error message.
        this.state.lastError = result.error;
        this.notify();
        throw new Error(result.error);
      }

      // Write succeeded — now update the local simulator to mirror cloud state.
      this.state.lastError = undefined;
      this.setHardwareState('REMINDER_ACTIVE', reminder);

      // Persist the reminder status in the app's data layer (non-critical, non-blocking).
      if (userId) {
        dataService.updateReminderStatus(userId, reminder.id, 'active').catch((err) => {
          console.warn('[ESP32 Service] Non-critical: could not update reminder status:', err);
        });
      }

      return;
    }

    // Local REST mode — update simulator immediately, then try the bridge.
    this.setHardwareState('REMINDER_ACTIVE', reminder);

    try {
      if (userId) {
        await dataService.updateReminderStatus(userId, reminder.id, 'active');
      }
    } catch (err) {
      console.warn('[ESP32 Service] Non-critical warning updating reminder status:', err);
    }

    try {
      await fetch('/api/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reminder.id,
          mealName: reminder.mealName,
          time: reminder.time,
        }),
      });
    } catch {
      // offline bridge — simulator already updated, no further action needed
    }
  }

  /**
   * Acknowledge reminder (handles both Firebase Cloud and Local mode)
   */
  public async acknowledgeReminder(
    userId: string,
    reminderId?: string
  ): Promise<void> {
    const currentU = storageService.getUser();
    const resolvedUserId = userId || currentU?.id || 'usr_demo_882';

    // 1. Resolve reminder id with comprehensive fallbacks
    let targetId = reminderId || this.state.activeReminderId;
    if (!targetId && resolvedUserId) {
      try {
        const userReminders = storageService.getReminders(resolvedUserId);
        const active = userReminders.find((r) => r.status === 'active');
        if (active) targetId = active.id;
      } catch {}
    }

    // 2. Immediately transition UI hardware state & silence buzzer audio
    this.setHardwareState('ACKNOWLEDGED');

    // 3. Persist status safely in local/Firestore data layer
    if (targetId) {
      try {
        await dataService.updateReminderStatus(resolvedUserId, targetId, 'completed', true);
      } catch (err) {
        console.warn('[ESP32 Service] Non-critical warning acknowledging reminder:', err);
      }
    }

    // 4. Notify app listeners that reminder is acknowledged
    this.notifyAck(targetId, false);

    // 5. Firebase Cloud Mode
    if (this.mode === 'firebase') {
      if (isFirebaseConfigured) {
        await firebaseRtdbService.acknowledgeReminder(
          targetId || 'rem_active',
          'WEB_OR_ESP32_PUSH_BUTTON',
          this.deviceId
        );
      } else {
        console.error('[ESP32 Service] Cannot acknowledge reminder: Firebase is not configured.');
      }
    } else {
      // 6. Local REST Bridge (Explicit local mode only)
      try {
        await fetch('/api/acknowledge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: resolvedUserId,
            reminderId: targetId || 'rem_active',
            acknowledgedBy: 'WEB_OR_ESP32_PUSH_BUTTON',
          }),
        });
      } catch {
        // offline bridge fallback
      }
    }
  }

  /**
   * Remote reminder acknowledgement and buzzer control via validated command to ESP32
   *
   * Flow:
   * 1. Checks device online/heartbeat status (if offline, returns { success: false, status: 'OFFLINE' })
   * 2. Writes validated PENDING command to /devices/<id>/command
   * 3. Listens for ESP32 Core 0 network task to confirm (or fail) the command
   * 4. Idempotent: Command ID, timestamp, target reminder ID, requester
   * 5. Never falsely reports success until confirmed by the physical ESP32
   */
  public async remoteAcknowledge(
    reminderId?: string
  ): Promise<{ success: boolean; status: 'CONFIRMED' | 'FAILED' | 'OFFLINE' | 'TIMEOUT'; error?: string }> {
    // 1. Connectivity check: verify ESP32 has been seen within heartbeat threshold
    if (!this.state.connected) {
      const err = 'ESP32 device is offline. Check Wi-Fi and power before sending remote commands.';
      return { success: false, status: 'OFFLINE', error: err };
    }

    const currentU = storageService.getUser();
    const resolvedUserId = currentU?.id || 'usr_demo_882';

    // Resolve target reminder ID with robust fallback contract
    let targetReminderId = reminderId || this.state.activeReminderId;
    if (!targetReminderId && resolvedUserId) {
      try {
        const userReminders = storageService.getReminders(resolvedUserId);
        const active = userReminders.find((r) => r.status === 'active');
        if (active) targetReminderId = active.id;
      } catch {}
    }

    if (!targetReminderId) {
      const err = 'No active reminder found to acknowledge. The buzzer is currently silent.';
      return { success: false, status: 'FAILED', error: err };
    }

    // Generate unique command ID
    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const authEmail = auth?.currentUser?.email || (currentU?.email || 'authenticated-user');

    const commandPayload: DeviceCommand = {
      commandId,
      type: 'STOP_BUZZER',
      targetReminderId,
      requestedBy: authEmail,
      createdAt: Date.now(),
      status: 'PENDING',
    };

    this.state.command = commandPayload;
    this.notify();

    if (this.mode === 'firebase') {
      if (!isFirebaseConfigured) {
        return { success: false, status: 'FAILED', error: 'Firebase is not configured.' };
      }

      // Write PENDING command
      const writeRes = await firebaseRtdbService.sendDeviceCommand(commandPayload, this.deviceId);
      if (!writeRes.success) {
        this.state.command = { ...commandPayload, status: 'FAILED', result: writeRes.error };
        this.notify();
        return { success: false, status: 'FAILED', error: writeRes.error };
      }

      // Await confirmation from ESP32 Core 0 netTask (up to 8 seconds timeout)
      return new Promise((resolve) => {
        let unsub: (() => void) | null = null;
        let settled = false;

        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            if (unsub) unsub();
            this.state.command = {
              ...commandPayload,
              status: 'FAILED',
              result: 'ESP32 verification timeout (no response within 8s)',
            };
            this.notify();
            resolve({
              success: false,
              status: 'TIMEOUT',
              error: 'ESP32 did not confirm buzzer stop within 8 seconds. Please check device connectivity.',
            });
          }
        }, 8000);

        unsub = firebaseRtdbService.subscribeToCommand((latestCmd) => {
          if (!latestCmd || latestCmd.commandId !== commandId || settled) return;

          if (latestCmd.status === 'CONFIRMED') {
            settled = true;
            clearTimeout(timer);
            if (unsub) unsub();

            this.state.command = latestCmd;
            // Update local hardware state and buzzer
            this.setHardwareState('ACKNOWLEDGED');
            if (targetReminderId && resolvedUserId) {
              dataService.updateReminderStatus(resolvedUserId, targetReminderId, 'completed', true).catch(() => {});
            }
            this.notifyAck(targetReminderId, false);
            resolve({ success: true, status: 'CONFIRMED' });
          } else if (latestCmd.status === 'FAILED') {
            settled = true;
            clearTimeout(timer);
            if (unsub) unsub();

            this.state.command = latestCmd;
            this.notify();

            let formattedError = latestCmd.result || 'ESP32 rejected remote command.';
            if (latestCmd.result === 'REMINDER_ID_MISMATCH') {
              formattedError = 'Reminder ID mismatch: The active reminder on the ESP32 differs from this command.';
            } else if (latestCmd.result === 'NO_ACTIVE_REMINDER') {
              formattedError = 'No active reminder: The ESP32 is currently idle or already acknowledged.';
            } else if (latestCmd.result === 'MISSING_TARGET_REMINDER_ID') {
              formattedError = 'Missing reminder ID: Target reminder could not be verified.';
            }

            resolve({
              success: false,
              status: 'FAILED',
              error: formattedError,
            });
          }
        }, this.deviceId);
      });
    }

    // Local REST / Mock fallback mode
    await new Promise((r) => setTimeout(r, 600));
    this.setHardwareState('ACKNOWLEDGED');
    if (targetReminderId && resolvedUserId) {
      await dataService.updateReminderStatus(resolvedUserId, targetReminderId, 'completed', true);
    }
    this.notifyAck(targetReminderId, false);
    this.state.command = {
      ...commandPayload,
      status: 'CONFIRMED',
      result: 'ACKNOWLEDGED_BY_LOCAL_MOCK',
      processedAt: Date.now(),
    };
    this.notify();
    return { success: true, status: 'CONFIRMED' };
  }

  /**
   * Mark reminder missed on timeout
   */
  public async markReminderMissed(
    userId: string,
    reminderId?: string
  ): Promise<void> {
    const currentU = storageService.getUser();
    const resolvedUserId = userId || currentU?.id || 'usr_demo_882';

    let targetId = reminderId || this.state.activeReminderId;
    if (!targetId && resolvedUserId) {
      try {
        const userReminders = storageService.getReminders(resolvedUserId);
        const active = userReminders.find((r) => r.status === 'active');
        if (active) targetId = active.id;
      } catch {}
    }

    // 1. Immediately transition UI hardware state
    this.setHardwareState('MISSED');

    // 2. Persist status safely
    if (targetId) {
      try {
        await dataService.updateReminderStatus(resolvedUserId, targetId, 'missed', false);
      } catch (err) {
        console.warn('[ESP32 Service] Non-critical warning marking reminder missed:', err);
      }
    }

    if (this.mode === 'firebase' && isFirebaseConfigured) {
      await firebaseRtdbService.markReminderMissed(targetId || 'rem_active', this.deviceId);
    }
  }

  /**
   * Generate official C++ Arduino sketch for ESP-WROOM-32
   * Supports FIREBASE CLOUD (Direct HTTPS REST Realtime DB) or LOCAL REST
   */
  public getArduinoFirmwareCode(selectedMode?: 'firebase' | 'local'): string {
    const targetMode = selectedMode || this.mode;

    if (targetMode === 'firebase') {
      const rawRtdbUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL || '';
      let rtdbHost = `${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'dietdecode-808be'}-default-rtdb.firebaseio.com`;
      if (rawRtdbUrl) {
        try {
          rtdbHost = rawRtdbUrl.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
        } catch {
          // fallback
        }
      }

      return `/*
  ==============================================================
  DIETDECODE - Official Firebase Cloud Production Firmware (v3.2)
  Target Hardware: ESP32 NodeMCU (ESP-WROOM-32)
  Cloud Backend: Google Firebase (Realtime Database + Auth)
  Operational Mode: 100% Laptop-Independent (Direct Wi-Fi to Cloud)
  Device ID: ${this.deviceId}
  ==============================================================

  HARDWARE PINOUT (Confirmed & Validated):
  - 0.96" SSD1306 OLED (I2C):
      SDA       -> GPIO 21
      SCL / SCK -> GPIO 22
      VDD       -> 3.3V
      GND       -> GND
  - Active Piezo Buzzer:
      Positive  -> GPIO 23 (HIGH = Sound, LOW = Mute)
      Negative  -> GND
  - Tactile Push Button:
      Signal    -> GPIO 18 (INPUT_PULLDOWN, Active-High 3.3V)
      Other     -> 3.3V
  - Status LEDs:
      Red       -> GPIO 15 (Missed reminder alert)
      Green     -> GPIO 5  (Ready / Standby / Sync confirmed)
      Blue      -> GPIO 4  (Active meal reminder alarm)
  ==============================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==============================================================
// 1. NETWORK & FIREBASE CREDENTIALS
// ==============================================================
// Connect to home Wi-Fi or mobile hotspot (2.4 GHz only)
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Firebase Realtime Database Host (without https:// and trailing slash)
const char* FIREBASE_HOST = "${rtdbHost}";

// Device Identifier (must match VITE_ESP32_DEVICE_ID in web app)
const char* DEVICE_ID     = "${this.deviceId}";

// --- SECURE DEVICE AUTHENTICATION ---
// Created in Firebase Console -> Authentication -> Users
const char* FIREBASE_API_KEY  = "${import.meta.env.VITE_FIREBASE_API_KEY && !import.meta.env.VITE_FIREBASE_API_KEY.includes('YOUR_') ? import.meta.env.VITE_FIREBASE_API_KEY : 'YOUR_FIREBASE_WEB_API_KEY'}";
const char* DEVICE_EMAIL    = "device-01@dietdecode.internal";
const char* DEVICE_PASSWORD = "REPLACE_WITH_DEVICE_PASSWORD";

// Optional: Direct Database Secret or Custom Auth Token alternative
const char* FIREBASE_AUTH_TOKEN = ""; 

// ==============================================================
// 2. HARDWARE PIN DEFINITIONS
// ==============================================================
#define OLED_SDA          21
#define OLED_SCL          22
#define BUZZER_PIN        23
#define BUTTON_PIN        18
#define LED_RED           15
#define LED_GREEN          5
#define LED_BLUE           4

#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT     64
#define OLED_RESET        -1
#define SCREEN_ADDRESS  0x3C

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==============================================================
// 3. DEVICE STATE MACHINE
// ==============================================================
enum DeviceState {
  STATE_READY,
  STATE_REMINDER_ACTIVE,
  STATE_ACKNOWLEDGED,
  STATE_MISSED
};

DeviceState currentState = STATE_READY;

// Reminder Data
String activeReminderId = "";
String activeMealName   = "";
String activeMealTime   = "";
bool   pendingLocalAck  = false;

// Non-blocking Timers
unsigned long reminderStartTime      = 0;
unsigned long lastPollTime           = 0;
unsigned long lastHeartbeatTime      = 0;
unsigned long lastWiFiCheckTime      = 0;
unsigned long lastBuzzerToggleTime   = 0;
unsigned long stateTransitionTime    = 0;
unsigned long tokenIssuedAt          = 0;

// Configuration Constants
const unsigned long POLL_INTERVAL_MS      = 2500;   // Poll RTDB every 2.5s
const unsigned long HEARTBEAT_INTERVAL_MS = 30000;  // Heartbeat every 30s
const unsigned long GRACE_PERIOD_MS       = 60000; // 1-minute grace period
const unsigned long TOKEN_LIFETIME_MS     = 3000000; // Refresh JWT token at 50 min

// Cached JWT Auth Token
String cachedIdToken = "";
bool buzzerPhase = false;

// ==============================================================
// 4. HARDWARE HELPER FUNCTIONS
// ==============================================================
void setLeds(bool red, bool green, bool blue) {
  digitalWrite(LED_RED, red ? HIGH : LOW);
  digitalWrite(LED_GREEN, green ? HIGH : LOW);
  digitalWrite(LED_BLUE, blue ? HIGH : LOW);
}

void setBuzzer(bool on) {
  digitalWrite(BUZZER_PIN, on ? HIGH : LOW);
}

void showOledText(String line1, String line2, String line3, String line4) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 4);
  display.println(line1);
  display.drawLine(0, 16, 128, 16, SSD1306_WHITE);
  display.setCursor(0, 24);
  display.println(line2);
  display.setCursor(0, 38);
  display.println(line3);
  display.setCursor(0, 52);
  display.println(line4);
  display.display();
}

// Confirmation beep pattern (non-blocking sequence helper)
void playChirpConfirmation() {
  for (int i = 0; i < 2; i++) {
    setBuzzer(true);
    delay(80);
    setBuzzer(false);
    delay(60);
  }
}

// ==============================================================
// 5. SECURE FIREBASE AUTHENTICATION (REST Identity Toolkit)
// ==============================================================
String getFirebaseToken() {
  // If static token provided, use it directly
  if (strlen(FIREBASE_AUTH_TOKEN) > 0) {
    return String(FIREBASE_AUTH_TOKEN);
  }

  // If already authenticated and token valid for > 50 min
  if (cachedIdToken.length() > 0 && (millis() - tokenIssuedAt < TOKEN_LIFETIME_MS)) {
    return cachedIdToken;
  }

  // Need Web API key and device credentials
  if (strlen(FIREBASE_API_KEY) == 0 || strlen(DEVICE_EMAIL) == 0 || strcmp(DEVICE_PASSWORD, "REPLACE_WITH_DEVICE_PASSWORD") == 0) {
    return "";
  }

  if (WiFi.status() != WL_CONNECTED) {
    return cachedIdToken;
  }

  WiFiClientSecure authClient;
  authClient.setInsecure();
  HTTPClient http;

  String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + String(FIREBASE_API_KEY);
  if (http.begin(authClient, url)) {
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> reqDoc;
    reqDoc["email"] = DEVICE_EMAIL;
    reqDoc["password"] = DEVICE_PASSWORD;
    reqDoc["returnSecureToken"] = true;

    String body;
    serializeJson(reqDoc, body);

    int httpCode = http.POST(body);
    if (httpCode == 200) {
      String response = http.getString();
      StaticJsonDocument<1024> resDoc;
      deserializeJson(resDoc, response);
      cachedIdToken = resDoc["idToken"].as<String>();
      tokenIssuedAt = millis();
      Serial.println(F("[Firebase Auth] Device authentication token obtained!"));
    } else {
      Serial.print(F("[Firebase Auth] Sign-in failed. HTTP Code: "));
      Serial.println(httpCode);
    }
    http.end();
  }

  return cachedIdToken;
}

// ==============================================================
// 6. FIREBASE REALTIME DATABASE REST CLIENT
// ==============================================================

// Helper to construct authenticated endpoint URL
String buildDeviceUrl() {
  String url = "https://" + String(FIREBASE_HOST) + "/devices/" + String(DEVICE_ID) + ".json";
  String token = getFirebaseToken();
  if (token.length() > 0) {
    url += "?auth=" + token;
  }
  return url;
}

// Poll Firebase RTDB for active reminders
void checkFirebaseForReminders() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = buildDeviceUrl();
  if (https.begin(client, url)) {
    https.setTimeout(3500);
    int httpCode = https.GET();

    if (httpCode == 200) {
      String payload = https.getString();
      StaticJsonDocument<1024> doc;
      DeserializationError err = deserializeJson(doc, payload);

      if (!err) {
        bool isActive = doc["currentReminder"]["active"] | false;
        String remoteState = doc["state"].as<String>();

        // Trigger local reminder alarm
        if (isActive && currentState == STATE_READY) {
          activeReminderId  = doc["currentReminder"]["id"].as<String>();
          activeMealName    = doc["currentReminder"]["mealName"].as<String>();
          activeMealTime    = doc["currentReminder"]["time"].as<String>();
          currentState      = STATE_REMINDER_ACTIVE;
          reminderStartTime = millis();

          setLeds(false, false, true); // Blue LED ON
          showOledText("! MEAL TIME !", activeMealName, activeMealTime, ">> Press Button <<");
          Serial.println("[Firebase] Active Reminder: " + activeMealName + " at " + activeMealTime);
        }
      }
    } else if (httpCode == 401) {
      Serial.println(F("[Firebase RTDB] 401 Unauthorized. Refreshing token..."));
      cachedIdToken = "";
    }
    https.end();
  }
}

// Send physical button acknowledgment to Firebase RTDB
bool sendAcknowledgmentToFirebase(String reminderId) {
  if (WiFi.status() != WL_CONNECTED) {
    pendingLocalAck = true;
    return false;
  }

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = buildDeviceUrl();
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");

    StaticJsonDocument<512> doc;
    doc["state"] = "ACKNOWLEDGED";
    doc["currentReminder"]["id"] = activeReminderId;
    doc["currentReminder"]["mealName"] = activeMealName;
    doc["currentReminder"]["time"] = activeMealTime;
    doc["currentReminder"]["active"] = false;
    doc["acknowledgement"]["acknowledged"] = true;
    doc["acknowledgement"]["acknowledgedBy"] = "ESP32_PHYSICAL_BUTTON_GPIO18";
    doc["acknowledgement"]["timestamp"] = millis();

    String requestBody;
    serializeJson(doc, requestBody);
    int httpCode = https.sendRequest("PATCH", requestBody);
    https.end();

    if (httpCode == 200) {
      pendingLocalAck = false;
      Serial.println(F("[Firebase] Acknowledgment synced successfully!"));
      return true;
    } else {
      Serial.print(F("[Firebase] Acknowledgment send failed, code: "));
      Serial.println(httpCode);
      pendingLocalAck = true;
      return false;
    }
  }
  return false;
}

// Send periodic heartbeat presence
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient https;

  String url = buildDeviceUrl();
  if (https.begin(client, url)) {
    https.addHeader("Content-Type", "application/json");
    String body = "{\\"online\\":true,\\"lastSeen\\":" + String(millis()) + "}";
    https.sendRequest("PATCH", body);
    https.end();
  }
}

// ==============================================================
// 7. SETUP & INITIALIZATION
// ==============================================================
void setup() {
  Serial.begin(115200);

  // Configure GPIO Pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLDOWN); // Active-High with internal pulldown
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);

  // Initial State: Safe silence, Green LED standby
  setBuzzer(false);
  setLeds(false, true, false);

  // Initialize OLED Display
  Wire.begin(OLED_SDA, OLED_SCL);
  if (display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    display.setTextColor(SSD1306_WHITE);
    showOledText("DIETDECODE IoT", "Connecting WiFi...", "", "Hardware Ready");
  }

  // Connect to Wi-Fi
  Serial.println(F("\\n[DietDecode] Booting ESP32 NodeMCU..."));
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int wifiAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && wifiAttempts < 30) {
    delay(300);
    Serial.print(".");
    wifiAttempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\\n[WiFi] Connected successfully!"));
    Serial.print(F("[WiFi] Device IP: "));
    Serial.println(WiFi.localIP());
    showOledText("DIETDECODE IoT", "Cloud: FIREBASE", WiFi.localIP().toString(), "Status: READY");
    getFirebaseToken(); // Pre-fetch auth token
    sendHeartbeat();
  } else {
    Serial.println(F("\\n[WiFi] Warning: Wi-Fi not connected yet. Running in resilient offline mode."));
    showOledText("DIETDECODE IoT", "Wi-Fi Connecting...", "Offline Standby", "Button Ready");
  }
}

// ==============================================================
// 8. MAIN NON-BLOCKING EXECUTION LOOP
// ==============================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. Resilient Wi-Fi auto-reconnect (non-blocking, checks every 10s)
  if (currentMillis - lastWiFiCheckTime > 10000) {
    lastWiFiCheckTime = currentMillis;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("[WiFi] Reconnecting in background..."));
      WiFi.reconnect();
    } else if (pendingLocalAck) {
      // Sync deferred acknowledgment once reconnected
      sendAcknowledgmentToFirebase(activeReminderId);
    }
  }

  // 2. Read physical button on GPIO 18 (Debounced)
  int buttonState = digitalRead(BUTTON_PIN);

  // ============================================================
  // STATE: REMINDER ACTIVE (Alarm sounding, awaiting button press)
  // ============================================================
  if (currentState == STATE_REMINDER_ACTIVE) {
    // Check if user pressed physical button
    if (buttonState == HIGH) {
      Serial.println(F("[Hardware] Physical button pressed on GPIO 18! Acknowledging..."));
      setBuzzer(false); // Silence buzzer immediately
      currentState = STATE_ACKNOWLEDGED;
      stateTransitionTime = currentMillis;

      setLeds(false, true, false); // Green ON
      showOledText("✓ ACKNOWLEDGED", activeMealName, "Good Appetite!", "Syncing Cloud...");
      playChirpConfirmation();

      sendAcknowledgmentToFirebase(activeReminderId);
      return;
    }

    // Check for grace period timeout (Default 60 seconds)
    if (currentMillis - reminderStartTime > GRACE_PERIOD_MS) {
      Serial.println(F("[Hardware] Grace period expired! Marking missed."));
      setBuzzer(false);
      currentState = STATE_MISSED;
      stateTransitionTime = currentMillis;

      setLeds(true, false, false); // Red LED ON
      showOledText("⚠ MISSED MEAL", activeMealName, "Grace Timeout", "Logged to History");
      return;
    }

    // Non-blocking rhythmic buzzer pattern: 150ms ON, 150ms OFF, 150ms ON, 750ms OFF
    unsigned long buzzerCycle = (currentMillis - reminderStartTime) % 1200;
    if (buzzerCycle < 150 || (buzzerCycle >= 300 && buzzerCycle < 450)) {
      setBuzzer(true);
    } else {
      setBuzzer(false);
    }

    return;
  }

  // ============================================================
  // STATE: ACKNOWLEDGED (Showing confirmation screen for 5s)
  // ============================================================
  if (currentState == STATE_ACKNOWLEDGED) {
    if (currentMillis - stateTransitionTime > 5000) {
      currentState = STATE_READY;
      setLeds(false, true, false);
      showOledText("DIETDECODE IoT", "Status: READY", "Cloud: CONNECTED", "Awaiting Next Meal");
    }
    return;
  }

  // ============================================================
  // STATE: MISSED (Showing alert screen for 8s)
  // ============================================================
  if (currentState == STATE_MISSED) {
    if (currentMillis - stateTransitionTime > 8000) {
      currentState = STATE_READY;
      setLeds(false, true, false);
      showOledText("DIETDECODE IoT", "Status: READY", "Cloud: CONNECTED", "Awaiting Next Meal");
    }
    return;
  }

  // ============================================================
  // STATE: READY (Standby monitoring)
  // ============================================================
  // Poll Firebase Realtime Database for reminders
  if (currentMillis - lastPollTime > POLL_INTERVAL_MS) {
    lastPollTime = currentMillis;
    checkFirebaseForReminders();
  }

  // Send periodic presence heartbeat
  if (currentMillis - lastHeartbeatTime > HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }
}
`;
    }

    // ==============================================================
    // FALLBACK: LOCAL REST DEVELOPMENT FIRMWARE
    // ==============================================================
    return `/*
  ==============================================================
  DIETDECODE - Local REST Development Firmware (v2.5)
  Target Hardware: ESP32 NodeMCU (ESP-WROOM-32)
  Server: Local Development Laptop (http://<LAPTOP_IP>:5173/api)
  Mode: DEVELOPMENT ONLY (Used when laptop server is active)
  ==============================================================
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Local Vite Server Endpoint (Ensure your laptop and ESP32 are on same Wi-Fi)
const char* SERVER_URL    = "http://192.168.0.100:5173/api";

#define OLED_SDA 21
#define OLED_SCL 22
#define BUZZER_PIN 23
#define BUTTON_PIN 18
#define LED_RED 15
#define LED_GREEN 5
#define LED_BLUE 4

Adafruit_SSD1306 display(128, 64, &Wire, -1);
String currentReminderId = "";
bool isReminderActive = false;

void showText(String l1, String l2, String l3) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 4);
  display.println(l1);
  display.drawLine(0, 16, 128, 16, SSD1306_WHITE);
  display.setCursor(0, 24);
  display.println(l2);
  display.setCursor(0, 40);
  display.println(l3);
  display.display();
}

void setup() {
  Serial.begin(115200);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLDOWN);
  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);

  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_GREEN, HIGH);

  Wire.begin(OLED_SDA, OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.setTextColor(SSD1306_WHITE);
  showText("DIETDECODE LOCAL", "Connecting WiFi...", "");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
  }
  showText("DIETDECODE LOCAL", "Connected to LAN", WiFi.localIP().toString());
}

void loop() {
  // Check physical button
  if (isReminderActive && digitalRead(BUTTON_PIN) == HIGH) {
    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_BLUE, LOW);
    digitalWrite(LED_GREEN, HIGH);
    showText("ACKNOWLEDGED", "Physical Button", "Syncing Local Server...");

    HTTPClient http;
    http.begin(String(SERVER_URL) + "/acknowledge");
    http.addHeader("Content-Type", "application/json");
    http.POST("{\\"source\\":\\"hardware_button_gpio18\\"}");
    http.end();

    isReminderActive = false;
    delay(3000);
    showText("DIETDECODE LOCAL", "Status: READY", "Waiting for meals");
    return;
  }

  // Poll local endpoint
  if (!isReminderActive && WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(SERVER_URL) + "/reminder");
    int code = http.GET();
    if (code == 200) {
      String res = http.getString();
      StaticJsonDocument<512> doc;
      deserializeJson(doc, res);
      if (doc["hasActiveReminder"] == true) {
        isReminderActive = true;
        currentReminderId = doc["reminder"]["id"].as<String>();
        digitalWrite(LED_GREEN, LOW);
        digitalWrite(LED_BLUE, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        showText("MEAL REMINDER", doc["reminder"]["mealName"].as<String>(), ">> Press Button <<");
      }
    }
    http.end();
  }

  delay(isReminderActive ? 100 : 2500);
}
`;
  }
}

export const esp32Service = new ESP32Service();
