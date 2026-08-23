import { doc, setDoc } from "firebase/firestore";
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
 * Tries client Firestore write first, then trusted API (Admin SDK) fallback.
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
  const now = new Date().toISOString();

  try {
    await setDoc(
      doc(db, COLLECTIONS.users, user.uid),
      {
        uid: user.uid,
        email,
        firstName: user.displayName?.split(/\s+/)[0] || "Master",
        lastName: "",
        mobile: "",
        role: "master",
        isGuest: false,
        updatedAt: now,
        createdAt: now,
      },
      { merge: true },
    );
    return;
  } catch {
    // Client rules may block role changes — fall back to server claim.
  }

  const idToken = await user.getIdToken();
  const response = await fetch("/api/claim-master", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    reason?: string;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(
      payload.reason ||
        "Could not set master role. Check Firestore rules or service account.",
    );
  }
}

/** Ensure bootstrap owner is master; returns true when role is master. */
export async function ensureMasterRole(user: User): Promise<boolean> {
  if (!canBootstrapMaster(user)) return false;
  await promoteMasterByEmail(user);
  return true;
}
