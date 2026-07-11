import { doc, updateDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";

/** Only this account may self-promote via the one-time bootstrap UI. */
export const MASTER_BOOTSTRAP_EMAIL = "info@quantumexe.com";

export function canBootstrapMaster(user: User | null): boolean {
  const email = user?.email?.trim().toLowerCase();
  return email === MASTER_BOOTSTRAP_EMAIL;
}

/**
 * Updates `users/{auth.uid}` to role `master`.
 * Requires the temporary Firestore bootstrap rule + signed-in as that email.
 * (Doc id matches Auth UID from Google/email signup.)
 */
export async function promoteMasterByEmail(user: User): Promise<void> {
  const email = user.email?.trim().toLowerCase();
  if (email !== MASTER_BOOTSTRAP_EMAIL) {
    throw new Error(
      `Only ${MASTER_BOOTSTRAP_EMAIL} can use master bootstrap.`,
    );
  }

  initFirebase();
  const db = getFirebaseDb();

  await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
    role: "master",
    email,
    updatedAt: new Date().toISOString(),
  });
}
