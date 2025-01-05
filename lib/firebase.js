import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD4M5ae16Vbpv7qJS47lpYg-V665XaoXj8",
  authDomain: "capstone-a51ca.firebaseapp.com",
  projectId: "capstone-a51ca",
  storageBucket: "capstone-a51ca.firebasestorage.app",
  messagingSenderId: "979204184936",
  appId: "1:979204184936:web:d288653a53ed939e1114dd",
  measurementId: "G-6HYSE0BQ6X"
};

// Initialize Firebase only if it hasn't been initialized already
let app;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

export { app, auth }; 