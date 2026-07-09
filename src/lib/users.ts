import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb } from "@/lib/firebase";
import type { UserProfile } from "@/types/firestore";

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "Guest", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

export function isValidMobile(mobile: string): boolean {
  const cleaned = mobile.replace(/[\s-]/g, "");

  return (
    /^(\+94|0)?7[0-9]{8}$/.test(cleaned) ||
    /^0[0-9]{9}$/.test(cleaned) ||
    /^\+[1-9][0-9]{7,14}$/.test(cleaned)
  );
}

export function normalizeMobile(mobile: string): string {
  const cleaned = mobile.replace(/[\s-]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `+94${cleaned.slice(1)}`;
  }

  return cleaned;
}

export async function upsertGoogleUserProfile(user: User) {
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const { firstName, lastName } = parseName(user.displayName ?? "");

  const profile: UserProfile = {
    uid: user.uid,
    firstName: firstName || "User",
    lastName,
    email: user.email ?? undefined,
    mobile: existing.data()?.mobile ?? "",
    role: "customer",
    isGuest: false,
    createdAt: existing.exists()
      ? (existing.data() as UserProfile).createdAt
      : now,
    updatedAt: now,
  };

  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function createGuestUserProfile(
  uid: string,
  name: string,
  mobile: string,
) {
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const { firstName, lastName } = parseName(name);

  const profile: UserProfile = {
    uid,
    firstName,
    lastName,
    mobile: normalizeMobile(mobile),
    role: "customer",
    isGuest: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, COLLECTIONS.users, uid), profile);
  return profile;
}
