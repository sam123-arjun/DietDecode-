# DietDecode — Production Deployment Guide (Firebase Hosting)

This guide walks you through deploying the **DietDecode** web application to **Google Firebase Hosting**, creating a globally accessible, high-speed HTTPS deployment that is **100% independent of your local laptop**.

---

## 1. Cloud Deployment Architecture

Once deployed to Firebase Hosting, the DietDecode web application is delivered through Google's global CDN:

```
                            GLOBAL INTERNET
                                   │
               ┌───────────────────┴───────────────────┐
               │                                       │
               ▼                                       ▼
       [User / Nutritionist]                    [ESP32 Device]
      Desktop / Tablet / Mobile              USB Power Adapter / Wi-Fi
               │                                       │
               ▼ (HTTPS)                               ▼ (HTTPS REST)
     +-------------------+                   +-------------------+
     | Firebase Hosting  |                   | Firebase Realtime |
     | (Global CDN Edge) |                   | Database (Live)   |
     +---------+---------+                   +---------+---------+
               │                                       │
               ├───────────────────┬───────────────────┤
               │                   │                   │
               ▼                   ▼                   ▼
        Cloud Firestore     Firebase Auth     Realtime Database
       (Users/Meals/Diet)   (JWT Security)    (Device State/IoT)
```

> **IMPORTANT**: In this production architecture:
> * The **laptop is NOT required** for hosting, routing, or serving data.
> * The **ESP32 is NOT connected to the laptop**; it connects over Wi-Fi directly to Firebase Realtime Database.
> * Users can access DietDecode from any phone, laptop, or tablet worldwide.

---

## 2. Prerequisites

1. **Node.js** (v18 or v20+) installed on your machine.
2. **Firebase Tools CLI**:
   ```bash
   npm install -g firebase-tools
   ```
   *(Or run via `npx firebase-tools` without global installation).*

---

## 3. Pre-Deployment Configuration

### Step 1: Set Up Production Environment Variables

Ensure your `.env` file contains your real Firebase project credentials:

```env
# Production Cloud Mode
VITE_IOT_MODE=firebase

# Your Registered Hardware Device ID
VITE_ESP32_DEVICE_ID=dietdecode-device-01

# Firebase Project Credentials (from Firebase Console -> Project Settings -> General)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

> **Note**: These `VITE_` variables are bundled into the static assets during `npm run build`. They identify your Firebase web client to Google's authentication servers. Private service account keys are **never** bundled or exposed.

---

## 4. Production Build

Build the optimized, production-ready static assets:

```bash
npm run build
```

This executes:
1. `tsc -b`: Strict TypeScript type-checking across all components and services.
2. `vite build`: Compiles, bundles, minifies, and outputs the production bundle to the `dist/` directory.

---

## 5. Deploying to Firebase

### Step 1: Login to Firebase CLI
```bash
firebase login
```
*(If working inside a restricted terminal or remote environment, use `firebase login --no-localhost`).*

### Step 2: Associate Your Project
Verify that your Firebase Project ID is configured in `.firebaserc`:
```bash
firebase use your-project-id
```

### Step 3: Deploy Security Rules First
Deploy the secured Firestore and Realtime Database rules:
```bash
firebase deploy --only firestore:rules,database
```

### Step 4: Deploy the Web Application to Firebase Hosting
```bash
firebase deploy --only hosting
```

Or deploy all services in a single command:
```bash
firebase deploy
```

---

## 6. Verifying the Production Deployment

Once the deployment completes, the Firebase CLI will output your live URL:
```text
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project-id/overview
Hosting URL: https://your-project-id.web.app
```

### Verification Checklist:
1. Open `https://your-project-id.web.app` in any browser (phone, tablet, laptop).
2. Verify Single Page Application (SPA) routing works upon page refresh:
   - Navigate to `/dashboard` and press **F5** (hard refresh). The page should load without returning a 404 error (handled by `firebase.json` rewrites).
   - Test `/profile`, `/diet`, `/reminders`, and `/history`.
3. Sign in or register a new user account using Firebase Authentication.
4. Verify the top navbar shows the **Cloud ESP32** telemetry indicator.
5. Create or trigger a meal reminder: verify the reminder appears in Cloud Firestore and Firebase Realtime Database.
6. Verify your ESP32 (powered independently via USB power bank/adapter) detects the reminder, sounds the buzzer, and displays the meal on the OLED screen.
7. Press the physical button on **GPIO 18**: verify that the web dashboard automatically marks the meal as **Completed** in real time!

---

## 7. Troubleshooting Deployment Issues

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **`HTTP 404 Not Found` on sub-routes after refresh** | Missing SPA rewrites | Ensure `firebase.json` contains `"rewrites": [{"source": "**", "destination": "/index.html"}]`. |
| **App loads but displays "Firebase Offline"** | Missing or incorrect `.env` values during build | Ensure `.env` was configured before running `npm run build`. Re-run `npm run build && firebase deploy --only hosting`. |
| **Deploy fails with `Permission Denied`** | Not logged in with proper Google account | Run `firebase logout && firebase login` with the Google account that owns the Firebase project. |
| **Realtime Database `401 Unauthorized`** | Missing authentication token | Ensure the user is logged into the web app, or that the ESP32 is authenticating with valid device credentials. |
