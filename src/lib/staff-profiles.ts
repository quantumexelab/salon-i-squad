import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { StaffProfile } from "@/types/firestore";

export type StaffProfileInput = {
  name: string;
  role: string;
  photoUrl?: string;
  qualifications: string[];
  specialties: string[];
  yearsExperience?: number;
  bio?: string;
  sortOrder: number;
  isActive: boolean;
};

function mapStaff(id: string, data: Record<string, unknown>): StaffProfile {
  return {
    id,
    name: String(data.name ?? ""),
    role: String(data.role ?? ""),
    photoUrl: data.photoUrl ? String(data.photoUrl) : undefined,
    qualifications: Array.isArray(data.qualifications)
      ? data.qualifications.map(String)
      : [],
    specialties: Array.isArray(data.specialties)
      ? data.specialties.map(String)
      : [],
    yearsExperience:
      data.yearsExperience != null
        ? Number(data.yearsExperience)
        : undefined,
    bio: data.bio ? String(data.bio) : undefined,
    sortOrder: Number(data.sortOrder ?? 0),
    isActive: data.isActive !== false,
    createdAt: String(data.createdAt ?? ""),
    updatedAt: String(data.updatedAt ?? ""),
  };
}

export function subscribeToStaffProfiles(
  onData: (staff: StaffProfile[]) => void,
  onError?: (error: Error) => void,
  options?: { activeOnly?: boolean },
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.staffProfiles),
    orderBy("sortOrder", "asc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      let list = snap.docs.map((d) => mapStaff(d.id, d.data()));
      if (options?.activeOnly) {
        list = list.filter((s) => s.isActive);
      }
      onData(list);
    },
    (error) => onError?.(error),
  );
}

export async function getStaffProfile(
  id: string,
): Promise<StaffProfile | null> {
  initFirebase();
  const snap = await getDoc(doc(getFirebaseDb(), COLLECTIONS.staffProfiles, id));
  if (!snap.exists()) return null;
  return mapStaff(snap.id, snap.data());
}

export async function createStaffProfile(
  input: StaffProfileInput,
): Promise<StaffProfile> {
  initFirebase();
  const now = new Date().toISOString();
  const payload = { ...input, createdAt: now, updatedAt: now };
  const ref = await addDoc(
    collection(getFirebaseDb(), COLLECTIONS.staffProfiles),
    payload,
  );
  return mapStaff(ref.id, payload);
}

export async function updateStaffProfile(
  id: string,
  input: StaffProfileInput,
): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.staffProfiles, id), {
    ...input,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteStaffProfile(id: string): Promise<void> {
  initFirebase();
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.staffProfiles, id));
}
