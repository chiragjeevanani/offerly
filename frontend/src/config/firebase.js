import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase web config is public by design — it identifies the project, it does
// not authorise anything. Env vars are here so a staging build can point at a
// different project; the fallbacks keep a fresh clone working without setup.
//
// Keep these in sync with frontend/public/firebase-messaging-sw.js, which
// can't read import.meta.env and therefore hardcodes the same values.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC-s8HtcGjJcJhnwaSxlNNAKZy3VIVieCI',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'offerly-b2e1a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'offerly-b2e1a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'offerly-b2e1a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '246962620294',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:246962620294:web:88de04f286f515a56c0e07',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-YD65E82PVD',
};

// The public VAPID key the browser uses as its applicationServerKey. Also
// public — it's the counterpart of a private key that never leaves Google.
export const vapidKey =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BLJY-BULubJXm7OtsW4wKrTWqv4Z_ocOMh7hf7TXEFdXCY5DJZaehHpNOsWyelZnlMVVW4rPmBudL5e1Kmx2dvo';

export const getFirebaseApp = () =>
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

/**
 * Messaging instance, or null where the browser can't do web push at all —
 * notably iOS Safari before 16.4, and any non-installed iOS home-screen page.
 * Callers must handle null rather than assume push exists.
 */
export const getMessagingIfSupported = async () => {
  try {
    if (!(await isSupported())) {
      return null;
    }
    return getMessaging(getFirebaseApp());
  } catch (error) {
    console.warn('[Push] Firebase messaging unavailable:', error?.message);
    return null;
  }
};
