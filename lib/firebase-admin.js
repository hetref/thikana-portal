import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import admin from "firebase-admin";

// Get Firebase Admin credentials from environment variables
const serviceAccountConfig = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

// Verify required fields exist
if (!serviceAccountConfig.project_id) {
  throw new Error(
    "Service account object must contain a string 'project_id' property."
  );
}

if (!serviceAccountConfig.private_key) {
  throw new Error(
    "Service account object must contain a string 'private_key' property."
  );
}

// Initialize Firebase Admin SDK if not already initialized
const apps = getApps();
let app;

if (apps.length > 0) {
  app = apps[0];
} else {
  try {
    app = initializeApp({
      credential: admin.credential.cert(serviceAccountConfig),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    throw error;
  }
}

// Get Firestore instance
const adminDb = getFirestore(app);
const adminAuth = getAuth(app);

export { adminDb, adminAuth };
export default admin;
