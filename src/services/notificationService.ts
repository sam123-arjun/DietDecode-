/**
 * DietDecode Notification Service
 *
 * Implements a complete, multi-tiered mobile & desktop notification architecture:
 * 1. Service Worker System Notifications (showNotification):
 *    - Fully compatible with Android Chrome (which blocks new Notification() in page context).
 *    - Displays actual system notifications in the Android notification shade with vibration and sound.
 * 2. Cross-tab & Repetition Deduplication:
 *    - Tagged by reminder ID (dietdecode-meal-<id>) so multiple triggers update rather than spam.
 *    - Cached timestamps with 4-hour automatic eviction.
 * 3. Firebase Cloud Messaging (FCM) Integration:
 *    - Registers service worker at root scope (/firebase-messaging-sw.js).
 *    - Retrieves and securely registers FCM Web Push device tokens in Firestore & RTDB.
 *    - Handles foreground and background push events without duplicate alerts.
 * 4. Transparent Diagnostics:
 *    - Clearly distinguishes between browser permission (granted), service worker readiness,
 *      and FCM background push token registration.
 */

import { getMessaging, getToken, onMessage, isSupported as isFCMSupported, Messaging } from 'firebase/messaging';
import { app, isFirebaseConfigured, defaultDeviceId } from './firebaseConfig';
import { auth, db, rtdb } from './firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, update } from 'firebase/database';

const NOTIFIED_CACHE_KEY = 'dietdecode_notified_reminders';
const FCM_TOKEN_STORAGE_KEY = 'dietdecode_fcm_token';

export interface NotificationDiagnostics {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  serviceWorkerSupported: boolean;
  serviceWorkerActive: boolean;
  vapidKeyConfigured: boolean;
  fcmSupported: boolean;
  fcmToken: string | null;
  backgroundPushReady: boolean;
  statusSummary: string;
}

class NotificationService {
  private notifiedIds = new Set<string>();
  private messagingInstance: Messaging | null = null;
  private fcmToken: string | null = null;
  private isInitializingFCM = false;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.cleanStaleNotifiedCache();
    if (typeof window !== 'undefined') {
      try {
        this.fcmToken = localStorage.getItem(FCM_TOKEN_STORAGE_KEY) || null;
      } catch {
        // ignore storage errors
      }
      // Proactively ensure service worker is registered if permission is already granted
      if (this.getPermission() === 'granted') {
        this.registerServiceWorker().then(() => {
          this.initFCM().catch(() => {});
        }).catch(() => {});
      }
    }
  }

  /**
   * Check if the browser supports the Notification API
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Check if Service Workers are supported
   */
  public isServiceWorkerSupported(): boolean {
    return typeof window !== 'undefined' && 'serviceWorker' in navigator;
  }

  /**
   * Current notification permission state
   */
  public getPermission(): NotificationPermission | 'unsupported' {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Request browser notification permission from user
   */
  public async requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.registerServiceWorker();
        await this.initFCM();
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('dietdecode:notification-permission-changed', {
            detail: { permission },
          })
        );
      }

      return permission;
    } catch (err) {
      console.warn('[NotificationService] Error requesting notification permission:', err);
      return Notification.permission;
    }
  }

  /**
   * Register the root service worker (/firebase-messaging-sw.js)
   */
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isServiceWorkerSupported()) return null;

    try {
      const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      });
      this.swRegistration = reg;
      console.info('[NotificationService] Service worker registered with scope:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[NotificationService] Service worker registration error:', err);
      return null;
    }
  }

  /**
   * Obtain active ServiceWorkerRegistration
   */
  private async getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isServiceWorkerSupported()) return null;
    if (this.swRegistration) return this.swRegistration;

    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg?.active) {
        this.swRegistration = reg;
        return reg;
      }
    } catch {
      // fallback
    }

    try {
      const readyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
      const readyReg = await Promise.race([readyPromise, timeoutPromise]);
      if (readyReg) {
        this.swRegistration = readyReg;
        return readyReg;
      }
    } catch {
      // fallback
    }

    return await this.registerServiceWorker();
  }

  /**
   * Initialize Firebase Cloud Messaging and obtain FCM registration token
   */
  public async initFCM(): Promise<string | null> {
    if (this.isInitializingFCM) return this.fcmToken;
    if (!isFirebaseConfigured || !app) {
      console.info('[NotificationService] Firebase not configured; skipping FCM token initialization.');
      return null;
    }

    const permission = this.getPermission();
    if (permission !== 'granted') return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
    if (!vapidKey || vapidKey.length < 20) {
      console.info('[NotificationService] VAPID key not configured in .env. ServiceWorker notifications active; FCM background token deferred.');
      return null;
    }

    this.isInitializingFCM = true;

    try {
      const supported = await isFCMSupported();
      if (!supported) {
        console.info('[NotificationService] FCM not supported in this browser environment.');
        return null;
      }

      if (!this.messagingInstance) {
        this.messagingInstance = getMessaging(app);
      }

      const swReg = await this.getServiceWorkerRegistration();
      if (!swReg) {
        console.warn('[NotificationService] Service worker registration unavailable for FCM token.');
        return null;
      }

      // Retrieve FCM token with VAPID key and ServiceWorkerRegistration
      const token = await getToken(this.messagingInstance, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        this.fcmToken = token;
        try {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        } catch {}

        console.info('[NotificationService] FCM token successfully registered:', token.substring(0, 15) + '...');
        await this.persistDeviceToken(token);

        // Listen for foreground FCM push messages
        onMessage(this.messagingInstance, (payload) => {
          console.info('[NotificationService] Received foreground FCM message:', payload);
          const title = payload.notification?.title || payload.data?.title || '🍽️ Meal Reminder';
          const body = payload.notification?.body || payload.data?.body || 'It is time for your meal!';
          const reminderId = payload.data?.reminderId || 'fcm_alert';
          this.showSystemNotification(title, {
            body,
            tag: `dietdecode-meal-${reminderId}`,
            data: { url: '/reminders', reminderId },
          });
        });

        return token;
      }
    } catch (err) {
      console.warn('[NotificationService] FCM token retrieval error:', err);
    } finally {
      this.isInitializingFCM = false;
    }

    return null;
  }

  /**
   * Persist device token to Firestore and Realtime Database associated with the authenticated user/device
   */
  private async persistDeviceToken(token: string): Promise<void> {
    const tokenHash = btoa(token.slice(-16)).replace(/[+/=]/g, '_');
    const deviceId = defaultDeviceId;
    const currentUser = auth?.currentUser;

    // 1. Persist to Firestore for user-targeted notification delivery
    if (db && currentUser) {
      try {
        const tokenRef = doc(db, `users/${currentUser.uid}/fcmTokens/${tokenHash}`);
        await setDoc(
          tokenRef,
          {
            token,
            device: navigator.userAgent,
            platform: 'web',
            updatedAt: serverTimestamp(),
            deviceId,
          },
          { merge: true }
        );
      } catch (err) {
        console.warn('[NotificationService] Could not persist FCM token to Firestore:', err);
      }
    }

    // 2. Persist to Realtime Database for device-triggered alerts
    if (rtdb && currentUser) {
      try {
        const rtdbTokenRef = ref(rtdb, `devices/${deviceId}/fcmTokens/${tokenHash}`);
        await update(rtdbTokenRef, {
          token,
          updatedAt: Date.now(),
          userId: currentUser.uid,
        });
      } catch (err) {
        // Non-critical if RTDB rules restrict sub-paths
        console.debug('[NotificationService] RTDB token registration notice:', err);
      }
    }
  }

  /**
   * Display an actual system notification on mobile (Android/Chrome) or desktop.
   * Uses ServiceWorkerRegistration.showNotification() to prevent the "Illegal constructor"
   * crash on Android Chrome.
   */
  public async showSystemNotification(
    title: string,
    options: NotificationOptions & { renotify?: boolean; vibrate?: number[] }
  ): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    // Default icon & badge
    const enrichedOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      renotify: true,
      requireInteraction: true,
      vibrate: [250, 100, 250, 100, 250],
      ...options,
    };

    // 1. Primary path: ServiceWorkerRegistration.showNotification (MANDATORY on Android Chrome)
    if (this.isServiceWorkerSupported()) {
      try {
        const reg = await this.getServiceWorkerRegistration();
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, enrichedOptions);
          return true;
        }
      } catch (swErr) {
        console.warn('[NotificationService] ServiceWorker showNotification failed, attempting fallback:', swErr);
      }
    }

    // 2. Secondary fallback: Window Notification constructor (Desktop Chrome/Firefox/Safari)
    try {
      const n = new Notification(title, enrichedOptions as NotificationOptions);
      n.onclick = () => {
        window.focus();
        n.close();
      };
      return true;
    } catch (windowErr) {
      console.warn('[NotificationService] System Notification could not be displayed:', windowErr);
      return false;
    }
  }

  /**
   * Dispatch a browser notification for an active meal or water reminder.
   * Guaranteed deduplicated & idempotently handled.
   */
  public async notifyMealAlert(
    reminder: {
      id: string;
      mealName: string;
      time: string;
    },
    force: boolean = false
  ): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const isWater =
      reminder.mealName.toLowerCase().includes('water') ||
      reminder.mealName.toLowerCase().includes('hydrat');

    if (isWater) {
      return this.notifyWaterAlert(reminder, force);
    }

    // Strict deduplication: Never dispatch duplicate alerts for the same reminder ID unless forced
    if (!force && this.wasAlreadyNotified(reminder.id)) {
      return false;
    }
    // Mark immediately to prevent race conditions from rapid ticks
    this.markAsNotified(reminder.id);

    const title = `🍽️ Meal Time: ${reminder.mealName}`;
    const options = {
      body: `Scheduled for ${reminder.time}. Your ESP32 buzzer and OLED are alerting now!`,
      tag: `dietdecode-meal-${reminder.id}`,
      data: {
        reminderId: reminder.id,
        url: '/reminders',
      },
      actions: [
        { action: 'open', title: 'Open DietDecode & Acknowledge' },
      ],
    };

    const delivered = await this.showSystemNotification(title, options);
    return delivered;
  }

  /**
   * Dispatch a dedicated water / hydration notification.
   */
  public async notifyWaterAlert(
    reminder: {
      id: string;
      mealName: string;
      time: string;
    },
    force: boolean = false
  ): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    // Strict deduplication: Never send duplicate water notifications for the same ID
    if (!force && this.wasAlreadyNotified(reminder.id)) {
      return false;
    }
    this.markAsNotified(reminder.id);

    const title = `💧 Water Reminder: Time to Hydrate!`;
    const options = {
      body: `1 hour has passed! Drink a glass of water (250ml) to hit your daily hydration goal.`,
      tag: `dietdecode-water-${reminder.id}`,
      vibrate: [250, 100, 250, 100, 250],
      data: {
        reminderId: reminder.id,
        url: '/reminders',
      },
      actions: [
        { action: 'open', title: 'I Drank Water 💧' },
      ],
    };

    return await this.showSystemNotification(title, options);
  }

  /**
   * Dispatch a high-priority alert notification when a reminder is MISSED (timed out).
   */
  public async notifyMissedAlert(
    reminder: {
      id: string;
      mealName: string;
      time: string;
    }
  ): Promise<boolean> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return false;
    }

    const missedTag = `dietdecode-missed-${reminder.id}`;
    if (this.wasAlreadyNotified(missedTag)) {
      return false;
    }
    this.markAsNotified(missedTag);

    const isWater =
      reminder.mealName.toLowerCase().includes('water') ||
      reminder.mealName.toLowerCase().includes('hydrat');

    const title = isWater ? `⚠️ Missed Water Reminder: Drink Water!` : `⚠️ Missed Meal Alert: ${reminder.mealName}`;
    const body = isWater
      ? `Your 1-hour hydration reminder at ${reminder.time} expired without acknowledgement. Drink a glass of water now!`
      : `Your scheduled meal reminder at ${reminder.time} was not acknowledged. Tap to log your meal.`;

    const options = {
      body,
      tag: missedTag,
      vibrate: [400, 150, 400],
      data: {
        reminderId: reminder.id,
        url: '/reminders',
      },
      actions: [
        { action: 'open', title: 'Open DietDecode' },
      ],
    };

    return await this.showSystemNotification(title, options);
  }

  /**
   * Send a safe test notification to verify mobile system alert delivery
   */
  public async sendTestNotification(): Promise<{
    success: boolean;
    channel: 'service_worker' | 'window' | 'unsupported';
    error?: string;
  }> {
    if (!this.isSupported()) {
      return { success: false, channel: 'unsupported', error: 'Notifications are not supported by this browser.' };
    }

    const permission = Notification.permission;
    if (permission !== 'granted') {
      return {
        success: false,
        channel: 'unsupported',
        error: `Notification permission is ${permission}. Tap "Allow Alerts" above first.`,
      };
    }

    const title = '🔔 DietDecode Mobile Alert Test';
    const options = {
      body: 'Real mobile system notifications are working! Your phone will alert when scheduled meals arrive.',
      tag: 'dietdecode-test-alert',
      data: {
        url: '/reminders',
        test: true,
      },
    };

    const delivered = await this.showSystemNotification(title, {
      ...options,
      vibrate: [200, 100, 200],
    });

    if (delivered) {
      return {
        success: true,
        channel: this.isServiceWorkerSupported() ? 'service_worker' : 'window',
      };
    }

    return {
      success: false,
      channel: 'unsupported',
      error: 'Failed to dispatch system notification. Check browser permissions.',
    };
  }

  /**
   * Test backend push delivery through Firebase Cloud Functions and Firebase Admin SDK
   */
  public async sendBackendTestPush(): Promise<{
    stage: 'requested' | 'backend_sent' | 'client_received' | 'error';
    success: boolean;
    error?: string;
    messageId?: string;
  }> {
    if (!this.isSupported() || this.getPermission() !== 'granted') {
      return {
        stage: 'error',
        success: false,
        error: 'Notification permission is not granted.',
      };
    }

    try {
      const { functions } = await import('./firebaseConfig');
      const { httpsCallable } = await import('firebase/functions');
      if (!functions) {
        return {
          stage: 'error',
          success: false,
          error: 'Firebase Cloud Functions not configured or offline.',
        };
      }

      const testFn = httpsCallable<{ token?: string }, { success: boolean; messageId: string }>(
        functions,
        'sendTestNotification'
      );
      const res = await testFn({ token: this.fcmToken || undefined });

      if (res.data && res.data.success) {
        return {
          stage: 'backend_sent',
          success: true,
          messageId: res.data.messageId,
        };
      }
      return {
        stage: 'error',
        success: false,
        error: 'Backend did not report success.',
      };
    } catch (err) {
      return {
        stage: 'error',
        success: false,
        error: (err as Error)?.message || 'Cloud Function call failed.',
      };
    }
  }

  /**
   * Clean cache of notifications older than 4 hours
   */
  private cleanStaleNotifiedCache(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
      if (!raw) return;
      const parsed: Record<string, number> = JSON.parse(raw);
      const now = Date.now();
      const fourHoursMs = 4 * 60 * 60 * 1000;
      const filtered: Record<string, number> = {};

      Object.entries(parsed).forEach(([id, timestamp]) => {
        if (now - timestamp < fourHoursMs) {
          filtered[id] = timestamp;
          this.notifiedIds.add(id);
        }
      });
      localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(filtered));
    } catch {
      // ignore cache issues
    }
  }

  /**
   * Check if this reminder was already notified recently
   */
  private wasAlreadyNotified(reminderId: string): boolean {
    if (this.notifiedIds.has(reminderId)) return true;

    try {
      const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
      if (raw) {
        const parsed: Record<string, number> = JSON.parse(raw);
        if (parsed[reminderId] && Date.now() - parsed[reminderId] < 300000) {
          this.notifiedIds.add(reminderId);
          return true;
        }
      }
    } catch {
      // ignore
    }

    return false;
  }

  /**
   * Record that a reminder notification was dispatched
   */
  private markAsNotified(reminderId: string): void {
    this.notifiedIds.add(reminderId);
    try {
      const raw = localStorage.getItem(NOTIFIED_CACHE_KEY);
      const parsed: Record<string, number> = raw ? JSON.parse(raw) : {};
      parsed[reminderId] = Date.now();
      localStorage.setItem(NOTIFIED_CACHE_KEY, JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }

  /**
   * Comprehensive capabilities and diagnostics
   */
  public async getDiagnostics(): Promise<NotificationDiagnostics> {
    const supported = this.isSupported();
    const permission = supported ? Notification.permission : 'unsupported';
    const swSupported = this.isServiceWorkerSupported();
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
    const vapidConfigured = Boolean(vapidKey && vapidKey.length > 20);

    let swActive = false;
    if (swSupported) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/');
        swActive = Boolean(reg?.active);
      } catch {}
    }

    let fcmSupp = false;
    if (supported && isFirebaseConfigured) {
      try {
        fcmSupp = await isFCMSupported();
      } catch {}
    }

    const backgroundPushReady = Boolean(permission === 'granted' && swActive && vapidConfigured && this.fcmToken);

    let statusSummary = 'Notifications not enabled';
    if (permission === 'denied') {
      statusSummary = 'Blocked by browser permissions';
    } else if (permission === 'granted') {
      if (backgroundPushReady) {
        statusSummary = 'Mobile Push & System Alerts Active (Foreground, Background & Closed)';
      } else if (swActive) {
        statusSummary = 'Mobile System Alerts Active (Foreground & Background Tab)';
      } else {
        statusSummary = 'Browser Permission Granted';
      }
    }

    return {
      supported,
      permission,
      serviceWorkerSupported: swSupported,
      serviceWorkerActive: swActive,
      vapidKeyConfigured: vapidConfigured,
      fcmSupported: fcmSupp,
      fcmToken: this.fcmToken,
      backgroundPushReady,
      statusSummary,
    };
  }
}

export const notificationService = new NotificationService();
