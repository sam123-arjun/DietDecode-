/*
  DietDecode ESP32 firmware v1.2.0

  Board : ESP32 Dev Module (ESP-WROOM-32, 30-pin)   Core: Arduino ESP32 3.x
  Serial: 115200

  ARCHITECTURE
    Core 1 (Arduino loop): button debounce, device state machine, LEDs, buzzer,
  OLED, non-blocking LDR and DHT22 sensor sampling. Never waits on the network.
    Core 0 (net task)    : Wi-Fi state machine, Firebase Auth (REST), database
  polling, heartbeat, acknowledgement writes. A slow or failed request only
  delays this task, never the hardware loop.

  HARDWARE CONNECTIONS
    OLED SSD1306 (I2C) : SDA=GPIO21, SCL=GPIO22, VCC=3V3, GND=GND (0x3C)
    Status LEDs        : Red=GPIO15, Green=GPIO5, Blue=GPIO4 (via 220 ohm)
    Active Buzzer      : GPIO23 (Positive), GND=GND
    Push Button        : GPIO18 (INPUT_PULLDOWN, Active-HIGH 3.3V)
    LDR Light Sensor   : DO/OUT=GPIO19 (Digital Input), VCC=3V3, GND=GND
    DHT22 Temp/Humid   : OUT/DATA=GPIO32, VCC=3V3, GND=GND

  Libraries (Library Manager): "Adafruit SSD1306", "Adafruit GFX Library",
  "DHT sensor library" (Adafruit), "Adafruit Unified Sensor", "ArduinoJson" (7.x).
  WiFi, WiFiClientSecure, HTTPClient and Wire come with the ESP32 core.

  Secrets: copy secrets.example.h to secrets.h and fill it in. secrets.h is
  git-ignored. Nothing secret (Wi-Fi password, Firebase password, tokens) is
  ever printed.
*/

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <strings.h>
#include <time.h>

#if ESP_ARDUINO_VERSION_MAJOR < 3
#error                                                                         \
    "Needs the Arduino ESP32 core 3.x (Boards Manager -> esp32 by Espressif Systems)."
#endif

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error                                                                         \
    "secrets.h not found. Copy secrets.example.h to secrets.h and fill in your values."
#endif

#define FW_VERSION "1.2.0"

// ============================================================================
// SHARED STATE & TYPES
// ============================================================================
enum DevState : uint8_t { DS_READY, DS_ACTIVE, DS_ACKNOWLEDGED, DS_MISSED };
enum RemoteState : uint8_t {
  RM_NONE,
  RM_READY,
  RM_REMINDER_ACTIVE,
  RM_ACKNOWLEDGED,
  RM_MISSED,
  RM_OFFLINE,
  RM_OTHER
};

struct Shared {
  bool wifiUp;
  bool haveData;  // at least one successful poll since boot
  char cloud[20]; // short cloud status text for the OLED

  // Latest remote snapshot (written by the net task)
  uint32_t remoteSeq;
  bool remoteActive;
  bool remoteAcked;
  RemoteState remoteState;
  char remoteId[40];
  char remoteMeal[32];
  char remoteTime[24];

  // Local device state (owned by the hardware loop)
  DevState ds;
  uint32_t dsSince;
  char id[40];
  char meal[32];
  char timeStr[24];

  // Acknowledgement waiting to be written to Firebase
  bool ackPending;
  char ackId[40];
  char ackMeal[32];
  char ackSource[64];

  // Missed reminder waiting to be written to Firebase
  bool missPending;
  char missId[40];

  // Reminder id that must not re-trigger (already acknowledged or missed)
  bool ignoreSet;
  char ignoreId[40];

  // Supplementary sensor telemetry (LDR and DHT22)
  bool ldrValid;
  bool ldrDark;         // true = DARK (DO=HIGH), false = BRIGHT (DO=LOW)
  float tempC;
  float humidity;
  bool dhtValid;        // at least one valid reading obtained
  bool dhtLastReadOk;   // true if most recent DHT read succeeded
  uint32_t dhtLastSampleMs;
};

// Forward declarations of helpers using custom types
static Shared snapshot();
static const char *devStateName(DevState s);
static RemoteState parseRemoteState(const char *s);
static const char *remoteStateName(RemoteState s);
static void copyJsonText(JsonVariantConst v, char *dst, size_t n);
static void enterStateLocked(DevState s, uint32_t now);
static String devicePath();

// ============================================================================
// CONFIGURATION
// ============================================================================

// ---- Hardware (tested wiring, matches HARDWARE_PINS in esp32Service.ts) ----
static const uint8_t PIN_LED_RED = 15;  // missed reminder
static const uint8_t PIN_LED_GREEN = 5; // ready / acknowledged
static const uint8_t PIN_LED_BLUE = 4;  // active reminder
static const uint8_t PIN_BUZZER = 23;   // active buzzer, active HIGH
static const uint8_t PIN_BUTTON =
    18; // 3V3 -> button -> GPIO18, INPUT_PULLDOWN (HIGH = pressed)
static const uint8_t PIN_SDA = 21;
static const uint8_t PIN_SCL = 22;
static const uint8_t OLED_ADDR = 0x3C;

// ---- Supplementary Sensors: LDR & DHT22 ----
static const uint8_t PIN_LDR = 19;     // Digital-output LDR (DO / OUT)
static const uint8_t PIN_DHT = 32;     // DHT22 data pin
static const uint8_t DHT_TYPE = DHT22; // Adafruit sensor type DHT22

// ---- Firebase ----
static const char *DB_URL =
    "https://dietdecode-808be-default-rtdb.firebaseio.com";
static const char *DEVICE_ID = "dietdecode-device-01";

// ---- Database layout (from esp32Service.ts and firebaseRtdbService.ts) ----
//   /devices/<DEVICE_ID>
//      state            "READY" | "REMINDER_ACTIVE" | "ACKNOWLEDGED" | "MISSED"
//      | "OFFLINE" currentReminder  { id, mealName, time, active, timestamp
//      (epoch ms) } acknowledgement  { acknowledged, acknowledgedBy, timestamp
//      (ISO-8601 string) } online, lastSeen (heartbeat; lastSeen is epoch
//      milliseconds via server timestamp)
static String devicePath() { return String("/devices/") + DEVICE_ID; }
static const char *ACK_BY = "ESP32_PUSH_BUTTON_GPIO18";

// ---- Timing (reminder behaviour mirrors the web app's firmware template) ----
static const uint32_t POLL_INTERVAL_MS = 2500;
static const uint32_t HEARTBEAT_INTERVAL_MS =
    30000; // web treats the device as online for 90 s after lastSeen
static const uint32_t GRACE_PERIOD_MS = 60000; // 1 minute to press the button
static const uint32_t ACK_HOLD_MS = 5000;      // acknowledged screen
static const uint32_t MISSED_HOLD_MS = 8000;   // missed screen
static const uint32_t ACK_RETRY_MS = 5000;
static const uint32_t HTTP_TIMEOUT_MS = 5000;
static const uint32_t DEBOUNCE_MS = 40;
static const uint32_t BUTTON_COOLDOWN_MS = 1000;
// ---- LDR Hand-Gesture Acknowledgement Timing (Phase B) ----
static const uint32_t LDR_HOLD_ACK_MS = 800;          // Sustained coverage duration required to confirm hand (adjustable)
static const uint32_t LDR_RELEASE_MS = 200;           // Normal BRIGHT state required before re-arming detection
static const uint32_t LDR_TELEMETRY_DEBOUNCE_MS = 50; // Optical debounce for ambient telemetry
static const uint32_t SENSOR_SAMPLE_INTERVAL_MS = 3000; // DHT22 requires >= 2000ms
static const uint32_t SENSOR_LOG_INTERVAL_MS = 30000;   // Diagnostic serial print every 30s
static const uint32_t TELEMETRY_INTERVAL_MS = 3000;     // Publish telemetry every 3 seconds
static const uint32_t WIFI_CONNECT_TIMEOUT_MS = 30000;
static const uint32_t WIFI_LOST_RETRY_MS = 10000;
static const uint32_t TOKEN_REFRESH_MARGIN_S =
    300; // refresh 5 minutes before expiry
static const uint32_t WIFI_BACKOFF_MS[] = {10000, 30000, 60000, 120000, 300000};
static const uint32_t AUTH_BACKOFF_MS[] = {5000, 15000, 30000, 60000, 300000};

// ============================================================================
// SHARED STATE IMPLEMENTATION
// ============================================================================

static Shared g;
static SemaphoreHandle_t gMutex;

static inline void lockG() { xSemaphoreTake(gMutex, portMAX_DELAY); }
static inline void unlockG() { xSemaphoreGive(gMutex); }
static Shared snapshot() {
  lockG();
  Shared c = g;
  unlockG();
  return c;
}
static void setCloud(const char *t) {
  lockG();
  strlcpy(g.cloud, t, sizeof(g.cloud));
  unlockG();
}

static const char *devStateName(DevState s) {
  switch (s) {
  case DS_READY:
    return "READY";
  case DS_ACTIVE:
    return "REMINDER_ACTIVE";
  case DS_ACKNOWLEDGED:
    return "ACKNOWLEDGED";
  default:
    return "MISSED";
  }
}

static RemoteState parseRemoteState(const char *s) {
  if (!s || !*s)
    return RM_NONE;
  if (strcasecmp(s, "READY") == 0)
    return RM_READY;
  if (strcasecmp(s, "REMINDER_ACTIVE") == 0)
    return RM_REMINDER_ACTIVE;
  if (strcasecmp(s, "ACKNOWLEDGED") == 0)
    return RM_ACKNOWLEDGED;
  if (strcasecmp(s, "MISSED") == 0)
    return RM_MISSED;
  if (strcasecmp(s, "OFFLINE") == 0)
    return RM_OFFLINE;
  return RM_OTHER;
}

static const char *remoteStateName(RemoteState s) {
  switch (s) {
  case RM_READY:
    return "READY";
  case RM_REMINDER_ACTIVE:
    return "REMINDER_ACTIVE";
  case RM_ACKNOWLEDGED:
    return "ACKNOWLEDGED";
  case RM_MISSED:
    return "MISSED";
  case RM_OFFLINE:
    return "OFFLINE";
  case RM_OTHER:
    return "(unrecognised)";
  default:
    return "(none)";
  }
}

// Copies a JSON string (or integer) into dst; leaves "" for anything else.
static void copyJsonText(JsonVariantConst v, char *dst, size_t n) {
  dst[0] = '\0';
  if (v.is<const char *>())
    strlcpy(dst, v.as<const char *>(), n);
  else if (v.is<long>())
    snprintf(dst, n, "%ld", v.as<long>());
}

static uint32_t backoffFor(int fails, const uint32_t *table, int n) {
  int i = fails - 1;
  if (i < 0)
    i = 0;
  if (i >= n)
    i = n - 1;
  return table[i];
}
#define BACKOFF(fails, table)                                                  \
  backoffFor((fails), (table), (int)(sizeof(table) / sizeof((table)[0])))

// ============================================================================
// HARDWARE: LEDs, buzzer, button, OLED   (Arduino loop task)
// ============================================================================
static Adafruit_SSD1306 display(128, 64, &Wire, -1);
static bool oledOk = false;
static uint8_t activeOledAddr = 0;

static void setLeds(bool r, bool gr, bool b) {
  digitalWrite(PIN_LED_RED, r ? HIGH : LOW);
  digitalWrite(PIN_LED_GREEN, gr ? HIGH : LOW);
  digitalWrite(PIN_LED_BLUE, b ? HIGH : LOW);
}

static bool scanI2CAndInitOled() {
  Serial.printf(
      "[I2C] Scanning I2C bus on SDA=GPIO%u, SCL=GPIO%u (100 kHz)...\n",
      PIN_SDA, PIN_SCL);
  uint8_t count = 0;
  uint8_t detectedAddr = 0;

  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    uint8_t error = Wire.endTransmission();
    if (error == 0) {
      Serial.printf("[I2C] -> Found responsive device at address: 0x%02X\n",
                    addr);
      count++;
      if (addr == 0x3C || addr == 0x3D) {
        detectedAddr = addr;
      }
    }
  }

  if (count == 0) {
    Serial.println(
        "[I2C] WARNING: No I2C devices found! Check 4-pin OLED wiring:");
    Serial.printf(
        "      VCC/VDD -> 3.3V, GND -> GND, SDA -> GPIO%u, SCL/SCK -> GPIO%u\n",
        PIN_SDA, PIN_SCL);
  }

  // Try detected address first, then fallback to 0x3C and 0x3D
  uint8_t probeAddrs[] = {detectedAddr, 0x3C, 0x3D};
  for (size_t i = 0; i < sizeof(probeAddrs); i++) {
    uint8_t addr = probeAddrs[i];
    if (addr == 0)
      continue;

    Serial.printf("[HW] Probing SSD1306 display at 0x%02X...\n", addr);
    if (display.begin(SSD1306_SWITCHCAPVCC, addr)) {
      activeOledAddr = addr;
      oledOk = true;
      display.clearDisplay();
      display.dim(false); // Max brightness
      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(0, 4);
      display.println("DIETDECODE IoT");
      display.setCursor(0, 24);
      display.println("Connecting WiFi...");
      display.setCursor(0, 48);
      display.printf("OLED 0x%02X: OK", addr);
      display.display();
      Serial.printf("[HW] SUCCESS: OLED display ready at address 0x%02X!\n",
                    addr);
      return true;
    }
  }

  Serial.println("[HW] OLED init failed at both 0x3C and 0x3D.");
  return false;
}

static void hardwareInit() {
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_BLUE, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLDOWN);
  digitalWrite(PIN_BUZZER, LOW);
  Serial.printf("[%lu ms][Buzzer] Initialised on GPIO %u (Active-HIGH, set to LOW / OFF)\n",
                millis(), PIN_BUZZER);
  setLeds(false, true, false); // green = ready/standby

  delay(10);
  int initBtn = digitalRead(PIN_BUTTON);
  Serial.printf(
      "[HW] Button configured on GPIO %u (INPUT_PULLDOWN, Active-HIGH 3.3V)\n",
      PIN_BUTTON);
  if (initBtn == HIGH) {
    Serial.println(
        "[HW] [ALERT] GPIO 18 is reading HIGH right now at startup!");
    Serial.println("     If the button is not physically held down, check if "
                   "your tactile switch");
    Serial.println("     is plugged across the wrong diagonal/pins (shorting "
                   "3.3V permanently).");
  } else {
    Serial.println(
        "[HW] Button idle check: LOW (Normal unpressed, ready for click).");
  }

  Wire.begin(PIN_SDA, PIN_SCL);
  Wire.setClock(100000); // 100 kHz standard mode for robust noise-immune I2C
  delay(120);            // allow OLED internal charge-pump power to settle

  scanI2CAndInitOled();
  Serial.println("[HW] LEDs, buzzer, button and I2C initialised");
}

static void enterStateLocked(DevState s, uint32_t now) {
  g.ds = s;
  g.dsSince = now;
  if (s == DS_READY) {
    g.id[0] = '\0';
    g.meal[0] = '\0';
    g.timeStr[0] = '\0';
  }
  Serial.printf("[%lu ms][State Transition] -> %s\n", now, devStateName(s));
}

// Applies a new remote snapshot to the local state machine. Caller holds the
// mutex.
static void applyRemoteLocked(uint32_t now) {
  // Forget the "do not re-trigger" marker once the remote reminder is inactive
  // or has changed.
  if (g.ignoreSet && (!g.remoteActive || strcmp(g.ignoreId, g.remoteId) != 0))
    g.ignoreSet = false;

  if (g.ds == DS_READY) {
    bool blocked = g.ignoreSet && strcmp(g.ignoreId, g.remoteId) == 0;
    if (g.remoteActive && !blocked && !g.ackPending) {
      strlcpy(g.id, g.remoteId, sizeof(g.id));
      strlcpy(g.meal, g.remoteMeal, sizeof(g.meal));
      strlcpy(g.timeStr, g.remoteTime, sizeof(g.timeStr));
      Serial.printf("[Reminder] Active: \"%s\" at \"%s\"\n", g.meal, g.timeStr);
      enterStateLocked(DS_ACTIVE, now);
    }
  } else if (g.ds == DS_ACTIVE) {
    if (!g.remoteActive) {
      // Cleared elsewhere (for example acknowledged from the web dashboard)
      Serial.println("[Reminder] No longer active in the database");
      if (g.remoteState == RM_ACKNOWLEDGED)
        enterStateLocked(DS_ACKNOWLEDGED, now);
      else if (g.remoteState == RM_MISSED)
        enterStateLocked(DS_MISSED, now);
      else
        enterStateLocked(DS_READY, now);
    } else if (strcmp(g.id, g.remoteId) != 0) {
      // Replaced by a different reminder: show it and restart the grace period
      strlcpy(g.id, g.remoteId, sizeof(g.id));
      strlcpy(g.meal, g.remoteMeal, sizeof(g.meal));
      strlcpy(g.timeStr, g.remoteTime, sizeof(g.timeStr));
      g.dsSince = now;
      Serial.printf("[Reminder] Replaced by: \"%s\" at \"%s\"\n", g.meal,
                    g.timeStr);
    }
  }
}

static void stateService() {
  static uint32_t seenSeq = 0;
  uint32_t now = millis();
  lockG();
  if (g.remoteSeq != seenSeq) {
    seenSeq = g.remoteSeq;
    applyRemoteLocked(now);
  }
  switch (g.ds) {
  case DS_ACTIVE:
    if ((now - g.dsSince) >= GRACE_PERIOD_MS) {
      Serial.println("[Reminder] Grace period expired, no button press");
      strlcpy(g.ignoreId, g.id,
              sizeof(g.ignoreId)); // do not replay this reminder
      g.ignoreSet = true;
      g.missPending = true;
      strlcpy(g.missId, g.id, sizeof(g.missId));
      enterStateLocked(DS_MISSED, now);
    }
    break;
  case DS_ACKNOWLEDGED:
    if ((now - g.dsSince) >= ACK_HOLD_MS)
      enterStateLocked(DS_READY, now);
    break;
  case DS_MISSED:
    if ((now - g.dsSince) >= MISSED_HOLD_MS)
      enterStateLocked(DS_READY, now);
    break;
  default:
    break;
  }
  unlockG();
}

// LEDs and buzzer follow the local device state with timestamped ON/OFF diagnostics.
static void outputsService() {
  Shared s = snapshot();
  uint32_t now = millis();
  uint32_t t = now - s.dsSince;

  bool red = false, green = false, blue = false, buzz = false;
  const char *buzzSource = "NONE";
  switch (s.ds) {
  case DS_READY:
    green = true;
    break;
  case DS_ACTIVE: {
    blue = true;
    uint32_t c = t % 1200; // 150 on, 150 off, 150 on, 750 off
    buzz = (c < 150) || (c >= 300 && c < 450);
    buzzSource = "REMINDER_ALARM_PULSE";
    break;
  }
  case DS_ACKNOWLEDGED:
    green = true;
    buzz = (t < 80) || (t >= 140 && t < 220); // two short confirmation beeps
    buzzSource = "ACK_CONFIRMATION_BEEP";
    break;
  case DS_MISSED:
    red = true;
    break;
  }
  setLeds(red, green, blue);

  static bool lastBuzz = false;
  static uint32_t buzzOnMs = 0;
  static const char *lastSource = "NONE";

  if (buzz && !lastBuzz) {
    buzzOnMs = now;
    lastSource = buzzSource;
    digitalWrite(PIN_BUZZER, HIGH);
    Serial.printf("[%lu ms][Buzzer] ON  | Source: %s (Device: %s)\n",
                  now, buzzSource, devStateName(s.ds));
  } else if (!buzz && lastBuzz) {
    digitalWrite(PIN_BUZZER, LOW);
    Serial.printf("[%lu ms][Buzzer] OFF | Source: %s (Duration: %lu ms)\n",
                  now, lastSource, now - buzzOnMs);
  }
  lastBuzz = buzz;
}

// Attempts to acknowledge an active reminder. Caller specifies source.
// Returns true if an active reminder was acknowledged, false if no reminder was active.
static bool acknowledgeReminder(const char *source, uint32_t now) {
  lockG();
  if ((g.ds == DS_ACTIVE || g.remoteActive) && !g.ackPending) {
    g.ackPending = true;
    const char *targetId =
        g.id[0] ? g.id : (g.remoteId[0] ? g.remoteId : "rem_active");
    const char *targetMeal =
        g.meal[0] ? g.meal : (g.remoteMeal[0] ? g.remoteMeal : "Meal");
    strlcpy(g.ackId, targetId, sizeof(g.ackId));
    strlcpy(g.ackMeal, targetMeal, sizeof(g.ackMeal));
    strlcpy(g.ackSource, source ? source : ACK_BY, sizeof(g.ackSource));

    Serial.printf("[%lu ms][Ack Event] Source: %s | Acknowledging reminder \"%s\" (ID: %s)\n",
                  now, g.ackSource, g.ackMeal, g.ackId);
    enterStateLocked(DS_ACKNOWLEDGED, now); // buzzer stops immediately, green LED turns on
    unlockG();
    return true;
  }
  unlockG();
  return false;
}

// Physical GPIO 18 pushbutton handler.
// Called ONLY when physical button is pressed. LDR NEVER CALLS THIS!
static void onButtonPressed() {
  static uint32_t lastPressAt = 0;
  uint32_t now = millis();
  if (lastPressAt != 0 && (now - lastPressAt) < BUTTON_COOLDOWN_MS)
    return;
  lastPressAt = now;

  bool acked = acknowledgeReminder("ESP32_PUSH_BUTTON_GPIO18", now);
  if (!acked) {
    Shared s = snapshot();
    Serial.printf("[%lu ms][Button] Physical GPIO 18 pressed while device in %s (no active reminder)\n",
                  now, devStateName(s.ds));
    // Tactile click feedback ONLY for physical GPIO 18 button press
    Serial.printf("[%lu ms][Buzzer] ON  | Source: PHYSICAL_BUTTON_CLICK (40 ms)\n", now);
    digitalWrite(PIN_BUZZER, HIGH);
    delay(40);
    digitalWrite(PIN_BUZZER, LOW);
    Serial.printf("[%lu ms][Buzzer] OFF | Source: PHYSICAL_BUTTON_CLICK (completed, 40 ms)\n", millis());
  }
}

static void buttonService() {
  static bool lastReading = false;
  static uint32_t lastPressTime = 0;
  static uint32_t lastHeartbeatLog = 0;
  uint32_t now = millis();

  bool reading = (digitalRead(PIN_BUTTON) == HIGH);

  // Instant leading-edge press trigger
  if (reading && !lastReading) {
    if ((now - lastPressTime) >= 200) { // 200ms lockout against contact bounce
      lastPressTime = now;
      Serial.printf("[%lu ms][Button] GPIO 18 PRESSED (Rising edge: 3.3V)!\n", now);
      onButtonPressed();
    }
  } else if (!reading && lastReading) {
    Serial.printf("[%lu ms][Button] GPIO 18 RELEASED (Falling edge: 0V).\n", now);
  }
  lastReading = reading;

  // Periodic diagnostic every 4 seconds if pin is stuck HIGH
  if (now - lastHeartbeatLog >= 4000) {
    lastHeartbeatLog = now;
    if (reading) {
      Serial.println("[Button Notice] GPIO 18 is currently reading HIGH "
                     "(3.3V). Check switch orientation if not holding button.");
    }
  }
}

// ============================================================================
// SENSORS: LDR (GPIO19) & DHT22 (GPIO32)
// ============================================================================
static DHT dht(PIN_DHT, DHT_TYPE);

static void sensorInit() {
  pinMode(PIN_LDR, INPUT);
  dht.begin();
  Serial.printf(
      "[Sensor] Initialised: LDR on GPIO%u (Digital Input), DHT22 on GPIO%u\n",
      PIN_LDR, PIN_DHT);
  Serial.printf("[Sensor] LDR gesture threshold: %u ms sustained hold to acknowledge.\n",
                LDR_HOLD_ACK_MS);
  Serial.println("[Sensor] Note: LDR sensitivity threshold is set via on-module potentiometer.");
  Serial.println("[Sensor]       HIGH (1) = less light (DARK), LOW (0) = more light (BRIGHT).");
}

// LDR gesture detection state machine
enum LdrGestureState : uint8_t {
  LDR_STATE_IDLE,        // Waiting for hand coverage
  LDR_STATE_DETECTING,   // Hand detected, timing sustained hold >= LDR_HOLD_ACK_MS
  LDR_STATE_WAIT_RELEASE // Acknowledged or rejected, waiting for sensor to return to BRIGHT
};

// LDR hand-detection service with sustained hold verification and shadow rejection.
// Hand sustained >= 800 ms during active reminder -> acknowledges reminder.
// Shadows, transients (< 800 ms), or detections when idle -> REJECTED with ZERO buzzer activity.
static void ldrService() {
  static bool initialised = false;
  static bool lastRawReading = false;
  static uint32_t lastRawChangeMs = 0;
  static bool debouncedDark = false;
  static LdrGestureState gestureState = LDR_STATE_IDLE;
  static uint32_t darkHoldStartMs = 0;
  static uint32_t clearStartMs = 0;

  uint32_t now = millis();
  bool rawReading = (digitalRead(PIN_LDR) == HIGH); // HIGH = hand close / DARK, LOW = BRIGHT

  // 1. Initialise baseline state on boot
  if (!initialised) {
    lastRawReading = rawReading;
    debouncedDark = rawReading;
    lastRawChangeMs = now;
    initialised = true;
    lockG();
    g.ldrValid = true;
    g.ldrDark = debouncedDark;
    unlockG();
    Serial.printf("[%lu ms][LDR Init] Baseline pin state: %s (%s)\n",
                  now, rawReading ? "HIGH" : "LOW", rawReading ? "DARK" : "BRIGHT");
    return;
  }

  // 2. Track raw GPIO 19 transitions for diagnostics
  if (rawReading != lastRawReading) {
    Serial.printf("[%lu ms][LDR Raw] GPIO 19 transition -> %s (%s)\n",
                  now, rawReading ? "HIGH" : "LOW", rawReading ? "DARK" : "BRIGHT");
    lastRawChangeMs = now;
    lastRawReading = rawReading;
  }

  // 3. Telemetry optical debounce (50ms) to update g.ldrDark accurately for ambient reporting
  if ((now - lastRawChangeMs) >= LDR_TELEMETRY_DEBOUNCE_MS) {
    if (rawReading != debouncedDark) {
      debouncedDark = rawReading;
      lockG();
      g.ldrValid = true;
      g.ldrDark = debouncedDark;
      unlockG();
      Serial.printf("[%lu ms][LDR Telemetry] Ambient light state: %s\n",
                    now, debouncedDark ? "DARK" : "BRIGHT");
    }
  }

  // 4. LDR Hand-Detection Acknowledgement State Machine
  Shared s = snapshot();
  bool reminderActive = (s.ds == DS_ACTIVE || s.remoteActive) && !s.ackPending;

  switch (gestureState) {
  case LDR_STATE_IDLE:
    if (rawReading) { // Pin is HIGH (DARK / covered)
      if (!reminderActive) {
        // Requirement B2: Ignore LDR acknowledgement events whenever no reminder is active
        // Requirement B1: A raw LDR signal must never directly control the buzzer
        static uint32_t lastIdleRejectLogMs = 0;
        if (now - lastIdleRejectLogMs >= 2000) {
          lastIdleRejectLogMs = now;
          Serial.printf("[%lu ms][LDR Rejected] Optical shadow/darkness detected, but NO active reminder (Device: %s). Acknowledgement & buzzer suppressed.\n",
                        now, devStateName(s.ds));
        }
      } else {
        // Reminder IS active! Start timing the sustained hold
        gestureState = LDR_STATE_DETECTING;
        darkHoldStartMs = now;
        Serial.printf("[%lu ms][LDR Hand] Coverage detected during active reminder \"%s\". Timing sustained hold (requires %u ms)...\n",
                      now, s.meal[0] ? s.meal : (s.remoteMeal[0] ? s.remoteMeal : "Meal"), LDR_HOLD_ACK_MS);
      }
    }
    break;

  case LDR_STATE_DETECTING:
    // If reminder became inactive while detecting (e.g. timeout, physical button, or web ack)
    if (!reminderActive) {
      Serial.printf("[%lu ms][LDR Rejected] Reminder is no longer active (Device: %s). Cancelling hand detection.\n",
                    now, devStateName(s.ds));
      gestureState = LDR_STATE_WAIT_RELEASE;
      clearStartMs = 0;
      break;
    }

    if (!rawReading) {
      // Hand moved away before hold threshold was reached!
      uint32_t holdDuration = now - darkHoldStartMs;
      Serial.printf("[%lu ms][LDR Rejected] Transient shadow or brief wave: hand moved away after %lu ms (< %u ms required). No acknowledgement.\n",
                    now, holdDuration, LDR_HOLD_ACK_MS);
      gestureState = LDR_STATE_IDLE;
    } else {
      // Pin is continuously HIGH. Check if hold threshold is met
      uint32_t holdDuration = now - darkHoldStartMs;
      if (holdDuration >= LDR_HOLD_ACK_MS) {
        // VALIDATED HAND ACKNOWLEDGEMENT!
        Serial.printf("[%lu ms][LDR Validated] Sustained hand hold confirmed (%lu ms >= %u ms) on active reminder \"%s\"!\n",
                      now, holdDuration, LDR_HOLD_ACK_MS, s.meal[0] ? s.meal : (s.remoteMeal[0] ? s.remoteMeal : "Meal"));
        acknowledgeReminder("ESP32_LDR_GPIO19", now);
        gestureState = LDR_STATE_WAIT_RELEASE;
        clearStartMs = 0;
      }
    }
    break;

  case LDR_STATE_WAIT_RELEASE:
    // Requirement B4: Require the sensor to return to normal BRIGHT state before accepting another detection
    if (!rawReading) {
      if (clearStartMs == 0) {
        clearStartMs = now;
      } else if ((now - clearStartMs) >= LDR_RELEASE_MS) {
        clearStartMs = 0;
        gestureState = LDR_STATE_IDLE;
        Serial.printf("[%lu ms][LDR Ready] Hand released (sensor returned to BRIGHT for %u ms). LDR gesture detector re-armed.\n",
                      now, LDR_RELEASE_MS);
      }
    } else {
      clearStartMs = 0; // Hand still covering sensor
    }
    break;
  }
}

// DHT22 sampling service (every SENSOR_SAMPLE_INTERVAL_MS = 3000 ms)
static void sensorService() {
  uint32_t now = millis();
  static uint32_t lastSampleAt = 0;
  static uint32_t lastLogAt = 0;

  // Enforce at least SENSOR_SAMPLE_INTERVAL_MS (3000 ms) between DHT22 samples
  if (lastSampleAt != 0 && (now - lastSampleAt) < SENSOR_SAMPLE_INTERVAL_MS) {
    return;
  }
  lastSampleAt = now;

  // Read DHT22 (temperature in Celsius, relative humidity in %)
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  bool dhtOk = !isnan(t) && !isnan(h);

  // Atomically update Shared state under mutex
  lockG();
  g.dhtLastSampleMs = now;
  g.dhtLastReadOk = dhtOk;
  if (dhtOk) {
    g.tempC = t;
    g.humidity = h;
    g.dhtValid = true;
  }
  bool currentDark = g.ldrDark;
  unlockG();

  // Diagnostic serial output: print periodically every SENSOR_LOG_INTERVAL_MS (30s)
  if ((now - lastLogAt) >= SENSOR_LOG_INTERVAL_MS) {
    lastLogAt = now;
    if (dhtOk) {
      Serial.printf("[Sensor] Temp: %.1f C | Humidity: %.1f %% | Light: %s\n",
                    t, h, currentDark ? "DARK" : "BRIGHT");
    } else {
      Serial.printf("[Sensor] Temp: [READ_FAIL] | Humidity: [READ_FAIL] | Light: %s\n",
                    currentDark ? "DARK" : "BRIGHT");
    }
  }
}

// Redraws only when the text actually changes.
static void oledService() {
  if (!oledOk) {
    static uint32_t lastOledRetry = 0;
    uint32_t now = millis();
    if (now - lastOledRetry >= 3000) {
      lastOledRetry = now;
      scanI2CAndInitOled();
    }
    return;
  }
  Shared s = snapshot();

  char l1[24], l2[24], l3[24], l4[24];
  switch (s.ds) {
  case DS_ACTIVE:
    if (strstr(s.meal, "Water") != NULL || strstr(s.meal, "water") != NULL || strstr(s.meal, "Hydrat") != NULL) {
      strlcpy(l1, "! DRINK WATER !", sizeof(l1));
    } else {
      strlcpy(l1, "! MEAL TIME !", sizeof(l1));
    }
    strlcpy(l2, s.meal[0] ? s.meal : "Reminder", sizeof(l2));
    strlcpy(l3, s.timeStr, sizeof(l3));
    strlcpy(l4, ">> Press Button <<", sizeof(l4));
    break;
  case DS_ACKNOWLEDGED:
    strlcpy(l1, "ACKNOWLEDGED", sizeof(l1));
    strlcpy(l2,
            s.ackMeal[0] ? s.ackMeal : (s.meal[0] ? s.meal : "Meal Recorded"),
            sizeof(l2));
    if (strstr(s.meal, "Water") != NULL || strstr(s.meal, "water") != NULL || strstr(s.ackMeal, "Water") != NULL) {
      strlcpy(l3, "Hydrated! +250ml", sizeof(l3));
    } else {
      strlcpy(l3, "Good Appetite!", sizeof(l3));
    }
    strlcpy(l4, s.ackPending ? "Syncing Cloud..." : "Status: Synced",
            sizeof(l4));
    break;
  case DS_MISSED:
    if (strstr(s.meal, "Water") != NULL || strstr(s.meal, "water") != NULL) {
      strlcpy(l1, "MISSED WATER", sizeof(l1));
      strlcpy(l3, "Hydrate Soon!", sizeof(l3));
    } else {
      strlcpy(l1, "MISSED MEAL", sizeof(l1));
      strlcpy(l3, "Grace Timeout", sizeof(l3));
    }
    strlcpy(l2, s.meal[0] ? s.meal : "Meal", sizeof(l2));
    strlcpy(l4, "No Button Pressed", sizeof(l4));
    break;
  default:
    strlcpy(l1, "DIETDECODE IoT", sizeof(l1));
    snprintf(l2, sizeof(l2), "READY [%s]", s.cloud[0] ? s.cloud : "OK");

    // DHT22 reading (Line 3)
    if (s.dhtValid) {
      if (s.dhtLastReadOk) {
        snprintf(l3, sizeof(l3), "%.1f C   %.0f%% RH", s.tempC, s.humidity);
      } else {
        snprintf(l3, sizeof(l3), "%.1f C* %.0f%%* [!]", s.tempC, s.humidity);
      }
    } else {
      strlcpy(l3, "DHT22: Reading...", sizeof(l3));
    }

    // LDR light state (Line 4)
    if (s.ldrValid) {
      snprintf(l4, sizeof(l4), "Light: %s", s.ldrDark ? "DARK" : "BRIGHT");
    } else {
      strlcpy(l4, "Light: Reading...", sizeof(l4));
    }
    break;
  }
  l2[21] = '\0'; // 21 characters fit on a 128 px line
  l3[21] = '\0';
  l4[21] = '\0';

  char key[160];
  snprintf(key, sizeof(key), "%d|%s|%s|%s|%s", s.wifiUp ? 1 : 0, l1, l2, l3,
           l4);
  static char lastKey[160] = "";
  if (strcmp(key, lastKey) == 0)
    return;
  strlcpy(lastKey, key, sizeof(lastKey));

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 4);
  display.print(l1);
  display.setCursor(86, 4);
  display.print(s.wifiUp ? "WiFi OK" : "No WiFi");
  display.drawLine(0, 16, 128, 16, SSD1306_WHITE);
  display.setCursor(0, 24);
  display.print(l2);
  display.setCursor(0, 38);
  display.print(l3);
  display.setCursor(0, 52);
  display.print(l4);
  display.display();
}

// ============================================================================
// WI-FI STATE MACHINE   (net task)
// ============================================================================
enum WifiState { WS_START, WS_CONNECTING, WS_CONNECTED, WS_BACKOFF };

static WifiState wifiState = WS_START;
static uint32_t wifiStateSince = 0, wifiRetryAt = 0, wifiLastLog = 0;
static int wifiFails = 0;
static volatile uint32_t evDisconnects = 0;
static volatile uint8_t lastReason = 0;
static bool firstWifiAttempt = true;

static const char *wifiStatusName(wl_status_t s) {
  switch (s) {
  case WL_IDLE_STATUS:
    return "WL_IDLE_STATUS";
  case WL_NO_SSID_AVAIL:
    return "WL_NO_SSID_AVAIL";
  case WL_CONNECTED:
    return "WL_CONNECTED";
  case WL_CONNECT_FAILED:
    return "WL_CONNECT_FAILED";
  case WL_CONNECTION_LOST:
    return "WL_CONNECTION_LOST";
  case WL_DISCONNECTED:
    return "WL_DISCONNECTED";
  default:
    return "OTHER";
  }
}

static const char *wifiReasonText(uint8_t r) {
  switch (r) {
  case 0:
    return "none";
  case 2:
    return "AUTH_EXPIRE";
  case 8:
    return "ASSOC_LEAVE";
  case 15:
    return "4WAY_HANDSHAKE_TIMEOUT";
  case 200:
    return "BEACON_TIMEOUT";
  case 201:
    return "NO_AP_FOUND";
  case 202:
    return "AUTH_FAIL";
  case 203:
    return "ASSOC_FAIL";
  case 204:
    return "HANDSHAKE_TIMEOUT";
  case 205:
    return "CONNECTION_FAIL";
  default:
    return "other";
  }
}

// Runs on the Wi-Fi event task: only store values here.
static void onWiFiEvent(arduino_event_id_t event, arduino_event_info_t info) {
  if (event == ARDUINO_EVENT_WIFI_STA_DISCONNECTED) {
    evDisconnects = evDisconnects + 1;
    lastReason = info.wifi_sta_disconnected.reason;
  }
}

static void firebaseOnWifiUp();
static void firebaseOnWifiDown();

static void wifiService() {
  uint32_t now = millis();
  switch (wifiState) {
  case WS_START:
    if (!firstWifiAttempt) {
      WiFi.disconnect(false,
                      false); // stop any half-finished attempt; radio stays on
      vTaskDelay(pdMS_TO_TICKS(250));
    }
    firstWifiAttempt = false;
    evDisconnects = 0;
    lastReason = 0;
    Serial.printf("[WiFi] Connecting to \"%s\" (attempt %d)\n", WIFI_SSID,
                  wifiFails + 1);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD); // exactly one begin() per attempt
    wifiState = WS_CONNECTING;
    wifiStateSince = now;
    wifiLastLog = now;
    setCloud("Wi-Fi...");
    break;

  case WS_CONNECTING:
    if (WiFi.status() == WL_CONNECTED) {
      wifiState = WS_CONNECTED;
      wifiFails = 0;
      lockG();
      g.wifiUp = true;
      unlockG();
      Serial.printf(
          "[WiFi] CONNECTED | SSID %s | IP %s | RSSI %d dBm | ch %d\n",
          WiFi.SSID().c_str(), WiFi.localIP().toString().c_str(), WiFi.RSSI(),
          WiFi.channel());
      firebaseOnWifiUp();
    } else if ((now - wifiStateSince) >= WIFI_CONNECT_TIMEOUT_MS) {
      wifiFails++;
      uint32_t wait = BACKOFF(wifiFails, WIFI_BACKOFF_MS);
      Serial.printf("[WiFi] Attempt timed out | status %d (%s) | last reason "
                    "%u (%s) | retry in %lu s\n",
                    (int)WiFi.status(), wifiStatusName(WiFi.status()),
                    (unsigned)lastReason, wifiReasonText(lastReason),
                    (unsigned long)(wait / 1000));
      wifiRetryAt = now + wait;
      wifiState = WS_BACKOFF;
      setCloud("No Wi-Fi");
    } else if ((now - wifiLastLog) >= 5000) {
      wifiLastLog = now;
      Serial.printf("[WiFi] Connecting... status %d (%s)\n", (int)WiFi.status(),
                    wifiStatusName(WiFi.status()));
    }
    break;

  case WS_CONNECTED:
    if (WiFi.status() != WL_CONNECTED) {
      Serial.printf("[WiFi] CONNECTION LOST | status %d (%s) | last reason %u "
                    "(%s) | retry in %lu s\n",
                    (int)WiFi.status(), wifiStatusName(WiFi.status()),
                    (unsigned)lastReason, wifiReasonText(lastReason),
                    (unsigned long)(WIFI_LOST_RETRY_MS / 1000));
      lockG();
      g.wifiUp = false;
      unlockG();
      firebaseOnWifiDown();
      setCloud("No Wi-Fi");
      wifiFails = 0;
      wifiRetryAt = now + WIFI_LOST_RETRY_MS;
      wifiState = WS_BACKOFF;
    }
    break;

  case WS_BACKOFF:
    if ((int32_t)(now - wifiRetryAt) >= 0)
      wifiState = WS_START;
    break;
  }
}

// ============================================================================
// FIREBASE  (net task)
// ============================================================================
static String idToken, refreshToken;
static bool tokenValid = false;
static uint32_t tokenRefreshAt = 0; // soft deadline: try to refresh
static uint32_t tokenHardAt = 0;    // hard deadline: token no longer usable
static uint32_t authRetryAt = 0;
static int authFails = 0;

static uint32_t nextPollAt = 0, nextHeartbeatAt = 0, nextAckAt = 0;
static int dbFails = 0;

static WiFiClientSecure
    dbClient; // kept for connection reuse to the database host
static HTTPClient dbHttp;

// NOTE: setInsecure() skips TLS certificate validation (same as the web app's
// firmware template).
static void tlsSetup() {
  dbClient.setInsecure();
  dbHttp.setReuse(true);
  dbHttp.setTimeout(HTTP_TIMEOUT_MS);
  dbHttp.setConnectTimeout(HTTP_TIMEOUT_MS);
}

// ISO-8601 UTC time (same shape as JavaScript's toISOString) once SNTP has set
// the clock.
static bool isoNow(char *out, size_t n) {
  time_t t = time(nullptr);
  if (t < 1700000000)
    return false; // clock not set yet
  struct tm tmv;
  gmtime_r(&t, &tmv);
  strftime(out, n, "%Y-%m-%dT%H:%M:%S.000Z", &tmv);
  return true;
}

static void firebaseOnWifiUp() {
  static bool ntpStarted = false;
  if (!ntpStarted) {
    configTime(0, 0, "pool.ntp.org",
               "time.google.com"); // asynchronous, does not block
    ntpStarted = true;
  }
  dbClient.stop();
  authRetryAt = 0;
  nextPollAt = 0;
  nextHeartbeatAt = 0;
  dbFails = 0;
  setCloud(tokenValid ? "Connecting" : "Auth...");
}

static void firebaseOnWifiDown() { dbClient.stop(); }

// Auth requests are rare, so each uses its own short-lived connection.
static int authRequest(const String &url, const String &body,
                       const char *contentType, String &out) {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.setConnectTimeout(HTTP_TIMEOUT_MS);
  if (!http.begin(client, url))
    return -100;
  http.addHeader("Content-Type", contentType);
  int code = http.POST(body);
  if (code > 0)
    out = http.getString();
  http.end();
  return code;
}

static String errorMessage(const String &resp) {
  JsonDocument d;
  if (deserializeJson(d, resp))
    return String("unparseable response");
  const char *m = d["error"]["message"] | "";
  return String(m[0] ? m : "no message");
}

static void storeToken(const String &idTok, const String &refTok,
                       long expiresInS) {
  uint32_t now = millis();
  idToken = idTok;
  refreshToken = refTok;
  long soft = expiresInS - (long)TOKEN_REFRESH_MARGIN_S;
  if (soft < 60)
    soft = 60;
  tokenRefreshAt = now + (uint32_t)soft * 1000UL;
  tokenHardAt =
      now + (uint32_t)(expiresInS > 30 ? expiresInS - 30 : 1) * 1000UL;
  tokenValid = true;
}

static int doSignIn() {
  JsonDocument req;
  req["email"] = FIREBASE_DEVICE_EMAIL;
  req["password"] = FIREBASE_DEVICE_PASSWORD;
  req["returnSecureToken"] = true;
  String body;
  serializeJson(req, body);

  String url = String("https://identitytoolkit.googleapis.com/v1/"
                      "accounts:signInWithPassword?key=") +
               FIREBASE_API_KEY;
  String resp;
  int code = authRequest(url, body, "application/json", resp);
  if (code == 200) {
    JsonDocument d;
    if (!deserializeJson(d, resp)) {
      String idTok = String((const char *)(d["idToken"] | ""));
      String refTok = String((const char *)(d["refreshToken"] | ""));
      long exp = String((const char *)(d["expiresIn"] | "3600")).toInt();
      if (idTok.length() && refTok.length()) {
        storeToken(idTok, refTok, exp);
        Serial.printf("[Auth] Sign-in OK, token valid for %ld s\n", exp);
        return 200;
      }
    }
    Serial.println(
        "[Auth] Sign-in answered 200 but the response had no usable token");
    return -101;
  }
  if (code > 0)
    Serial.printf("[Auth] Sign-in FAILED, HTTP %d: %s (check device account "
                  "and API key)\n",
                  code, errorMessage(resp).c_str());
  else
    Serial.printf("[Auth] Sign-in request failed: %s\n",
                  HTTPClient::errorToString(code).c_str());
  return code;
}

static int doRefresh() {
  String body =
      String("grant_type=refresh_token&refresh_token=") + refreshToken;
  String url = String("https://securetoken.googleapis.com/v1/token?key=") +
               FIREBASE_API_KEY;
  String resp;
  int code = authRequest(url, body, "application/x-www-form-urlencoded", resp);
  if (code == 200) {
    JsonDocument d;
    if (!deserializeJson(d, resp)) {
      String idTok = String((const char *)(d["id_token"] | ""));
      String refTok = String((const char *)(d["refresh_token"] | ""));
      long exp = String((const char *)(d["expires_in"] | "3600")).toInt();
      if (idTok.length() && refTok.length()) {
        storeToken(idTok, refTok, exp);
        Serial.printf("[Auth] Token refreshed, valid for %ld s\n", exp);
        return 200;
      }
    }
    Serial.println(
        "[Auth] Refresh answered 200 but the response had no usable token");
    return -101;
  }
  if (code > 0)
    Serial.printf("[Auth] Token refresh FAILED, HTTP %d: %s\n", code,
                  errorMessage(resp).c_str());
  else
    Serial.printf("[Auth] Token refresh request failed: %s\n",
                  HTTPClient::errorToString(code).c_str());
  return code;
}

static bool acquireToken() {
  if (refreshToken.length()) {
    int c = doRefresh();
    if (c == 200)
      return true;
    if (c != 400)
      return false;    // network/server trouble: try again later
    refreshToken = ""; // refresh token rejected: fall back to a fresh sign-in
    Serial.println("[Auth] Refresh token rejected, signing in again");
  }
  return doSignIn() == 200;
}

// Database request on the persistent client. Never prints the token.
static int dbRequest(const char *method, const String &path, const String &body,
                     String &out) {
  String url = String(DB_URL) + path + ".json?auth=" + idToken;
  if (!dbHttp.begin(dbClient, url))
    return -100;
  int code;
  if (strcmp(method, "GET") == 0) {
    code = dbHttp.GET();
  } else {
    dbHttp.addHeader("Content-Type", "application/json");
    code = dbHttp.sendRequest(method, body);
  }
  if (code > 0)
    out = dbHttp.getString();
  dbHttp.end();
  if (code < 0)
    dbClient.stop(); // drop a possibly stale connection
  return code;
}

static void handleDbFailure(const char *tag, int code) {
  dbFails++;
  if (code == 401) {
    tokenValid = false; // forces re-authentication (Wi-Fi is untouched)
    Serial.printf("[DB] %s: HTTP 401, token rejected; will re-authenticate\n",
                  tag);
    setCloud("Auth...");
  } else if (code == 403) {
    Serial.printf("[DB] %s: HTTP 403, permission denied. Check Realtime "
                  "Database rules for /devices/%s\n",
                  tag, DEVICE_ID);
    setCloud("Denied");
  } else if (code < 0) {
    Serial.printf("[DB] %s: request failed: %s\n", tag,
                  HTTPClient::errorToString(code).c_str());
    setCloud("ERR");
  } else {
    Serial.printf("[DB] %s: HTTP %d\n", tag, code);
    setCloud("ERR");
  }
}

static char lastHandledCmdId[48] = "";

static void processRemoteCommand(JsonObjectConst cmd) {
  const char *cmdId = cmd["commandId"] | "";
  const char *type = cmd["type"] | "";
  const char *status = cmd["status"] | "";
  const char *targetRemId = cmd["targetReminderId"] | "";
  const char *requestedBy = cmd["requestedBy"] | "";

  if (!cmdId[0] || strcmp(status, "PENDING") != 0) {
    return;
  }

  // Idempotency: avoid processing the exact same command repeatedly
  if (strcmp(cmdId, lastHandledCmdId) == 0) {
    return;
  }
  strlcpy(lastHandledCmdId, cmdId, sizeof(lastHandledCmdId));

  Serial.printf("[RemoteCmd] Detected PENDING command '%s' (type: %s, target: %s)\n",
                cmdId, type, targetRemId);

  Shared s = snapshot();
  bool reminderActive = (s.ds == DS_ACTIVE || s.remoteActive);

  // Canonical active reminder on ESP32:
  // 1. Authoritative cloud reminder (s.remoteId) when s.remoteActive is true
  // 2. Local reminder (s.id) when hardware is in DS_ACTIVE
  const char *activeId = "";
  if (s.remoteActive && s.remoteId[0] != '\0') {
    activeId = s.remoteId;
  } else if (s.ds == DS_ACTIVE && s.id[0] != '\0') {
    activeId = s.id;
  } else if (s.id[0] != '\0') {
    activeId = s.id;
  } else if (s.remoteId[0] != '\0') {
    activeId = s.remoteId;
  }

  // Non-sensitive diagnostic logging
  Serial.printf("[RemoteCmd] Command '%s': target='%s', activeId='%s' (ds=%s, remoteActive=%s, s.id='%s', s.remoteId='%s')\n",
                cmdId, targetRemId, activeId, devStateName(s.ds),
                s.remoteActive ? "true" : "false", s.id, s.remoteId);

  // Validate active reminder and ID match with stale-command protection
  bool idMatch = false;
  const char *failReason = nullptr;

  if (!reminderActive || activeId[0] == '\0') {
    failReason = "NO_ACTIVE_REMINDER";
  } else if (targetRemId[0] == '\0') {
    // Stale command protection: remote commands must explicitly specify the reminder ID
    failReason = "MISSING_TARGET_REMINDER_ID";
  } else if (strcmp(targetRemId, activeId) == 0 ||
             (s.remoteId[0] != '\0' && strcmp(targetRemId, s.remoteId) == 0) ||
             (s.id[0] != '\0' && strcmp(targetRemId, s.id) == 0)) {
    idMatch = true;
  } else {
    failReason = "REMINDER_ID_MISMATCH";
  }

  if (reminderActive && idMatch) {
    uint32_t now = millis();
    lockG();
    g.ackPending = true;
    const char *targetId = activeId[0] ? activeId : (targetRemId[0] ? targetRemId : "rem_active");
    const char *targetMeal = s.meal[0] ? s.meal : (s.remoteMeal[0] ? s.remoteMeal : "Meal");
    strlcpy(g.ackId, targetId, sizeof(g.ackId));
    strlcpy(g.ackMeal, targetMeal, sizeof(g.ackMeal));
    if (requestedBy[0]) {
      snprintf(g.ackSource, sizeof(g.ackSource), "REMOTE: %s", requestedBy);
    } else {
      strlcpy(g.ackSource, "REMOTE_DASHBOARD", sizeof(g.ackSource));
    }
    Serial.printf("[%lu ms][Ack Event] Source: %s | Acknowledging reminder \"%s\" (ID: %s)\n",
                  now, g.ackSource, g.ackMeal, g.ackId);
    enterStateLocked(DS_ACKNOWLEDGED, now); // Immediately halts buzzer and turns on Green LED
    unlockG();

    // Confirm command back to Firebase RTDB
    JsonDocument patch;
    patch["status"] = "CONFIRMED";
    patch["result"] = "ACKNOWLEDGED_BY_REMOTE";
    patch["processedAt"][".sv"] = "timestamp";

    String body, resp;
    serializeJson(patch, body);
    String cmdPath = devicePath() + "/command";
    int code = dbRequest("PATCH", cmdPath, body, resp);
    if (code == 200) {
      Serial.printf("[RemoteCmd] Command '%s' marked CONFIRMED in Firebase\n", cmdId);
    } else {
      Serial.printf("[RemoteCmd] Warning: Failed to patch command status (HTTP %d)\n", code);
    }
  } else {
    Serial.printf("[RemoteCmd] Command '%s' REJECTED: %s (target='%s', activeId='%s')\n",
                  cmdId, failReason, targetRemId, activeId);

    JsonDocument patch;
    patch["status"] = "FAILED";
    patch["result"] = failReason;
    patch["processedAt"][".sv"] = "timestamp";

    String body, resp;
    serializeJson(patch, body);
    String cmdPath = devicePath() + "/command";
    int code = dbRequest("PATCH", cmdPath, body, resp);
    if (code == 200) {
      Serial.printf("[RemoteCmd] Command '%s' marked FAILED in Firebase (%s)\n", cmdId, failReason);
    } else {
      Serial.printf("[RemoteCmd] Warning: Failed to patch command status (HTTP %d)\n", code);
    }
  }
}

static void pollDevice() {
  String body;
  int code = dbRequest("GET", devicePath(), "", body);
  if (code != 200) {
    handleDbFailure("poll", code);
    return;
  }

  JsonDocument d;
  DeserializationError e = deserializeJson(d, body);
  if (e) {
    dbFails++;
    Serial.printf("[DB] poll: JSON parse error: %s\n", e.c_str());
    setCloud("ERR");
    return;
  }

  bool active = false, acked = false;
  RemoteState rs = RM_NONE;
  char id[40] = "", meal[32] = "", tstr[24] = "";

  if (!d.isNull()) {
    if (!d.is<JsonObject>()) {
      dbFails++;
      Serial.println("[DB] poll: unexpected data type at device path");
      setCloud("ERR");
      return;
    }
    active = d["currentReminder"]["active"] | false;
    copyJsonText(d["currentReminder"]["id"], id, sizeof(id));
    copyJsonText(d["currentReminder"]["mealName"], meal, sizeof(meal));
    copyJsonText(d["currentReminder"]["time"], tstr, sizeof(tstr));
    rs = parseRemoteState(d["state"] | "");
    acked = d["acknowledgement"]["acknowledged"] | false;
    if (rs == RM_OTHER)
      Serial.println(
          "[DB] poll: unrecognised \"state\" value (treated as no change)");
  }

  dbFails = 0;
  static bool loggedOnce = false;
  static bool lastActive = false;
  static RemoteState lastRs = RM_NONE;
  static uint32_t lastLogAt = 0;
  uint32_t now = millis();
  if (!loggedOnce || active != lastActive || rs != lastRs ||
      (now - lastLogAt) >= 10000) {
    Serial.printf(
        "[DB] Poll OK | state=%s | active=%s | meal=\"%s\" | time=\"%s\"\n",
        remoteStateName(rs), active ? "true" : "false", meal, tstr);
    loggedOnce = true;
    lastActive = active;
    lastRs = rs;
    lastLogAt = now;
  }

  lockG();
  g.haveData = true;
  g.remoteActive = active;
  g.remoteAcked = acked;
  g.remoteState = rs;
  strlcpy(g.remoteId, id, sizeof(g.remoteId));
  strlcpy(g.remoteMeal, meal, sizeof(g.remoteMeal));
  strlcpy(g.remoteTime, tstr, sizeof(g.remoteTime));
  g.remoteSeq++;
  strlcpy(g.cloud, "OK", sizeof(g.cloud));
  unlockG();

  // Check for pending remote commands from Firebase
  if (!d.isNull() && d.is<JsonObject>()) {
    if (d["command"].is<JsonObjectConst>()) {
      processRemoteCommand(d["command"].as<JsonObjectConst>());
    }
  }
}

// PATCH /devices/<id> {online:true, lastSeen:<server timestamp>}.
// lastSeen uses the database server timestamp (epoch ms) because the web app
// compares it with Date.now().
static void sendHeartbeat() {
  String body = "{\"online\":true,\"lastSeen\":{\".sv\":\"timestamp\"}}";
  String resp;
  int code = dbRequest("PATCH", devicePath(), body, resp);
  if (code == 200)
    Serial.printf("[Heartbeat] OK | RSSI %d dBm\n", WiFi.RSSI());
  else
    handleDbFailure("heartbeat", code);
}

// PATCH /devices/<id> with the same fields as
// firebaseRtdbService.acknowledgeReminder():
//   state, currentReminder/active, acknowledgement/acknowledged,
//   /acknowledgedBy, /timestamp.
// Slash-separated keys make this a multi-path update, so
// currentReminder.id/mealName/time/timestamp are left untouched (the web app
// reads currentReminder.id after an acknowledgement).
static void sendAcknowledgement() {
  Shared s = snapshot();

  JsonDocument d;
  d["state"] = "ACKNOWLEDGED";
  d["currentReminder/active"] = false;
  d["acknowledgement/acknowledged"] = true;
  d["acknowledgement/acknowledgedBy"] = (s.ackSource[0] ? s.ackSource : ACK_BY);
  char iso[32];
  if (isoNow(iso, sizeof(iso)))
    d["acknowledgement/timestamp"] =
        iso; // the web app stores an ISO string here
  else
    Serial.println(
        "[Ack] Clock not synced yet: acknowledgement/timestamp left unchanged");
  String body, resp;
  serializeJson(d, body);

  int code = dbRequest("PATCH", devicePath(), body, resp);
  if (code == 200) {
    lockG();
    g.ackPending = false;
    g.ackSource[0] = '\0';
    strlcpy(
        g.ignoreId, s.ackId,
        sizeof(
            g.ignoreId)); // do not re-trigger this reminder from a stale poll
    g.ignoreSet = true;
    unlockG();
    Serial.println("[Ack] Acknowledgement written to Firebase");
  } else {
    handleDbFailure("ack", code);
    Serial.println("[Ack] Write failed; will retry");
  }
}

// PATCH /devices/<id> when a reminder times out without physical button press:
//   state: "MISSED", currentReminder/active: false.
static void sendMissed() {
  JsonDocument d;
  d["state"] = "MISSED";
  d["currentReminder/active"] = false;

  String body, resp;
  serializeJson(d, body);

  int code = dbRequest("PATCH", devicePath(), body, resp);
  if (code == 200) {
    lockG();
    g.missPending = false;
    unlockG();
    Serial.println("[Missed] Missed state synced to Firebase");
  } else {
    handleDbFailure("missed", code);
    Serial.println("[Missed] Write failed; will retry");
  }
}

// PATCH /devices/<id>/telemetry
// Non-blocking for the hardware loop (runs purely on Core 0 netTask).
// Updates only the /telemetry path without altering reminder or device state fields.
static void sendTelemetry() {
  Shared s = snapshot();

  // If sensors have not performed an initial sample yet, skip
  if (!s.ldrValid && !s.dhtValid)
    return;

  JsonDocument d;
  if (s.dhtValid && s.dhtLastReadOk) {
    d["temperature"] = round(s.tempC * 10.0) / 10.0;
    d["humidity"] = round(s.humidity * 10.0) / 10.0;
    d["valid"] = true;
  } else if (s.dhtValid) {
    // Preserve last known valid values, but mark valid=false (stale)
    d["temperature"] = round(s.tempC * 10.0) / 10.0;
    d["humidity"] = round(s.humidity * 10.0) / 10.0;
    d["valid"] = false;
  } else {
    d["temperature"] = nullptr;
    d["humidity"] = nullptr;
    d["valid"] = false;
  }

  d["light"] = s.ldrDark ? "DARK" : "BRIGHT";
  d["timestamp"][".sv"] = "timestamp";

  String body, resp;
  serializeJson(d, body);

  String path = devicePath() + "/telemetry";
  int code = dbRequest("PATCH", path, body, resp);
  if (code == 200) {
    static uint32_t lastLog = 0;
    uint32_t now = millis();
    if (now - lastLog >= 15000) {
      lastLog = now;
      Serial.printf("[Telemetry] Synced to Firebase RTDB: %.1f C, %.1f %%, %s\n",
                    s.tempC, s.humidity, s.ldrDark ? "DARK" : "BRIGHT");
    }
  } else {
    // Non-fatal: do not disrupt state machine or wipe dbFails
    if (code == 401) {
      tokenValid = false;
    }
    Serial.printf("[Telemetry] Sync HTTP %d (non-fatal)\n", code);
  }
}

static void firebaseService() {
  uint32_t now = millis();

  if (tokenValid && (int32_t)(now - tokenHardAt) >= 0)
    tokenValid = false;

  bool needAuth = !tokenValid;
  bool needRefresh = tokenValid && (int32_t)(now - tokenRefreshAt) >= 0;
  if ((needAuth || needRefresh) && (int32_t)(now - authRetryAt) >= 0) {
    if (acquireToken()) {
      authFails = 0;
      setCloud("Auth OK");
    } else {
      authFails++;
      uint32_t wait = BACKOFF(authFails, AUTH_BACKOFF_MS);
      authRetryAt = now + wait;
      Serial.printf("[Auth] Will retry in %lu s\n",
                    (unsigned long)(wait / 1000));
      if (!tokenValid)
        setCloud("Auth FAIL");
    }
  }
  if (!tokenValid)
    return;

  now = millis();
  Shared s = snapshot();

  if (s.ackPending && (int32_t)(now - nextAckAt) >= 0) {
    nextAckAt = now + ACK_RETRY_MS;
    sendAcknowledgement();
    return;
  }

  if (s.missPending && (int32_t)(now - nextAckAt) >= 0) {
    nextAckAt = now + ACK_RETRY_MS;
    sendMissed();
    return;
  }

  if (!s.ackPending && (int32_t)(now - nextPollAt) >= 0) {
    uint32_t interval = (s.ds == DS_ACTIVE || s.remoteActive) ? 1200 : POLL_INTERVAL_MS;
    if (dbFails > 0) {
      int shift = dbFails > 3 ? 3 : dbFails;
      interval = interval << shift;
      if (interval > 20000)
        interval = 20000;
    }
    nextPollAt = now + interval;
    pollDevice();
    return;
  }

  static uint32_t nextTelemetryAt = 0;
  if (!s.ackPending && !s.missPending && (int32_t)(now - nextTelemetryAt) >= 0) {
    nextTelemetryAt = now + TELEMETRY_INTERVAL_MS;
    sendTelemetry();
    return;
  }

  if ((int32_t)(now - nextHeartbeatAt) >= 0) {
    nextHeartbeatAt = now + HEARTBEAT_INTERVAL_MS;
    sendHeartbeat();
  }
}

// ============================================================================
// NETWORK TASK
// ============================================================================
static void netTask(void *) {
  for (;;) {
    wifiService();
    if (wifiState == WS_CONNECTED)
      firebaseService();
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

// ============================================================================
// ARDUINO ENTRY POINTS
// ============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=====================================");
  Serial.println(" DietDecode ESP32 firmware v" FW_VERSION);
  Serial.println("=====================================");
  Serial.printf("Arduino ESP32 core %d.%d.%d | device %s\n",
                ESP_ARDUINO_VERSION_MAJOR, ESP_ARDUINO_VERSION_MINOR,
                ESP_ARDUINO_VERSION_PATCH, DEVICE_ID);

  memset(&g, 0, sizeof(g));
  g.ds = DS_READY;
  g.remoteState = RM_NONE;
  strlcpy(g.cloud, "Starting", sizeof(g.cloud));
  gMutex = xSemaphoreCreateMutex();

  hardwareInit();
  sensorInit();

  WiFi.persistent(false);
  WiFi.onEvent(onWiFiEvent);
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.setAutoReconnect(false); // recovery is handled only by the state machine
  Serial.print("[WiFi] MAC address: ");
  Serial.println(WiFi.macAddress());

  tlsSetup();
  xTaskCreatePinnedToCore(netTask, "net", 20480, nullptr, 1, nullptr, 0);
}

void loop() {
  buttonService();
  ldrService();
  stateService();
  outputsService();
  sensorService();
  oledService();
  delay(5);
}
