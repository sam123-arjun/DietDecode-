# DietDecode — Firebase Cloud Setup Guide

This guide provides step-by-step instructions for configuring **Firebase Cloud** (Authentication, Cloud Firestore, Realtime Database, and Hosting) for DietDecode, enabling secure, real-time IoT synchronization with your physical ESP32 node.

---

## 1. Cloud Architecture Overview

```
                         DIETDECODE WEB APP
                         (React 19 + TypeScript)
                                 │
                                 ▼
                         FIREBASE CLOUD
                         /            \
                        /              \
            Cloud Firestore        Realtime Database
                  │                        │
          Users / Profile          Live IoT State (READY / ALERT)
          Meals / Reminders        Hardware Acknowledgement
          Compliance History       Device Heartbeat Presence
                        \              /
                         \            /
                         ESP32 NODE (Wi-Fi)
                                 │
                     ┌───────────┼───────────┐
                     │           │           │
                  OLED         LEDs        Buzzer
                                             │
                                           Button (GPIO 18)
```

---

## 2. Step-by-Step Firebase Project Configuration

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** (or **Create a project**).
3. Name your project (e.g. `dietdecode-iot`).
4. (Optional) Disable Google Analytics for faster setup, then click **Create project**.

---

### Step 2: Register Web Application
1. In your project dashboard, click the **Web icon** (`</>`) to add a web app.
2. Enter an app nickname (e.g. `DietDecode Web`).
3. (Optional) Check the box for **"Also set up Firebase Hosting for this app"**.
4. Click **Register app**.
5. You will see a `firebaseConfig` object with your keys:
   * `apiKey`
   * `authDomain`
   * `projectId`
   * `storageBucket`
   * `messagingSenderId`
   * `appId`

---

### Step 3: Enable Firebase Authentication
1. In the left sidebar, click **Build** → **Authentication**.
2. Click **Get started**.
3. Under **Sign-in method**, click **Email/Password**.
4. Enable the first toggle: **Email/Password** (leave Email link disabled).
5. Click **Save**.

---

### Step 4: Create Device Service Account for ESP32
To ensure strict security without leaving your Realtime Database publicly writable:
1. In **Authentication** → **Users** tab, click **Add user**.
2. Enter an email for your hardware node:
   * **Email**: `device-01@dietdecode.internal`
   * **Password**: `choose_a_secure_device_password`
3. Click **Add user**.
4. Note down this email and password — you will enter them into lines 44–46 of the ESP32 firmware sketch. The ESP32 uses Google's Identity Toolkit REST API to obtain a scoped, 1-hour JWT authentication token automatically.

---

### Step 5: Create Cloud Firestore Database
1. In the left sidebar, click **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose a database location close to you (e.g. `nam5 (us-central)` or `asia-south1`).
4. Select **Start in production mode**, and click **Create**.
5. Once created, go to the **Rules** tab, paste the contents of [firestore.rules](file:///e:/DietDecode/firestore.rules) from this repository, and click **Publish**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         match /{subcollection=**} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```

---

### Step 6: Create Firebase Realtime Database
1. In the left sidebar, click **Build** → **Realtime Database**.
2. Click **Create Database**.
3. Select your database location (e.g. `United States (us-central1)`).
4. Select **Start in locked mode**, then click **Enable**.
5. Note your Realtime Database URL at the top (e.g., `https://your-project-id-default-rtdb.firebaseio.com`).
6. Go to the **Rules** tab, paste the contents of [database.rules.json](file:///e:/DietDecode/database.rules.json), and click **Publish**:
   ```json
   {
     "rules": {
       "devices": {
         "$deviceId": {
           ".read": "auth != null",
           ".write": "auth != null",
           "online": {
             ".validate": "newData.isBoolean()"
           },
           "state": {
             ".validate": "newData.isString()"
           },
           "lastSeen": {
             ".validate": "newData.isNumber()"
           },
           "currentReminder": {
             ".validate": "newData.hasChildren(['id', 'mealName', 'time', 'active'])"
           },
           "acknowledgement": {
             ".validate": "newData.hasChildren(['acknowledged'])"
           }
         }
       }
     }
   }
   ```
   > **SECURITY GUARANTEE**: Every single read and write requires `auth != null`. Unauthenticated requests receive HTTP 401 Unauthorized. Both the logged-in web app user and the authenticated ESP32 device have valid tokens.

---

## 3. Configure Your Local Web App `.env`

In your `e:\DietDecode\` root directory, copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and fill in your values from Firebase Console:

```env
# Cloud Operation Mode: 'firebase' (production) or 'local' (offline dev)
VITE_IOT_MODE=firebase
VITE_ESP32_DEVICE_ID=dietdecode-device-01

# Web App Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSy...YOUR_KEY...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

---

## 4. Run & Test the Application

1. Start your local dev server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:5173/` in your browser.
3. Open your browser console (F12) to verify:
   ```
   ⚡ Firebase Cloud initialized for DietDecode (IoT Mode: FIREBASE, Device: dietdecode-device-01).
   ```
4. Register a new user with email and password:
   * Firestore will create your document under `users/{userId}` and initialize your personalized diet plan, meals, and reminders.
5. In the top navbar, observe the live status chip: `● Cloud ESP32`.

---

## 5. Next Steps

1. **Flash Physical ESP32 Hardware**: Follow [ESP32_FIREBASE_SETUP.md](file:///e:/DietDecode/ESP32_FIREBASE_SETUP.md).
2. **Deploy to Firebase Hosting**: Follow [DEPLOYMENT.md](file:///e:/DietDecode/DEPLOYMENT.md).
