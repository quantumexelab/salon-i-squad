import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { ClosedDay, TimeBuffer } from "@/types/calendar";

export function subscribeToClosedDays(
  onData: (days: ClosedDay[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.closedDays),
    orderBy("dateKey", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(data.dateKey ?? ""),
            note: data.note ? String(data.note) : undefined,
            createdAt: String(data.createdAt ?? ""),
            createdBy: data.createdBy ? String(data.createdBy) : undefined,
          } satisfies ClosedDay;
        }),
      );
    },
    (error) => onError?.(error),
  );
}

export async function createClosedDay(input: {
  dateKey: string;
  note?: string;
  createdBy?: string;
}): Promise<ClosedDay> {
  initFirebase();
  const payload = {
    dateKey: input.dateKey,
    note: input.note?.trim() || "",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? "",
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dateKey)) {
    throw new Error("Pick a valid date.");
  }

  const ref = await addDoc(
    collection(getFirebaseDb(), COLLECTIONS.closedDays),
    payload,
  );

  return {
    id: ref.id,
    dateKey: payload.dateKey,
    note: payload.note || undefined,
    createdAt: payload.createdAt,
    createdBy: payload.createdBy || undefined,
  };
}

export async function deleteClosedDay(id: string): Promise<void> {
  initFirebase();
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.closedDays, id));
}

export function subscribeToBuffers(
  onData: (buffers: TimeBuffer[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.buffers),
    orderBy("dateKey", "asc"),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            dateKey: String(data.dateKey ?? ""),
            startTime: String(data.startTime ?? ""),
            endTime: String(data.endTime ?? ""),
            label: data.label ? String(data.label) : undefined,
            createdAt: String(data.createdAt ?? ""),
            createdBy: data.createdBy ? String(data.createdBy) : undefined,
          } satisfies TimeBuffer;
        }),
      );
    },
    (error) => onError?.(error),
  );
}

export async function createBuffer(input: {
  dateKey: string;
  startTime: string;
  endTime: string;
  label?: string;
  createdBy?: string;
}): Promise<TimeBuffer> {
  initFirebase();
  const payload = {
    dateKey: input.dateKey,
    startTime: input.startTime,
    endTime: input.endTime,
    label: input.label?.trim() || "",
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy ?? "",
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.dateKey)) {
    throw new Error("Pick a valid date.");
  }
  if (!payload.startTime || !payload.endTime) {
    throw new Error("Start and end times are required.");
  }

  const ref = await addDoc(
    collection(getFirebaseDb(), COLLECTIONS.buffers),
    payload,
  );

  return {
    id: ref.id,
    dateKey: payload.dateKey,
    startTime: payload.startTime,
    endTime: payload.endTime,
    label: payload.label || undefined,
    createdAt: payload.createdAt,
    createdBy: payload.createdBy || undefined,
  };
}

export async function deleteBuffer(id: string): Promise<void> {
  initFirebase();
  await deleteDoc(doc(getFirebaseDb(), COLLECTIONS.buffers, id));
}
