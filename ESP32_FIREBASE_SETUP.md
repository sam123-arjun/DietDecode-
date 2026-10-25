# DietDecode — ESP32 Physical Hardware Setup Guide (Firebase Cloud)

> **CRITICAL ARCHITECTURAL GUARANTEE**:  
> **The laptop is NOT required for normal DietDecode hardware operation after firmware is uploaded.** The ESP32 communicates directly with Google Firebase Cloud over Wi-Fi. It only requires independent power (5V USB power bank or wall adapter) and Wi-Fi connectivity.

---

## 1. Hardware Pinout (Validated & Confirmed)

| Component | ESP32 GPIO Pin | Protocol / Mode | Operational Role |
| :--- | :--- | :--- | :--- |
| **0.96" SSD1306 OLED** | **GPIO 21** (SDA)<br>**GPIO 22** (SCL)<br>`3.3V` (VDD)<br>`GND` (GND) | I2C Bus (`0x3C`) | Displays real-time meal name, scheduled time, and `>> Press Button <<` prompt |
| **Active Piezo Buzzer** | **GPIO 23** (+)<br>`GND` (-) | Digital Output (Active Buzzer) | Emits rhythmic 2.4 kHz audible reminder chime during active alert window (HIGH = on, LOW = mute) |
| **Tactile Push Button** | **GPIO 18** (Signal)<br>`3.3V` (Other leg) | Digital Input (`INPUT_PULLDOWN`) | Physical meal acknowledgment confirmation (silences buzzer & updates cloud) |
| **Tri-Color Status LEDs** | **GPIO 15** (Red)<br>**GPIO 5** (Green)<br>**GPIO 4** (Blue) | Digital Output | Red = Missed / Alert<br>Green = Standby / Ready<br>Blue = Active Reminder |

---

## 2. Arduino IDE & USB Driver Setup

### 1. Install USB-to-UART Driver (CP210x or CH340)
If your computer does not detect the ESP32 under **Tools** → **Port**:
* **NodeMCU / ESP-WROOM-32 with CP2102 chip**: Download and install the [Silicon Labs CP210x Driver](https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers).
* **ESP32 with CH340 / CH341 chip**: Download and install the WCH CH340 USB driver.

### 2. Install ESP32 Board Package in Arduino IDE
1. Open **Arduino IDE** (v2.x recommended).
2. Go to **File** → **Preferences**.
3. In **Additional boards manager URLs**, add:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to **Tools** → **Board** → **Boards Manager...**, search for `esp32` by **Espressif Systems**, and click **Install**.
5. Select your board under **Tools** → **Board** → **esp32** → **ESP32 Dev Module** (or NodeMCU-32S).

### 3. Install Required Arduino Libraries
Go to **Sketch** → **Include Library** → **Manage Libraries...** and install:
* **`Adafruit SSD1306`** (by Adafruit)
* **`Adafruit GFX Library`** (by Adafruit)
* **`ArduinoJson`** (by Benoit Blanchon - version 6 or 7)

---

## 3. Dedicated Device Authentication & Firmware Configuration

### Step A: Create the ESP32 User in Firebase Console
Before uploading firmware, create the dedicated device account in Firebase:
1. Open the [Firebase Console](https://console.firebase.google.com/project/dietdecode-808be/authentication/users) for project `dietdecode-808be`.
2. Go to **Build** → **Authentication** → **Users** tab.
3. Click **Add user**.
4. Enter the device credentials:
   * **Email**: `device-01@dietdecode.internal`
   * **Password**: *A secure password chosen by you* (e.g. `DietDecode2026!Device`)
5. Click **Add user**.

> **WHY THIS IS REQUIRED**:  
> DietDecode enforces strict security rules (`.read: "auth != null"`, `.write: "auth != null"`). The ESP32 firmware uses Google's Identity Toolkit REST API to log in with this email and password, receiving a temporary JWT ID token. This token is attached to all Realtime Database requests, keeping your cloud database 100% private and protected from unauthorized access.

---

### Step B: Configure Firmware Variables

In the DietDecode web app, click **"Firmware .ino"** on the ESP32 card or modal to view, copy, or download the full sketch.

Ensure lines 405–420 of the sketch match your Wi-Fi and Firebase credentials:

```cpp
// 1. Wi-Fi Configuration (Connect to home Wi-Fi or mobile hotspot)
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// 2. Firebase Realtime Database Host (without https:// and trailing slash)
const char* FIREBASE_HOST = "dietdecode-808be-default-rtdb.firebaseio.com";

// 3. Registered Device Identifier (Must match VITE_ESP32_DEVICE_ID in .env)
const char* DEVICE_ID     = "dietdecode-device-01";

// 4. Secure Device Authentication (Created in Step A)
const char* FIREBASE_API_KEY  = "YOUR_FIREBASE_WEB_API_KEY"; // From Firebase Console -> Project Settings -> General
const char* DEVICE_EMAIL    = "device-01@dietdecode.internal";
const char* DEVICE_PASSWORD = "REPLACE_WITH_DEVICE_PASSWORD"; // The password you created in Step A
```

---

### Step C: Laptop Independence
> **EXPLICIT GUARANTEE**:  
> **Arduino IDE and the laptop are required only to upload/update firmware. After firmware is uploaded, the ESP32 can operate independently using external USB power and Wi-Fi.**

* **Laptop Role**: The laptop is **ONLY** required for the initial code compile and firmware upload via USB in Arduino IDE.
* **After Firmware Upload**:
  ```text
  ESP32 NodeMCU
    ├── Independent USB power adapter (5V / power bank)
    ├── Wi-Fi (Home / Hotspot)
    └── Direct HTTPS to Firebase Cloud
  ```
  The laptop does **NOT** need to remain connected or turned on. The ESP32 operates autonomously 24/7.

---

## 4. Upload Procedure

1. Connect your ESP32 to your PC using a micro-USB (or USB-C) data cable.
2. Under **Tools** → **Port**, select your ESP32 COM port (e.g. `COM3`, `COM5`).
3. Set **Upload Speed** to `921600` (or `115200` if upload fails).
4. Click **Upload** (Ctrl + U).
   *(Note: If the upload hangs on `Connecting........_____`, press and hold the **BOOT** button on your ESP32 board for 2 seconds until the flashing percentage appears).*
5. Once flashed, open **Tools** → **Serial Monitor** at **`115200` baud**.

---

## 5. Expected Startup Output

```text
[DietDecode] Booting ESP32 NodeMCU...
.....
[WiFi] Connected successfully!
[WiFi] Device IP: 192.168.1.142
[Firebase Auth] Device authentication token obtained!
[Firebase] Heartbeat sent: dietdecode-device-01 online
```

At this point, your physical OLED screen will illuminate:
```text
DIETDECODE IoT
Cloud: FIREBASE
192.168.1.142
Status: READY
```
The **Green LED** on GPIO 5 will turn ON.

---

## 6. Running Without the Laptop (Standalone Mode)

After uploading the firmware:
1. **Unplug the ESP32 from your computer's USB port.**
2. Plug the ESP32 into a **standalone USB power bank or 5V phone charger**.
3. **Turn your laptop completely OFF.**
4. Observe the ESP32:
   - It boots independently.
   - Connects to your Wi-Fi automatically.
   - Authenticates with Firebase.
   - Illuminates the Green LED (Standby READY).
5. Open the deployed DietDecode web application on your **mobile phone** or any other device:
   - Trigger a reminder for Lunch.
   - **Watch the physical ESP32 respond across the room!** The Blue LED pulses, buzzer sounds, and OLED prompts: `>> Press Button <<`.
   - Press the physical tactile switch on **GPIO 18**.
   - The buzzer silences instantly, Green confirmation LED blinks, and your phone's web dashboard automatically updates to **"Completed ✓"**!

---

## 7. Offline Resilience & Network Interruption Behavior

* **Temporary Wi-Fi Disconnect**:
  * The ESP32 does not crash or reboot.
  * A non-blocking background timer checks connectivity every 10 seconds and automatically calls `WiFi.reconnect()`.
  * If an alarm is sounding while Wi-Fi drops, **the user can still press the physical button on GPIO 18 to silence the buzzer**. The acknowledgement is cached in RAM and automatically synced to Firebase the moment Wi-Fi reconnects.
* **Firebase Cloud Unavailability**:
  * The firmware retries on the next poll cycle without freezing the main execution loop.
  * Local timers maintain the 180-second grace period accurately.

---

## 8. Hardware Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **Arduino IDE says "No device found on COM port"** | Missing CP210x or CH340 driver or charge-only USB cable | Install the driver from Section 2. Use a certified USB data cable. |
| **OLED display is blank** | Incorrect I2C wiring or address mismatch | Verify SDA=GPIO 21, SCL=GPIO 22, VDD=3.3V, GND=GND. Ensure `0x3C` I2C address is set. |
| **Buzzer stays on continuously** | Passive buzzer used or inverted logic | Verify active buzzer connected to GPIO 23 and GND. Active buzzer sounds with `HIGH` and silences with `LOW`. |
| **Push button not registering** | Floating pin or incorrect resistor | Ensure button is connected between GPIO 18 and 3.3V. `INPUT_PULLDOWN` is enabled in firmware to ensure clean active-high trigger. |
| **Firebase HTTP 401 Unauthorized** | Device auth credentials incorrect | Verify `DEVICE_EMAIL` and `DEVICE_PASSWORD` in the sketch match the account created in Firebase Auth Console. |
