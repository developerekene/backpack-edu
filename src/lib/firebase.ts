import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiItj8LGRMwegbzpG1b2hcwZdAhC0uAKQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "backpack-9e1e0.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "backpack-9e1e0",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "backpack-9e1e0.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "722513442785",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:722513442785:web:1f1ee7645ad5d7ff3104a0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-DP4GDBREJG"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Use auto-detect long polling (allows fast fetch streams when available and falls back smoothly)
// instead of forcing legacy XHR long-polling on every initial WebChannel handshake.
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  });
} catch {
  dbInstance = getFirestore(app);
}
export const db = dbInstance;

export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
