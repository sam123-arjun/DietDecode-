import React, { createContext, useContext, useState, useEffect } from 'react';
import { ESP32DeviceState, Reminder } from '../types';
import { esp32Service } from '../services/esp32Service';
import { buzzerAudio } from '../utils/audio';
import { notificationService } from '../services/notificationService';

interface ESP32ContextType {
  deviceState: ESP32DeviceState;
  isMuted: boolean;
  iotMode: 'firebase' | 'local';
  deviceId: string;
  toggleBuzzerMute: () => void;
  triggerTestReminder: (reminder: Reminder, userId: string) => Promise<{ success: boolean; error?: string }>;
  pressPhysicalButton: (userId: string, reminderId?: string) => Promise<void>;
  remoteAcknowledge: (reminderId?: string) => Promise<{ success: boolean; status: 'CONFIRMED' | 'FAILED' | 'OFFLINE' | 'TIMEOUT'; error?: string }>;
  triggerMissedTimeout: (userId: string, reminderId?: string) => Promise<void>;
  firmwareCode: string;
  getFirmwareCode: (mode: 'firebase' | 'local') => string;
}

const ESP32Context = createContext<ESP32ContextType | undefined>(undefined);

export const ESP32Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceState, setDeviceState] = useState<ESP32DeviceState>(esp32Service.getDeviceStatus());
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const unsub = esp32Service.subscribe((latest) => {
      setDeviceState(latest);
    });
    return () => unsub();
  }, []);

  const toggleBuzzerMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    buzzerAudio.setMuted(next);
  };

  /**
   * Attempt to send a reminder to the physical device.
   * Returns { success: true } when the RTDB write (or local REST call) succeeded.
   * Returns { success: false, error } when it failed — callers MUST display this
   * error to the user instead of silently ignoring it.
   */
  const triggerTestReminder = async (
    reminder: Reminder,
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await esp32Service.triggerReminder(userId, reminder);
      notificationService.notifyMealAlert(reminder).catch((err) => {
        console.warn('[ESP32Context] Notification trigger note:', err);
      });
      return { success: true };
    } catch (err) {
      const message = (err as Error)?.message || 'Failed to send alert to device';
      return { success: false, error: message };
    }
  };

  const pressPhysicalButton = async (userId: string, reminderId?: string) => {
    await esp32Service.acknowledgeReminder(userId, reminderId);
  };

  const remoteAcknowledge = async (reminderId?: string) => {
    return await esp32Service.remoteAcknowledge(reminderId);
  };

  const triggerMissedTimeout = async (userId: string, reminderId?: string) => {
    await esp32Service.markReminderMissed(userId, reminderId);
  };

  return (
    <ESP32Context.Provider
      value={{
        deviceState,
        isMuted,
        iotMode: esp32Service.getIotMode(),
        deviceId: esp32Service.getDeviceId(),
        toggleBuzzerMute,
        triggerTestReminder,
        pressPhysicalButton,
        remoteAcknowledge,
        triggerMissedTimeout,
        firmwareCode: esp32Service.getArduinoFirmwareCode(),
        getFirmwareCode: (mode: 'firebase' | 'local') => esp32Service.getArduinoFirmwareCode(mode),
      }}
    >
      {children}
    </ESP32Context.Provider>
  );
};

export const useESP32 = (): ESP32ContextType => {
  const context = useContext(ESP32Context);
  if (!context) {
    throw new Error('useESP32 must be used within an ESP32Provider');
  }
  return context;
};
