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
} as const;

export function isFirebaseConfigured(): boolean {
  return Object.values(firebaseConfig).every((value) => value.length > 0);
}

export function useFirebaseEmulators(): boolean {
  return process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
}
