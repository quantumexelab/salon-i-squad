import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { MASTER_BOOTSTRAP_EMAIL } from "@/lib/bootstrap-master";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getClientStorage, initFirebaseClient } from "@/lib/firebase/client";
import { getFirebaseAuth, getFirebaseDb, initFirebase } from "@/lib/firebase";
import { normalizeRole } from "@/lib/roles";
import type { UserProfile, UserRole } from "@/types/firestore";

function resolveLoginRole(
  user: User,
  existingRole: UserRole,
  docExists: boolean,
): UserRole {
  const email = user.email?.trim().toLowerCase();
  // Platform owner account always lands as master (one-time bootstrap email).
  if (email === MASTER_BOOTSTRAP_EMAIL) {
    return "master";
  }
  return docExists ? existingRole : "client";
}

/** Firestore rejects documents that contain `undefined` field values. */
function toFirestoreData<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as T;
}

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
    whatsappNumber: data.whatsappNumber
      ? String(data.whatsappNumber)
      : undefined,
    gender: data.gender as UserProfile["gender"],
    role: normalizeRole(data.role),
    isGuest: Boolean(data.isGuest),
    isMember: data.isMember === true,
    memberSince: data.memberSince ? String(data.memberSince) : undefined,
    memberNotes: data.memberNotes ? String(data.memberNotes) : undefined,
    hairType: data.hairType ? String(data.hairType) : undefined,
    conditions: data.conditions ? String(data.conditions) : undefined,
    registrationComplete: data.registrationComplete === true,
    fcmToken: data.fcmToken ? String(data.fcmToken) : undefined,
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
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
  const role = resolveLoginRole(user, existingRole, existing.exists());

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
    role,
    isGuest: false,
    createdAt: existing.exists()
      ? String(existing.data()?.createdAt ?? now)
      : now,
    updatedAt: now,
  };

  await setDoc(ref, toFirestoreData(profile), { merge: true });
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
  const role = resolveLoginRole(user, existingRole, existing.exists());

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
    role,
    isGuest: false,
    createdAt: existing.exists()
      ? String(existing.data()?.createdAt ?? now)
      : now,
    updatedAt: now,
  };

  await setDoc(ref, toFirestoreData(profile), { merge: true });
  return profile;
}

/** Digits-only key for one customer per phone (guest dedupe). */
export function phoneDocId(mobile: string): string {
  const normalized = normalizeMobile(mobile);
  const digits = normalized.replace(/\D/g, "");
  return digits || normalized;
}

export async function findClientProfileByPhone(
  mobile: string,
): Promise<UserProfile | null> {
  initFirebase();
  const phone = normalizeMobile(mobile);
  const db = getFirebaseDb();

  const byPhoneNumber = query(
    collection(db, COLLECTIONS.users),
    where("role", "==", "client"),
    where("phoneNumber", "==", phone),
  );
  const snap = await getDocs(byPhoneNumber);
  if (!snap.empty) {
    const docSnap = snap.docs[0]!;
    return mapUserDoc(docSnap.id, docSnap.data());
  }

  const byMobile = query(
    collection(db, COLLECTIONS.users),
    where("role", "==", "client"),
    where("mobile", "==", phone),
  );
  const legacy = await getDocs(byMobile);
  if (!legacy.empty) {
    const docSnap = legacy.docs[0]!;
    return mapUserDoc(docSnap.id, docSnap.data());
  }

  return null;
}

/**
 * Guest login — one canonical customer per phone in `customerPhones`,
 * plus a session `users/{uid}` doc for the current anonymous auth uid.
 */
export async function createGuestUserProfile(
  uid: string,
  name: string,
  mobile: string,
) {
  initFirebase();
  const db = getFirebaseDb();
  const now = new Date().toISOString();
  const phone = normalizeMobile(mobile);
  const { firstName, lastName } = parseName(name.trim());
  const phoneKey = phoneDocId(phone);

  const customerPhoneRef = doc(db, COLLECTIONS.customerPhones, phoneKey);
  const existingCustomer = await getDoc(customerPhoneRef);
  const existingData = existingCustomer.exists()
    ? existingCustomer.data()
    : null;

  const canonicalFirst =
    firstName || String(existingData?.firstName ?? "") || "Guest";
  const canonicalLast =
    lastName || String(existingData?.lastName ?? "");

  await setDoc(
    customerPhoneRef,
    {
      phoneNumber: phone,
      firstName: canonicalFirst,
      lastName: canonicalLast,
      lastAuthUid: uid,
      updatedAt: now,
      createdAt: existingData?.createdAt
        ? String(existingData.createdAt)
        : now,
    },
    { merge: true },
  );

  const profile: UserProfile = {
    uid,
    firstName: canonicalFirst,
    lastName: canonicalLast,
    phoneNumber: phone,
    mobile: phone,
    role: "client",
    isGuest: true,
    createdAt: existingData?.createdAt
      ? String(existingData.createdAt)
      : now,
    updatedAt: now,
  };

  await setDoc(doc(db, COLLECTIONS.users, uid), profile, { merge: true });
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

export function subscribeToMemberUsers(
  onData: (members: UserProfile[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.users),
    where("role", "==", "client"),
    where("isMember", "==", true),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs
        .map((docSnap) => mapUserDoc(docSnap.id, docSnap.data()))
        .sort((a, b) =>
          (b.memberSince ?? b.createdAt).localeCompare(
            a.memberSince ?? a.createdAt,
          ),
        );
      onData(members);
    },
    (error) => onError?.(error),
  );
}

export async function setUserMemberStatus(
  uid: string,
  isMember: boolean,
  memberNotes?: string,
): Promise<void> {
  initFirebase();
  const now = new Date().toISOString();
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.users, uid),
    {
      isMember,
      memberSince: isMember ? now : "",
      memberNotes: memberNotes?.trim() || "",
      updatedAt: now,
    },
    { merge: true },
  );
}

export async function updateMemberProfileFields(
  uid: string,
  fields: {
    hairType?: string;
    conditions?: string;
    memberNotes?: string;
  },
): Promise<void> {
  initFirebase();
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.users, uid),
    {
      ...(fields.hairType !== undefined ? { hairType: fields.hairType } : {}),
      ...(fields.conditions !== undefined
        ? { conditions: fields.conditions }
        : {}),
      ...(fields.memberNotes !== undefined
        ? { memberNotes: fields.memberNotes }
        : {}),
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export type RegisterProfileInput = {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  gender?: UserProfile["gender"];
};

export function isProfileRegistrationComplete(
  profile: UserProfile | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.registrationComplete) return true;
  return Boolean(
    profile.firstName.trim() &&
      profile.email?.trim() &&
      getProfilePhone(profile) &&
      profile.whatsappNumber?.trim(),
  );
}

export async function completeClientRegistration(
  input: RegisterProfileInput,
): Promise<UserProfile> {
  if (!input.firstName.trim()) throw new Error("Name is required.");
  if (!input.email.trim()) throw new Error("Email is required.");
  if (!isValidMobile(input.phoneNumber)) {
    throw new Error("Please enter a valid phone number.");
  }
  if (!isValidMobile(input.whatsappNumber)) {
    throw new Error("Please enter a valid WhatsApp number.");
  }

  initFirebase();
  const now = new Date().toISOString();
  const phone = normalizeMobile(input.phoneNumber);
  const whatsapp = normalizeMobile(input.whatsappNumber);
  const ref = doc(getFirebaseDb(), COLLECTIONS.users, input.uid);
  const existing = await getDoc(ref);

  const profile: UserProfile = {
    uid: input.uid,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: phone,
    mobile: phone,
    whatsappNumber: whatsapp,
    gender: input.gender,
    role: "client",
    isGuest: existing.exists() ? Boolean(existing.data()?.isGuest) : false,
    isMember: existing.exists() ? existing.data()?.isMember === true : false,
    memberSince: existing.exists()
      ? existing.data()?.memberSince
        ? String(existing.data()?.memberSince)
        : undefined
      : undefined,
    registrationComplete: true,
    createdAt: existing.exists()
      ? String(existing.data()?.createdAt ?? now)
      : now,
    updatedAt: now,
  };

  await setDoc(ref, toFirestoreData(profile), { merge: true });

  const phoneKey = phoneDocId(phone);
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.customerPhones, phoneKey),
    {
      phoneNumber: phone,
      firstName: profile.firstName,
      lastName: profile.lastName,
      whatsappNumber: whatsapp,
      lastAuthUid: input.uid,
      updatedAt: now,
    },
    { merge: true },
  );

  return profile;
}

export type ClientProfileInput = RegisterProfileInput & {
  photoUrl?: string;
};

export async function updateClientProfile(
  input: ClientProfileInput,
): Promise<UserProfile> {
  if (!input.firstName.trim()) throw new Error("Name is required.");
  if (!input.email.trim()) throw new Error("Email is required.");
  if (!isValidMobile(input.phoneNumber)) {
    throw new Error("Please enter a valid phone number.");
  }
  if (!isValidMobile(input.whatsappNumber)) {
    throw new Error("Please enter a valid WhatsApp number.");
  }

  initFirebase();
  const now = new Date().toISOString();
  const phone = normalizeMobile(input.phoneNumber);
  const whatsapp = normalizeMobile(input.whatsappNumber);
  const ref = doc(getFirebaseDb(), COLLECTIONS.users, input.uid);
  const existing = await getDoc(ref);

  if (!existing.exists()) {
    throw new Error("Profile not found.");
  }

  const existingData = existing.data()!;
  const existingPhone = getProfilePhone({
    phoneNumber: existingData.phoneNumber
      ? String(existingData.phoneNumber)
      : undefined,
    mobile: String(existingData.mobile ?? ""),
  });

  if (phone !== existingPhone) {
    const conflict = await findClientProfileByPhone(phone);
    if (conflict && conflict.uid !== input.uid) {
      throw new Error("This phone number is already registered to another account.");
    }
  }

  const profile: UserProfile = {
    uid: input.uid,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: phone,
    mobile: phone,
    whatsappNumber: whatsapp,
    gender: input.gender,
    photoUrl:
      input.photoUrl !== undefined
        ? input.photoUrl || undefined
        : existingData.photoUrl
          ? String(existingData.photoUrl)
          : undefined,
    role: normalizeRole(existingData.role),
    isGuest: Boolean(existingData.isGuest),
    isMember: existingData.isMember === true,
    memberSince: existingData.memberSince
      ? String(existingData.memberSince)
      : undefined,
    memberNotes: existingData.memberNotes
      ? String(existingData.memberNotes)
      : undefined,
    hairType: existingData.hairType ? String(existingData.hairType) : undefined,
    conditions: existingData.conditions
      ? String(existingData.conditions)
      : undefined,
    registrationComplete: true,
    fcmToken: existingData.fcmToken ? String(existingData.fcmToken) : undefined,
    createdAt: String(existingData.createdAt ?? now),
    updatedAt: now,
  };

  await setDoc(ref, toFirestoreData(profile), { merge: true });

  const phoneKey = phoneDocId(phone);
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.customerPhones, phoneKey),
    {
      phoneNumber: phone,
      firstName: profile.firstName,
      lastName: profile.lastName,
      whatsappNumber: whatsapp,
      lastAuthUid: input.uid,
      updatedAt: now,
    },
    { merge: true },
  );

  return profile;
}

export async function uploadProfilePhoto(
  uid: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be 2MB or smaller.");
  }

  initFirebase();
  initFirebaseClient();

  const user = getFirebaseAuth().currentUser;
  if (!user || user.uid !== uid) {
    throw new Error("Sign in again to upload your profile photo.");
  }

  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg";
  const path = `profiles/${uid}/avatar.${ext}`;
  const storageRef = ref(getClientStorage(), path);

  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    const photoUrl = await getDownloadURL(storageRef);
    await setDoc(
      doc(getFirebaseDb(), COLLECTIONS.users, uid),
      {
        photoUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
    return photoUrl;
  } catch (err) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : "";
    if (code === "storage/unauthorized") {
      throw new Error(
        "Upload blocked by storage rules. Please try again later.",
      );
    }
    if (
      code === "storage/unknown" ||
      code === "storage/bucket-not-found" ||
      code === "storage/object-not-found"
    ) {
      throw new Error(
        "Firebase Storage is not set up yet. Please try again later.",
      );
    }
    throw err instanceof Error ? err : new Error("Image upload failed.");
  }
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
