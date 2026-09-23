import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBiItj8LGRMwegbzpG1b2hcwZdAhC0uAKQ",
  authDomain: "backpack-9e1e0.firebaseapp.com",
  projectId: "backpack-9e1e0",
  storageBucket: "backpack-9e1e0.firebasestorage.app",
  messagingSenderId: "722513442785",
  appId: "1:722513442785:web:1f1ee7645ad5d7ff3104a0",
  measurementId: "G-DP4GDBREJG"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
