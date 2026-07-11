import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
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

/** Prefer phoneNumber; fall back to legacy mobile. */
export function getProfilePhone(profile: {
  phoneNumber?: string;
  mobile?: string;
} | null | undefined): string {
  const value = (profile?.phoneNumber || profile?.mobile || "").trim();
  return value;
}

function mapUserDoc(uid: string, data: Record<string, unknown>): UserProfile {
  const mobile = String(data.mobile ?? "");
  const phoneNumber = String(data.phoneNumber ?? mobile);
  return {
    uid,
    firstName: String(data.firstName ?? "User"),
    lastName: String(data.lastName ?? ""),
    email: data.email ? String(data.email) : undefined,
    phoneNumber: phoneNumber || undefined,
    mobile: mobile || phoneNumber,
    gender: data.gender as UserProfile["gender"],
    role: normalizeRole(data.role),
    isGuest: Boolean(data.isGuest),
    fcmToken: data.fcmToken ? String(data.fcmToken) : undefined,
    createdAt: String(data.createdAt ?? new Date().toISOString()),
    updatedAt: String(data.updatedAt ?? new Date().toISOString()),
  };
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  initFirebase();
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  return mapUserDoc(uid, snap.data());
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

  const existingPhone = existing.exists()
    ? getProfilePhone({
        phoneNumber: existing.data()?.phoneNumber
          ? String(existing.data()?.phoneNumber)
          : undefined,
        mobile: String(existing.data()?.mobile ?? ""),
      })
    : "";

  const profile: UserProfile = {
    uid: user.uid,
    firstName: firstName || "User",
    lastName,
    email: user.email ?? undefined,
    phoneNumber: existingPhone || undefined,
    mobile: existingPhone,
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
  const { firstName, lastName } = parseName(
    user.displayName ?? user.email ?? "Staff",
  );

  const existingRole = existing.exists()
    ? normalizeRole(existing.data()?.role)
    : ("client" as UserRole);

  const existingPhone = existing.exists()
    ? getProfilePhone({
        phoneNumber: existing.data()?.phoneNumber
          ? String(existing.data()?.phoneNumber)
          : undefined,
        mobile: String(existing.data()?.mobile ?? ""),
      })
    : "";

  const profile: UserProfile = {
    uid: user.uid,
    firstName: firstName || "Staff",
    lastName,
    email: user.email ?? undefined,
    phoneNumber: existingPhone || undefined,
    mobile: existingPhone,
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
  const phone = normalizeMobile(mobile);

  const profile: UserProfile = {
    uid,
    firstName,
    lastName,
    phoneNumber: phone,
    mobile: phone,
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
    phoneNumber: "",
    mobile: "",
    role: "admin",
    isGuest: false,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(getFirebaseDb(), COLLECTIONS.users, input.uid), profile);
  return profile;
}

/** Save / update a client's phone on their user profile. */
export async function updateUserPhoneNumber(
  uid: string,
  phoneInput: string,
): Promise<string> {
  if (!isValidMobile(phoneInput)) {
    throw new Error("Please enter a valid phone number.");
  }

  initFirebase();
  const phone = normalizeMobile(phoneInput);
  const now = new Date().toISOString();

  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.users, uid),
    {
      phoneNumber: phone,
      mobile: phone,
      updatedAt: now,
    },
    { merge: true },
  );

  return phone;
}

/** Persist the device FCM token on the signed-in user's profile. */
export async function updateUserFcmToken(
  uid: string,
  fcmToken: string,
): Promise<void> {
  const token = fcmToken.trim();
  if (!uid || !token) return;

  initFirebase();
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.users, uid),
    {
      fcmToken: token,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export function subscribeToClientUsers(
  onData: (clients: UserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.users),
    where("role", "==", "client"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const clients = snapshot.docs
        .map((docSnap) => mapUserDoc(docSnap.id, docSnap.data()))
        .sort((a, b) => {
          const nameA = `${a.firstName} ${a.lastName}`.trim().toLowerCase();
          const nameB = `${b.firstName} ${b.lastName}`.trim().toLowerCase();
          return nameA.localeCompare(nameB);
        });
      onData(clients);
    },
    (error) => onError?.(error),
  );
}
