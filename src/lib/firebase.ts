import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

/** Production defaults for salon-i-squad (client-side keys are public by design). */
const productionDefaults = {
  apiKey: "AIzaSyAk3oT98CuYeoead2gm4RdDTAcsfMglCeQ",
  authDomain: "salon-i-squad.firebaseapp.com",
  projectId: "salon-i-squad",
  storageBucket: "salon-i-squad.firebasestorage.app",
  messagingSenderId: "411462006326",
  appId: "1:411462006326:web:0e94dee47c445232eb8a97",
} as const;

function readEnv(name: string, fallback: string): string {
  const value = (process.env[name] ?? "").trim();
  return value || fallback;
}

export const firebaseConfig = {
  apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY", productionDefaults.apiKey),
  authDomain: readEnv(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    productionDefaults.authDomain,
  ),
  projectId: readEnv(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    productionDefaults.projectId,
  ),
  storageBucket: readEnv(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    productionDefaults.storageBucket,
  ),
  messagingSenderId: readEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    productionDefaults.messagingSenderId,
  ),
  appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID", productionDefaults.appId),
};

const useEmulators =
  readEnv("NEXT_PUBLIC_USE_FIREBASE_EMULATORS", "false") === "true";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let emulatorsConnected = false;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

function connectEmulatorsIfNeeded() {
  if (
    emulatorsConnected ||
    !useEmulators ||
    typeof window === "undefined"
  ) {
    return;
  }

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  emulatorsConnected = true;
}

export function initFirebase() {
  auth = getAuth(getFirebaseApp());
  db = getFirestore(getFirebaseApp());
  connectEmulatorsIfNeeded();
  return { app: getFirebaseApp(), auth, db };
}

export function getFirebaseAuth(): Auth {
  if (!auth) initFirebase();
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) initFirebase();
  return db;
}

/** Convenience aliases matching Firebase SDK naming */
export { getFirebaseAuth as auth, getFirebaseDb as db };

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => value.length > 0);
}
