import { doc, getDoc, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { normalizeRole } from "@/lib/roles";
import type { UserProfile, UserRole } from "@/types/firestore";

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

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  initFirebase();
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid,
    firstName: String(data.firstName ?? "User"),
    lastName: String(data.lastName ?? ""),
    email: data.email ? String(data.email) : undefined,
    mobile: String(data.mobile ?? ""),
    gender: data.gender,
    role: normalizeRole(data.role),
    isGuest: Boolean(data.isGuest),
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

/**
 * First login creates a `users/{uid}` doc with role `client`.
 * Existing roles (admin/master) are never overwritten.
 */
export async function upsertGoogleUserProfile(user: User) {
  initFirebase();
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const { firstName, lastName } = parseName(user.displayName ?? "");

  const existingRole = existing.exists()
    ? normalizeRole(existing.data()?.role)
    : ("client" as UserRole);

  const profile: UserProfile = {
    uid: user.uid,
    firstName: firstName || "User",
    lastName,
    email: user.email ?? undefined,
    mobile: existing.exists() ? String(existing.data()?.mobile ?? "") : "",
    role: existingRole,
    isGuest: false,
    createdAt: existing.exists()
      ? String(existing.data()?.createdAt ?? now)
      : now,
    updatedAt: now,
  };

  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function upsertEmailUserProfile(user: User) {
  initFirebase();
  const db = getFirebaseDb();
  const ref = doc(db, COLLECTIONS.users, user.uid);
  const existing = await getDoc(ref);
  const now = new Date().toISOString();
  const { firstName, lastName } = parseName(user.displayName ?? user.email ?? "Staff");

  const existingRole = existing.exists()
    ? normalizeRole(existing.data()?.role)
    : ("client" as UserRole);

  const profile: UserProfile = {
    uid: user.uid,
    firstName: firstName || "Staff",
    lastName,
    email: user.email ?? undefined,
    mobile: existing.exists() ? String(existing.data()?.mobile ?? "") : "",
    role: existingRole,
    isGuest: false,
    createdAt: existing.exists()
      ? String(existing.data()?.createdAt ?? now)
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
  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const { firstName, lastName } = parseName(name);

  const profile: UserProfile = {
    uid,
    firstName,
    lastName,
    mobile: normalizeMobile(mobile),
    role: "client",
    isGuest: true,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, COLLECTIONS.users, uid), profile);
  return profile;
}

export async function createStaffUserProfile(input: {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  initFirebase();
  const now = new Date().toISOString();

  const profile: UserProfile = {
    uid: input.uid,
    firstName: input.firstName.trim() || "Staff",
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    mobile: "",
    role: "admin",
    isGuest: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getFirebaseDb(), COLLECTIONS.users, input.uid), profile);
  return profile;
}
