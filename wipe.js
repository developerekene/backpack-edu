import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBiItj8LGRMwegbzpG1b2hcwZdAhC0uAKQ",
  authDomain: "backpack-9e1e0.firebaseapp.com",
  projectId: "backpack-9e1e0",
  storageBucket: "backpack-9e1e0.appspot.com",
  messagingSenderId: "722513442785",
  appId: "1:722513442785:web:1f1ee7645ad5d7ff3104a0",
  measurementId: "G-DP4GDBREJG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function wipe() {
  await signInWithEmailAndPassword(auth, "immacool8@gmail.com", "password"); // Try with a password, wait, I don't know the password...
}

wipe().catch(console.error);
