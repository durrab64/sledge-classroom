// Firebase service/repository layer placeholder.
//
// Firebase is intentionally NOT initialized in CP3. This file documents the
// clean seam where the Firebase service/repository layer (CP2 §5.2) will be
// added in a later checkpoint, without importing or initializing the SDK.
//
// Do not import firebase/app, firebase/auth, firebase/firestore, or
// firebase/database here.

export const FIREBASE_READY = false;

export interface FirebaseServices {
  auth: unknown;
  firestore: unknown;
  database: unknown;
}

export function getFirebaseServices(): FirebaseServices | null {
  return null;
}
