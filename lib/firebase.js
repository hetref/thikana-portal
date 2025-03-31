// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDODfFd9_s_dGpAnzGP-76E5QPU8kXIaDI",
  authDomain: "thikana-b656b.firebaseapp.com",
  databaseURL:
    "https://thikana-b656b-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "thikana-b656b",
  storageBucket: "thikana-b656b.firebasestorage.app",
  messagingSenderId: "787892140835",
  appId: "1:787892140835:web:ff41bb9b9ccd7b1ae2aa96",
  measurementId: "G-1LHX212597",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const db = getFirestore(app);