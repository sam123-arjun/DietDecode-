/**
 * DietDecode Time & Real-Time Scheduling Utilities
 * Formats 24-hour time strings to 12-hour AM/PM and computes live countdown timers.
 */

/**
 * Converts a time string (e.g., "08:00", "13:00", "17:30", "20:00") into 12-hour AM/PM format.
 * Examples:
 *   "08:00" -> "08:00 AM"
 *   "13:00" -> "01:00 PM"
 *   "17:00" -> "05:00 PM"
 *   "20:00" -> "08:00 PM"
 *   "00:30" -> "12:30 AM"
 *   "12:00" -> "12:00 PM"
 * If the input already contains AM or PM, it normalizes and returns it.
 */
export function formatTime12Hour(timeStr?: string): string {
  if (!timeStr) return '--:--';
  const cleaned = timeStr.trim();

  // If already formatted with AM/PM
  if (/am|pm/i.test(cleaned)) {
    return cleaned.replace(/\s*(am|pm)/i, ' $1').toUpperCase();
  }

  const parts = cleaned.split(':');
  if (parts.length < 2) return cleaned;

  let hour = parseInt(parts[0], 10);
  const minutes = parts[1].slice(0, 2).padStart(2, '0');

  if (isNaN(hour)) return cleaned;

  const period = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;

  const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hourStr}:${minutes} ${period}`;
}

/**
 * Parses a time string (e.g. "13:00" or "01:00 PM") into today's local epoch timestamp (milliseconds).
 */
export function parseTimeToTodayTimestamp(timeStr: string, baseDate: Date = new Date()): number {
  if (!timeStr) return Date.now();
  const cleaned = timeStr.trim();

  let hour = 0;
  let minute = 0;

  if (/am|pm/i.test(cleaned)) {
    const isPM = /pm/i.test(cleaned);
    const timeWithoutPeriod = cleaned.replace(/am|pm/i, '').trim();
    const [h, m] = timeWithoutPeriod.split(':').map((v) => parseInt(v, 10));
    hour = isNaN(h) ? 0 : h;
    minute = isNaN(m) ? 0 : m;
    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;
  } else {
    const [h, m] = cleaned.split(':').map((v) => parseInt(v, 10));
    hour = isNaN(h) ? 0 : h;
    minute = isNaN(m) ? 0 : m;
  }

  const target = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    hour,
    minute,
    0,
    0
  );

  return target.getTime();
}

export interface TimeRemainingResult {
  formatted: string;
  diffSeconds: number;
  isPast: boolean;
  isDueNow: boolean;
}

/**
 * Computes human-readable countdown remaining until the target timestamp.
 * Ticks down in real time: e.g. "in 2h 15m 30s", "in 4m 12s", "in 18s", "Due now".
 */
export function getTimeRemaining(
  targetTimestamp: number,
  currentTimestamp: number = Date.now()
): TimeRemainingResult {
  const diffMs = targetTimestamp - currentTimestamp;
  const diffSeconds = Math.round(diffMs / 1000);

  // If due within the last 1 minute (grace period window), consider it "Due now"
  if (diffSeconds <= 0 && diffSeconds >= -60) {
    return {
      formatted: 'Due now',
      diffSeconds,
      isPast: false,
      isDueNow: true,
    };
  }

  if (diffSeconds < -60) {
    const absSec = Math.abs(diffSeconds);
    const hours = Math.floor(absSec / 3600);
    const mins = Math.floor((absSec % 3600) / 60);
    const pastStr = hours > 0 ? `${hours}h ${mins}m ago` : `${mins}m ago`;
    return {
      formatted: pastStr,
      diffSeconds,
      isPast: true,
      isDueNow: false,
    };
  }

  // Future countdown
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  let formatted = '';
  if (hours > 0) {
    formatted = `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    formatted = `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
  } else {
    formatted = `${seconds}s`;
  }

  return {
    formatted: `in ${formatted}`,
    diffSeconds,
    isPast: false,
    isDueNow: false,
  };
}

/**
 * Formats a grace period countdown in MM:SS (e.g. 180 -> "03:00", 65 -> "01:05")
 */
export function formatGraceCountdown(totalSecondsRemaining: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSecondsRemaining));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}
