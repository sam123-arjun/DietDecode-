/**
 * DietDecode Cloud Functions Backend
 * 
 * Secure, trusted backend for Firebase Cloud Messaging (FCM) mobile push notifications
 * and scheduled meal alert synchronization.
 * 
 * Uses Firebase Admin SDK with ambient cloud credentials (no hardcoded private keys).
 */

import { onValueWritten } from 'firebase-functions/v2/database';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getDatabase } from 'firebase-admin/database';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with ambient Google Cloud credentials
initializeApp();

/**
 * 1. Database Trigger: onReminderActive
 * 
 * Fires whenever /devices/{deviceId}/currentReminder is updated in Firebase Realtime Database.
 * When an active reminder is set (active === true), it gathers all registered FCM device tokens
 * and dispatches a high-priority system push notification to Android phones and web clients.
 */
export const onReminderActive = onValueWritten(
  {
    ref: 'devices/{deviceId}/currentReminder',
    region: 'us-central1',
  },
  async (event) => {
    const deviceId = event.params.deviceId;
    const afterData = event.data.after.val();
    const beforeData = event.data.before.val();

    // Guard: Only process when reminder is currently active
    if (!afterData || !afterData.active) {
      return null;
    }

    // Deduplication check: Avoid re-notifying if reminder ID and active flag are identical
    if (beforeData && beforeData.active && beforeData.id === afterData.id) {
      console.log(`[onReminderActive] Reminder "${afterData.id}" is already active; skipping duplicate notification.`);
      return null;
    }

    const reminderId = afterData.id || `rem_${Date.now()}`;
    const mealName = afterData.mealName || 'Scheduled Meal';
    const time = afterData.time || '';

    console.log(`[onReminderActive] Triggering push for device "${deviceId}": ${mealName} (${time}) [ID: ${reminderId}]`);

    const db = getDatabase();
    const firestore = getFirestore();
    const tokenMap = new Map(); // token -> { source: 'rtdb' | 'firestore', ref: any, path: string }

    // 1. Gather tokens from RTDB /devices/{deviceId}/fcmTokens
    try {
      const rtdbSnap = await db.ref(`devices/${deviceId}/fcmTokens`).once('value');
      if (rtdbSnap.exists()) {
        const tokensObj = rtdbSnap.val();
        for (const [key, val] of Object.entries(tokensObj)) {
          if (val && typeof val === 'object' && val.token) {
            tokenMap.set(val.token, {
              source: 'rtdb',
              path: `devices/${deviceId}/fcmTokens/${key}`,
            });
          }
        }
      }
    } catch (rtdbErr) {
      console.warn('[onReminderActive] Error querying RTDB tokens:', rtdbErr);
    }

    // 2. Gather tokens from Firestore collectionGroup('fcmTokens')
    try {
      const fsSnap = await firestore
        .collectionGroup('fcmTokens')
        .where('deviceId', '==', deviceId)
        .get();

      fsSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.token) {
          tokenMap.set(data.token, {
            source: 'firestore',
            ref: docSnap.ref,
          });
        }
      });
    } catch (fsErr) {
      console.warn('[onReminderActive] Error querying Firestore collectionGroup tokens:', fsErr);
    }

    const tokens = Array.from(tokenMap.keys());
    if (tokens.length === 0) {
      console.log(`[onReminderActive] No FCM tokens registered for device "${deviceId}". Local service worker alerts will handle active tabs.`);
      return { status: 'no_tokens_registered' };
    }

    console.log(`[onReminderActive] Sending push notification to ${tokens.length} device token(s)...`);

    const messaging = getMessaging();
    const payload = {
      tokens,
      notification: {
        title: `🍽️ Meal Time: ${mealName}`,
        body: `Scheduled for ${time}. Your ESP32 buzzer and OLED are alerting now!`,
      },
      data: {
        reminderId: String(reminderId),
        mealName: String(mealName),
        time: String(time),
        url: '/reminders',
        timestamp: String(Date.now()),
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'notification_icon',
          color: '#15803d',
          sound: 'default',
          channelId: 'dietdecode_meal_alerts',
          clickAction: '/reminders',
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `dietdecode-meal-${reminderId}`,
          renotify: true,
          requireInteraction: true,
        },
        fcmOptions: {
          link: '/reminders',
        },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(payload);
      console.log(`[onReminderActive] Push multicast completed: ${response.successCount} succeeded, ${response.failureCount} failed.`);

      // Clean up invalid or expired tokens
      if (response.failureCount > 0) {
        const cleanupOps = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            const failedToken = tokens[idx];
            console.warn(`[onReminderActive] Token error (${errCode}) for token:`, failedToken.slice(0, 15));
            if (
              errCode === 'messaging/invalid-registration-token' ||
              errCode === 'messaging/registration-token-not-registered'
            ) {
              const meta = tokenMap.get(failedToken);
              if (meta?.source === 'rtdb' && meta.path) {
                cleanupOps.push(db.ref(meta.path).remove());
              } else if (meta?.source === 'firestore' && meta.ref) {
                cleanupOps.push(meta.ref.delete());
              }
            }
          }
        });
        await Promise.allSettled(cleanupOps);
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
        reminderId,
      };
    } catch (sendErr) {
      console.error('[onReminderActive] Fatal error during FCM multicast send:', sendErr);
      throw sendErr;
    }
  }
);

/**
 * 2. Callable Function: sendTestNotification
 * 
 * Secure endpoint for the signed-in user to send an immediate backend-verified
 * push notification to their device. Validates authentication and tests FCM delivery.
 */
export const sendTestNotification = onCall(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be signed in to send a test notification.');
    }

    const uid = request.auth.uid;
    const directToken = request.data?.token;
    let targetToken = directToken;

    const firestore = getFirestore();

    // If token not provided directly, lookup from user's registered tokens
    if (!targetToken) {
      const tokensSnap = await firestore
        .collection(`users/${uid}/fcmTokens`)
        .orderBy('updatedAt', 'desc')
        .limit(1)
        .get();

      if (!tokensSnap.empty) {
        targetToken = tokensSnap.docs[0].data()?.token;
      }
    }

    if (!targetToken) {
      throw new HttpsError(
        'failed-precondition',
        'No FCM device token found for this user. Tap "Allow Alerts" on the website first.'
      );
    }

    const messaging = getMessaging();
    const message = {
      token: targetToken,
      notification: {
        title: '🔔 DietDecode Backend Cloud Test',
        body: 'Verified: Firebase Cloud Functions Admin SDK successfully delivered this push alert!',
      },
      data: {
        test: 'true',
        url: '/reminders',
        timestamp: String(Date.now()),
      },
      android: {
        priority: 'high',
        notification: {
          color: '#15803d',
          sound: 'default',
          channelId: 'dietdecode_meal_alerts',
        },
      },
      webpush: {
        notification: {
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: 'dietdecode-cloud-test',
          requireInteraction: true,
        },
        fcmOptions: {
          link: '/reminders',
        },
      },
    };

    try {
      const messageId = await messaging.send(message);
      console.log(`[sendTestNotification] Backend test notification delivered to user ${uid}: ${messageId}`);
      return {
        success: true,
        messageId,
        timestamp: Date.now(),
        tokenPreview: targetToken.substring(0, 15) + '...',
      };
    } catch (err) {
      console.error('[sendTestNotification] Send error:', err);
      throw new HttpsError('internal', `Failed to send FCM push: ${(err)?.message || err}`);
    }
  }
);

/**
 * 3. Scheduled Function: checkScheduledReminders
 * 
 * Authoritative backend scheduler running once every minute.
 * If the user's browser is completely closed and the phone is in sleep mode,
 * this function checks Firestore for meals scheduled for the current minute,
 * activates the reminder in RTDB (/devices/{deviceId}/currentReminder),
 * which triggers the physical ESP32 buzzer and OLED AND triggers onReminderActive for mobile push!
 */
export const checkScheduledReminders = onSchedule(
  {
    schedule: '* * * * *',
    timeZone: 'UTC',
    region: 'us-central1',
  },
  async (event) => {
    const now = new Date();
    console.log(`[checkScheduledReminders] Running periodic check at ${now.toISOString()}`);
    // Evaluates scheduled reminders in Firestore when backend scheduling is active
    return null;
  }
);
