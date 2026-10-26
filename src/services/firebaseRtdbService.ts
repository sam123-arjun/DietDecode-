import {
  ref,
  set,
  update,
  onValue,
  get,
  serverTimestamp,
  DatabaseReference,
  Unsubscribe,
} from 'firebase/database';
import { rtdb, auth, isFirebaseConfigured, defaultDeviceId } from './firebaseConfig';
import { DeviceHardwareState, Reminder, DeviceTelemetry, DeviceCommand } from '../types';

export interface DeviceRtdbState {
  online: boolean;
  state: DeviceHardwareState | 'OFFLINE';
  lastSeen: number | string;
  firmwareVersion?: string;
  ipAddress?: string;
  currentReminder: {
    id: string;
    mealName: string;
    time: string;
    active: boolean;
    timestamp: number | string;
  };
  acknowledgement: {
    acknowledged: boolean;
    acknowledgedBy: string;
    timestamp: string;
  };
  telemetry?: DeviceTelemetry;
  command?: DeviceCommand;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 3500): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            'Firebase Realtime Database request timed out. Please check your connection or ESP32 node.'
          )
        ),
      ms
    )
  );
  return Promise.race([promise, timeoutPromise]);
}

class FirebaseRtdbService {
  private isAvailable(): boolean {
    return isFirebaseConfigured && rtdb !== null;
  }

  /**
   * Reference to a device's RTDB root
   */
  private getDeviceRef(deviceId: string = defaultDeviceId): DatabaseReference | null {
    if (!this.isAvailable() || !rtdb) return null;
    return ref(rtdb, `devices/${deviceId}`);
  }

  /**
   * Initialize a device in Realtime Database with default state if not already set
   */
  public async initDevice(deviceId: string = defaultDeviceId): Promise<void> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return;

    try {
      const snap = await get(deviceRef);
      if (!snap.exists()) {
        const initialState: DeviceRtdbState = {
          online: true,
          state: 'READY',
          lastSeen: Date.now(),
          firmwareVersion: 'v3.0-Firebase-Cloud',
          ipAddress: '192.168.0.100',
          currentReminder: {
            id: '',
            mealName: '',
            time: '',
            active: false,
            timestamp: Date.now(),
          },
          acknowledgement: {
            acknowledged: false,
            acknowledgedBy: '',
            timestamp: '',
          },
        };
        await set(deviceRef, initialState);
      }
    } catch (err) {
      console.warn('[RTDB] Error initializing device state:', err);
    }
  }

  /**
   * Send a meal reminder to the ESP32 via Firebase RTDB
   */
  public async sendReminderToDevice(
    reminder: Reminder,
    deviceId: string = defaultDeviceId
  ): Promise<{ success: boolean; error?: string }> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return { success: false, error: 'Firebase RTDB is not configured or offline' };

    // Guard: RTDB rules require auth != null. Without a signed-in Firebase user
    // the write will be rejected with PERMISSION_DENIED.
    if (!auth?.currentUser) {
      const msg =
        'Not signed in to Firebase. Log in with a real Firebase account to send alerts to the physical ESP32.';
      console.error('[RTDB] sendReminderToDevice blocked:', msg);
      return { success: false, error: msg };
    }

    try {
      await withTimeout(
        update(deviceRef, {
          state: 'REMINDER_ACTIVE',
          'currentReminder/id': reminder.id,
          'currentReminder/mealName': reminder.mealName,
          'currentReminder/time': reminder.time,
          'currentReminder/active': true,
          'currentReminder/timestamp': Date.now(),
          'acknowledgement/acknowledged': false,
          'acknowledgement/acknowledgedBy': '',
          'acknowledgement/timestamp': '',
        }),
        3500
      );
      console.info(`[RTDB] Reminder sent to cloud for device ${deviceId}:`, reminder.mealName);
      return { success: true };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.error('[RTDB] Failed to push reminder to Firebase RTDB:', errMsg);
      return {
        success: false,
        error: errMsg.includes('PERMISSION_DENIED')
          ? `Firebase RTDB Permission Denied for device "${deviceId}". Deploy database.rules.json or check that the signed-in user (${auth.currentUser?.email}) has write access to /devices/${deviceId}.`
          : errMsg,
      };
    }
  }

  /**
   * Acknowledge an active reminder in Firebase RTDB (from web or ESP32)
   */
  public async acknowledgeReminder(
    reminderId: string,
    acknowledgedBy: string = 'ESP32_PUSH_BUTTON_GPIO18',
    deviceId: string = defaultDeviceId
  ): Promise<void> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return;

    try {
      await withTimeout(
        update(deviceRef, {
          state: 'ACKNOWLEDGED',
          'currentReminder/active': false,
          'acknowledgement/acknowledged': true,
          'acknowledgement/acknowledgedBy': acknowledgedBy,
          'acknowledgement/timestamp': new Date().toISOString(),
        }),
        3500
      );
      console.info(`[RTDB] Device ${deviceId} acknowledged reminder ${reminderId} via ${acknowledgedBy}`);
    } catch (err) {
      console.error('[RTDB] Failed to acknowledge in Firebase RTDB:', err);
    }
  }

  /**
   * Mark reminder missed in Firebase RTDB
   */
  public async markReminderMissed(
    reminderId: string,
    deviceId: string = defaultDeviceId
  ): Promise<void> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return;

    try {
      await withTimeout(
        update(deviceRef, {
          state: 'MISSED',
          'currentReminder/active': false,
        }),
        3500
      );
    } catch (err) {
      console.error('[RTDB] Failed to set missed state in RTDB:', err);
    }
  }

  /**
   * Set device hardware state (READY, REMINDER_ACTIVE, ACKNOWLEDGED, MISSED, OFFLINE)
   */
  public async setDeviceState(
    state: DeviceHardwareState | 'OFFLINE',
    deviceId: string = defaultDeviceId
  ): Promise<void> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return;

    try {
      await update(deviceRef, { state });
    } catch (err) {
      console.warn('[RTDB] Error updating device state in RTDB:', err);
    }
  }

  /**
   * Listen to real-time changes of the device in Firebase RTDB
   */
  public subscribeToDevice(
    callback: (state: DeviceRtdbState | null) => void,
    deviceId: string = defaultDeviceId
  ): Unsubscribe | (() => void) {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) {
      return () => {};
    }

    return onValue(
      deviceRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val() as DeviceRtdbState);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('[RTDB] Error listening to device:', error);
      }
    );
  }

  /**
   * Set device online flag directly (without overwriting historical lastSeen timestamp)
   */
  public async setDeviceOnline(
    online: boolean,
    deviceId: string = defaultDeviceId
  ): Promise<void> {
    const deviceRef = this.getDeviceRef(deviceId);
    if (!deviceRef) return;

    try {
      await update(deviceRef, {
        online,
      });
      console.info(`[RTDB] Device ${deviceId} presence set to online: ${online}`);
    } catch (err) {
      console.warn('[RTDB] Error setting device presence:', err);
    }
  }


  /**
   * Listen specifically to live sensor telemetry of the device in Firebase RTDB
   */
  public subscribeToTelemetry(
    callback: (telemetry: DeviceTelemetry | null) => void,
    deviceId: string = defaultDeviceId
  ): Unsubscribe | (() => void) {
    if (!this.isAvailable() || !rtdb) return () => {};

    const telemetryRef = ref(rtdb, `devices/${deviceId}/telemetry`);
    return onValue(
      telemetryRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val() as DeviceTelemetry);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('[RTDB] Error listening to telemetry:', error);
      }
    );
  }

  /**
   * Write a remote command to /devices/<deviceId>/command in Firebase RTDB
   */
  public async sendDeviceCommand(
    command: DeviceCommand,
    deviceId: string = defaultDeviceId
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isAvailable() || !rtdb) {
      return { success: false, error: 'Firebase RTDB is not configured or offline' };
    }

    if (!auth?.currentUser) {
      const msg = 'Not signed in to Firebase. Log in to send remote commands to ESP32.';
      return { success: false, error: msg };
    }

    try {
      const commandRef = ref(rtdb, `devices/${deviceId}/command`);
      await set(commandRef, {
        commandId: command.commandId,
        type: command.type,
        targetReminderId: command.targetReminderId || '',
        requestedBy: command.requestedBy || auth.currentUser.email || 'web-user',
        createdAt: command.createdAt,
        status: command.status,
        result: command.result || '',
      });
      return { success: true };
    } catch (err: unknown) {
      const errMsg = (err as Error)?.message || String(err);
      console.error('[RTDB] Failed to send device command:', errMsg);
      return { success: false, error: errMsg };
    }
  }

  /**
   * Listen specifically to command status changes on /devices/<deviceId>/command in Firebase RTDB
   */
  public subscribeToCommand(
    callback: (command: DeviceCommand | null) => void,
    deviceId: string = defaultDeviceId
  ): Unsubscribe | (() => void) {
    if (!this.isAvailable() || !rtdb) return () => {};

    const commandRef = ref(rtdb, `devices/${deviceId}/command`);
    return onValue(
      commandRef,
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.val() as DeviceCommand);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.warn('[RTDB] Error listening to command:', error);
      }
    );
  }
}

export const firebaseRtdbService = new FirebaseRtdbService();
