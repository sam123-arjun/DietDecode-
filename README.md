# DIETDECODE — IoT-Based Personalized Diet Recommendation & Reminder System

> **Final-Year Engineering Project Capstone**  
> *"Personalized Nutrition. Smarter Physical Reminders."*

DietDecode is a complete cyber-physical healthcare platform bridging **deterministic nutritional science** with **physical ESP32 IoT reminder devices**. By transitioning from smartphone notification fatigue to tangible, multi-sensory physical alerts (OLED display, tri-color status LEDs, piezoelectric buzzer, and tactile button acknowledgment), DietDecode enforces strict adherence to clinical diet routines.

---

## 1. System Architecture Overview

DietDecode operates on a **dual-architecture paradigm**:
1. **Firebase Cloud Mode (Production)**: Real-time internet connectivity via Google Firebase (Authentication, Cloud Firestore, Realtime Database, Hosting) enabling remote synchronization anywhere in the world.
2. **Local REST Mode (Development / Offline)**: High-speed local network REST bridge hosted by the Vite development server (`/api/reminder`, `/api/trigger`, `/api/acknowledge`) allowing local hardware testing without cloud dependencies.

```
                           DIETDECODE WEB APP
                         (React 19 + TypeScript)
                                    │
                  ┌─────────────────┴─────────────────┐
                  │                                   │
                  ▼                                   ▼
        [Production Cloud Mode]              [Development Local Mode]
             FIREBASE CLOUD                    VITE LOCAL REST SERVER
            /              \                     (http://<IP>:5173/api)
           /                \                         │
    Cloud Firestore   Realtime Database               │
          │                   │                       │
   Users / Profiles    Live IoT Telemetry             │
   Meals / Reminders   Device State (READY/ALERT)     │
   Adherence History   Push Button Acknowledgment     │
           \                 /                        │
            \               /                         │
             ▼             ▼                          ▼
              Internet (HTTPS)                 Wi-Fi Local (HTTP)
                     │                                │
                     └────────────────┬───────────────┘
                                      │
                                      ▼
                             ESP32 NODEMCU UNIT
                              (ESP-WROOM-32)
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
              ▼                       ▼                       ▼
      SSD1306 OLED (I2C)       RGB STATUS LEDS          PIEZO BUZZER
      GPIO 21 (SDA)            Red:   GPIO 15           GPIO 23 (Digital)
      GPIO 22 (SCL)            Green: GPIO 5            2.4 kHz Active
      128x64 Meal Display      Blue:  GPIO 4
                                      │
                                      ▲
                                      │ Physical Press
                              TACTILE PUSH BUTTON
                              GPIO 18 (INPUT_PULLDOWN)
                              3.3V Active-High
```

> **IMPORTANT ARCHITECTURAL FACT**:  
> **The laptop is NOT required for normal DietDecode hardware operation after firmware is uploaded.** The ESP32 communicates directly with Google Firebase Cloud over Wi-Fi. It only requires independent power (5V USB power bank or wall adapter) and Wi-Fi connectivity.

---

## 2. Hardware Specifications & Confirmed Pinout

> **IMPORTANT**: The prototype hardware is physically assembled and confirmed. Do not change these pin assignments.

| Component | Pin / Function | ESP32 GPIO | Electrical Mode | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **SSD1306 OLED (128×64)** | SDA | **GPIO 21** | I2C Serial Data | Real-time meal display & action prompt |
| **SSD1306 OLED (128×64)** | SCL / SCK | **GPIO 22** | I2C Serial Clock | Clock synchronization line |
| **SSD1306 OLED (128×64)** | VDD & GND | **3.3V / GND** | Power Rails | Logic supply |
| **Active Piezo Buzzer** | Positive (+) | **GPIO 23** | Digital Output | 2.4 kHz audible reminder chime (HIGH = Sound, LOW = Mute) |
| **Active Piezo Buzzer** | Negative (-) | **GND** | Ground | Circuit ground |
| **Tactile Push Button** | Signal | **GPIO 18** | `INPUT_PULLDOWN` | Physical acknowledgement (Active High, 3.3V) |
| **Red Status LED** | Anode (+) with 220Ω | **GPIO 15** | Digital OUTPUT | Indicates **MISSED** reminder state |
| **Green Status LED** | Anode (+) with 220Ω | **GPIO 5** | Digital OUTPUT | Indicates **READY** / online standby |
| **Blue Status LED** | Anode (+) with 220Ω | **GPIO 4** | Digital OUTPUT | Pulses during **REMINDER_ACTIVE** state |

---

## 3. Four Device States & Hardware Behavior

| Device State | Status LED | Buzzer | OLED Display | System Action |
| :--- | :--- | :--- | :--- | :--- |
| **`READY`** | **Green ON** | Silent | `DIETDECODE - READY` | Heartbeat sent to Firebase every 30s. |
| **`REMINDER_ACTIVE`** | **Blue Pulsing** | 2.4 kHz alert beep | `! MEAL TIME !`<br>`[Meal Name]`<br>`[Time]`<br>`>> Press Button <<` | Web app triggers alarm; hardware awaits button press. |
| **`ACKNOWLEDGED`** | **Green Blink** | Two quick chirps | `MEAL CONFIRMED!`<br>`Good job!` | Physical button on GPIO 18 pressed. Sent to cloud. |
| **`MISSED`** | **Red ON** | Silent | `MISSED MEAL`<br>`Logged to history` | Grace period (180s) timed out without button press. |

---

## 4. Software Technologies

- **Frontend**: React 19, TypeScript, Vite 8
- **Styling**: Vanilla CSS with modern CSS custom properties, responsive container queries, glassmorphism, glowing cyan/teal tech tokens
- **Cloud Backend**: Google Cloud Firestore, Firebase Realtime Database, Firebase Authentication, Firebase Hosting
- **Firmware**: Arduino C++ (`Adafruit_GFX`, `Adafruit_SSD1306`, `ArduinoJson`, `WiFiClientSecure`, `HTTPClient`)
- **Offline / Mock Mode**: Evaluator Mock Development Mode with reactive `localStorage` persistence

---

## 5. Environment Variables & Modes

Create a `.env` file in the root directory (based on `.env.example`):

```env
# IoT Operational Mode: 'firebase' (production cloud) or 'local' (development REST bridge)
VITE_IOT_MODE=firebase

# Registered Hardware Device Identifier
VITE_ESP32_DEVICE_ID=dietdecode-device-01

# Firebase Web App Credentials (from Firebase Console)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

### Switching IoT Modes

* **Firebase Cloud Mode (`VITE_IOT_MODE=firebase`)**:
  Web app connects to Firebase RTDB and Firestore. The ESP32 communicates over secure HTTPS directly with Firebase Realtime Database.
* **Local REST Mode (`VITE_IOT_MODE=local`)**:
  Web app uses the built-in Vite server REST bridge at `http://<your-local-ip>:5173/api`. The ESP32 communicates directly with your laptop via Wi-Fi HTTP.

---

## 6. Firebase Setup Instructions

For step-by-step screenshots and detailed setup instructions, see [FIREBASE_SETUP.md](file:///e:/DietDecode/FIREBASE_SETUP.md).

### Summary of Firebase Configuration:
1. **Authentication**: Enable the **Email/Password** provider in the Firebase Console.
2. **Device Service Account**: Add a dedicated user (e.g. `device-01@dietdecode.internal`) in Firebase Auth -> Users tab.
3. **Cloud Firestore**: Create a Firestore database in **production mode**. Deploy [firestore.rules](file:///e:/DietDecode/firestore.rules):
   ```bash
   npx firebase deploy --only firestore:rules
   ```
4. **Realtime Database**: Create an RTDB instance. Deploy [database.rules.json](file:///e:/DietDecode/database.rules.json):
   ```bash
   npx firebase deploy --only database
   ```
5. **Firebase Hosting**: Deploy the web app:
   ```bash
   npm run build
   npx firebase deploy --only hosting
   ```

---

## 7. Cloud Data Schemas

### Cloud Firestore Structure (`users/{userId}`)

* **`users/{userId}/profile/data`**:
  `fullName`, `age`, `gender`, `height`, `weight`, `activityLevel`, `dietType`, `favoriteFoods`, `allergies`, `healthGoals`, `targetCalories`, `targetProtein`, `targetCarbs`, `targetFats`.
* **`users/{userId}/meals/{mealId}`**:
  `name`, `scheduledTime`, `items`, `calories`, `protein`, `carbs`, `fats`, `waterMl`, `recommendationNotes`, `reminderEnabled`, `order`.
* **`users/{userId}/reminders/{reminderId}`**:
  `mealName`, `date`, `time`, `status` (`upcoming` | `active` | `completed` | `missed`), `enabled`, `acknowledged`, `acknowledgedAt`.
* **`users/{userId}/reminderHistory/{historyId}`**:
  `mealName`, `date`, `time`, `status`, `acknowledgedAt`, `latencySeconds`, `deviceAcknowledged`, `note`.

### Firebase Realtime Database Structure (`devices/{deviceId}`)

```json
{
  "devices": {
    "dietdecode-device-01": {
      "online": true,
      "state": "READY",
      "lastSeen": 1759248000000,
      "currentReminder": {
        "id": "rem_1",
        "mealName": "Lunch",
        "time": "13:00",
        "active": false
      },
      "acknowledgement": {
        "acknowledged": false,
        "acknowledgedBy": "ESP32_PHYSICAL_BUTTON_GPIO18",
        "timestamp": 1759248000000
      }
    }
  }
}
```

---

## 8. ESP32 Firmware & Flashing

For complete Arduino IDE setup, driver installation, and troubleshooting, see [ESP32_FIREBASE_SETUP.md](file:///e:/DietDecode/ESP32_FIREBASE_SETUP.md).

### Firmware Code Generation
In the DietDecode web app, click **"Firmware .ino"** on the ESP32 card or modal. You can toggle between:
1. **Firebase Cloud IoT (Production)**: Uses `WiFiClientSecure` to connect directly to Firebase Realtime Database via HTTPS REST with secure token authentication.
2. **Local REST Bridge (Development)**: Connects to your laptop IP on port `5173`.

### Required Arduino Libraries
- `Adafruit SSD1306` (by Adafruit)
- `Adafruit GFX Library` (by Adafruit)
- `ArduinoJson` (v6 or v7 by Benoit Blanchon)

---

## 9. How to Run Locally

### 1. Install & Launch
```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server on all network interfaces
npx vite --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173` or `http://<your-lan-ip>:5173`.

### 2. 1-Click Evaluation Demo
If Firebase credentials are not yet configured, DietDecode automatically runs in **Evaluator Mock Mode**:
1. Click **Sign In**.
2. Sign in with your registered account or click **"Register here"** to create your profile.
3. All dashboards, diet metrics, meal timers, and simulator controls will be fully operational.

---

## 10. Standalone Operation When Laptop is OFF

To demonstrate true IoT independence for college/expo evaluations:
1. Flash the ESP32 firmware using the Arduino IDE.
2. Unplug the ESP32 from the laptop and power it via a **5V USB mobile charger or power bank**.
3. **Shut down your laptop completely.**
4. Open the deployed Firebase Hosting web app on your **mobile phone** (`https://your-project-id.web.app`).
5. Trigger an alert for Lunch.
6. The physical ESP32 will chime, blink Blue, and display the meal on the OLED screen.
7. Press the button on **GPIO 18**: the buzzer silences, and the mobile browser automatically marks the meal **Completed ✓** via Firebase Realtime Database!

---

## 11. End-to-End Testing Procedure

Follow this 22-step verification workflow:

1. **Web App Launch**: Run `npm run dev` and verify UI loads at `http://localhost:5173`.
2. **Configuration Detection**: Navbar displays mode indicator (`● Cloud ESP32` or `● Local ESP32`).
3. **Register/Login**: Sign up with email or use 1-Click Demo login.
4. **User Profile**: Modify biometrics in Profile page; verify values update.
5. **Meals**: Add/edit a meal item in Meal Schedule.
6. **Reminders**: Verify reminders are generated for today's meals.
7. **Cloud Sync**: Verify reminder document appears in Firestore/RTDB.
8. **Device Telemetry**: Dashboard shows device status (🟢 Online / 🔴 Offline).
9. **ESP32 Wi-Fi**: Power ESP32; verify Serial Monitor shows `WiFi Connected!` and IP.
10. **ESP32 Cloud Link**: ESP32 heartbeat updates `lastSeen` in Firebase RTDB.
11. **Trigger Reminder**: Click **"Test Alert"** on the web app for Lunch.
12. **Cloud State Transition**: RTDB `state` changes to `REMINDER_ACTIVE`.
13. **ESP32 Detection**: ESP32 fetches reminder payload via HTTPS.
14. **OLED Display**: Screen shows `! MEAL TIME !`, meal name, and `>> Press Button <<`.
15. **Blue LED**: Blue LED illuminates and pulses on GPIO 4.
16. **Buzzer**: 2.4 kHz audible chime sounds on GPIO 23.
17. **Physical Button Press**: Press tactile switch on GPIO 18.
18. **Hardware Acknowledgment**: ESP32 chimes confirmation, sets state to `ACKNOWLEDGED`.
19. **Cloud Update**: RTDB `acknowledgement.acknowledged = true`.
20. **Web UI Auto-Update**: Web dashboard automatically updates meal to **Completed** without page refresh.
21. **Missed Reminder Test**: Trigger alert and wait 180s without pressing button.
22. **Missed Recording**: Red LED turns ON; event logged as **Missed** in Reminder History.

---

## 12. Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **OLED display is blank** | Incorrect I2C wiring or address mismatch | Verify SDA=GPIO 21, SCL=GPIO 22, VDD=3.3V, GND=GND. In the sketch, ensure `0x3C` I2C address is set. |
| **Buzzer stays on continuously** | Passive buzzer used instead of active buzzer | Replace with active 5V/3.3V buzzer or check GPIO 23 connection. |
| **Button press not detected** | Loose wiring on GPIO 18 | Check that button is connected between GPIO 18 and 3.3V. Ensure `INPUT_PULLDOWN` is enabled in firmware. |
| **ESP32 fails HTTPS connection** | Incorrect RTDB host or SSL issue | Ensure `FIREBASE_HOST` is entered as `your-project-id-default-rtdb.firebaseio.com` without `https://`. Use `client.setInsecure()` as in the provided sketch. |
| **Web app says "Firebase Offline"** | Missing `.env` credentials | Check `.env` file exists and Vite has been restarted. |
| **Local mode: ESP32 cannot reach laptop** | Windows Firewall blocking port 5173 | Allow Node.js/Vite through Windows Defender Firewall, or run on the same 2.4 GHz Wi-Fi band. |
