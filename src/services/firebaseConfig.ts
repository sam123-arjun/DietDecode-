import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import { getFunctions, Functions } from 'firebase/functions';

export type IotMode = 'firebase' | 'local';

// Environment variables configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
};

export const defaultDeviceId =
  import.meta.env.VITE_ESP32_DEVICE_ID || 'dietdecode-device-01';

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('YOUR_') &&
  firebaseConfig.apiKey !== ''
);

// IoT Mode: 'firebase' (Cloud mode) or 'local' (Local REST bridge mode)
const configuredMode = (import.meta.env.VITE_IOT_MODE || 'firebase').toLowerCase();
export const iotMode: IotMode =
  configuredMode === 'local'
    ? 'local'
    : 'firebase';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app, 'us-central1');

    // Initialize Realtime Database (with custom databaseURL if provided, or default project URL)
    if (firebaseConfig.databaseURL) {
      rtdb = getDatabase(app, firebaseConfig.databaseURL);
    } else {
      rtdb = getDatabase(app);
    }

    console.info(
      `⚡ Firebase Cloud initialized for DietDecode (IoT Mode: ${iotMode.toUpperCase()}, Device: ${defaultDeviceId}).`
    );
  } catch (error) {
    console.error(
      '⚠️ Firebase Cloud initialization error:',
      error
    );
  }
} else {
  if (iotMode === 'firebase') {
    console.warn(
      '⚠️ Firebase Cloud mode is active (VITE_IOT_MODE=firebase) but live Firebase credentials are not properly configured. Operating in Firebase offline/error state without silent fallback to local REST.'
    );
  } else {
    console.info(
      'ℹ️ Running DietDecode in Local Development Mode (VITE_IOT_MODE=local). Local REST IoT bridge active.'
    );
  }
}

export { app, auth, db, rtdb, functions };
