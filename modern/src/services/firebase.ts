// Firebase client foundation.
//
// Initializes the Firebase modular SDK for the existing `sledge-classroom`
// project and exposes the client-side services (Firestore, Realtime Database,
// Auth) consumed by the repository and service layers.
//
// Configuration is read exclusively from Vite environment variables
// (VITE_FIREBASE_*). No service-account credentials, Admin SDK keys, or other
// server secrets may ever be provisioned to the client. Firebase configuration
// values are public client configuration; security is enforced by Firebase
// Security Rules, not by hiding these values.
//
// Firebase is initialized lazily and only when every required env var is
// present. When configuration is missing (e.g. local development without a
// `.env`), the exported services are `null` and `firebaseConfigured` is
// `false`. Layers surface a clear error when invoked without configuration;
// they never silently fall back to invented data, which would conceal backend
// errors.
//
// Firebase Auth uses the SDK's default persistence (browser local storage),
// matching the legacy application's behavior. This module does not override
// persistence and does not create users.

import {
  type FirebaseApp,
  initializeApp,
  getApps,
} from 'firebase/app';
import { type Firestore, getFirestore } from 'firebase/firestore';
import type { Database } from 'firebase/database';
import { type Auth, getAuth } from 'firebase/auth';

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function isConfigured(): boolean {
  return REQUIRED_ENV_VARS.every(
    (key) => typeof import.meta.env[key] === 'string' && import.meta.env[key].length > 0,
  );
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let initError: Error | null = null;

// The Realtime Database SDK is loaded lazily: it is only consumed by the
// decorative Now Playing widget, which must not block initial render or the
// critical bundle. `getDatabase` is dynamically imported on first request.
let rtdbPromise: Promise<Database | null> | null = null;

/** Resolve the RTDB instance, dynamically importing the SDK on first use. */
export function getRtdb(): Promise<Database | null> {
  if (!isConfigured() || initError !== null || app === null) {
    return Promise.resolve(null);
  }
  if (rtdbPromise === null) {
    rtdbPromise = import('firebase/database')
      .then((module) => module.getDatabase(app!))
      .catch((error) => {
        initError = error instanceof Error ? error : new Error(String(error));
        return null;
      });
  }
  return rtdbPromise;
}

if (isConfigured()) {
  try {
    // Guard against duplicate initialization (e.g. hot module reload).
    if (getApps().length === 0) {
      app = initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY!,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL!,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
        appId: import.meta.env.VITE_FIREBASE_APP_ID!,
      });
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    // Record the failure so layers can surface a clear message instead of
    // crashing at module load time.
    initError =
      error instanceof Error ? error : new Error(String(error));
  }
}

/** True when Firebase was successfully initialized from env config. */
export const firebaseConfigured = isConfigured() && initError === null && db !== null && auth !== null;

/** The Firebase app instance, or null when not configured. */
export { app };

/** Firestore instance (read-only usage in this checkpoint). */
export { db };

/** Firebase Auth instance. */
export { auth };

/** Reason Firebase initialization failed, if any. */
export { initError };

/** Thrown when Firebase is not configured. */
export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      'Firebase is not configured. Set the VITE_FIREBASE_* environment variables (see .env.example).',
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}
