import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
import {
  firebaseConfig,
  isFirebaseConfigured,
  useFirebaseEmulators,
} from "./config";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let emulatorsConnected = false;

function connectEmulators() {
  if (emulatorsConnected || !useFirebaseEmulators()) {
    return;
  }

  connectAuthEmulator(getClientAuth(), "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(getClientDb(), "127.0.0.1", 8080);
  connectStorageEmulator(getClientStorage(), "127.0.0.1", 9199);

  emulatorsConnected = true;
}

function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Copy .env.local.example to .env.local and add your project keys.",
    );
  }

  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return app;
}

export function getClientAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }

  return auth;
}

export function getClientDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }

  return db;
}

export function getClientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
  }

  return storage;
}

export function initFirebaseClient() {
  getFirebaseApp();

  if (typeof window !== "undefined") {
    connectEmulators();
  }

  return {
    auth: getClientAuth(),
    db: getClientDb(),
    storage: getClientStorage(),
  };
}
