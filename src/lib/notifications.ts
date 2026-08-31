import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { AppNotification } from "@/types/firestore";

function mapNotification(
  id: string,
  data: Record<string, unknown>,
): AppNotification {
  return {
    id,
    userId: String(data.userId ?? ""),
    title: String(data.title ?? ""),
    body: String(data.body ?? ""),
    type: String(data.type ?? "general"),
    bookingId: data.bookingId ? String(data.bookingId) : undefined,
    read: data.read === true,
    createdAt: String(data.createdAt ?? ""),
  };
}

export function subscribeToUserNotifications(
  userId: string,
  onData: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const q = query(
    collection(getFirebaseDb(), COLLECTIONS.notifications),
    where("userId", "==", userId),
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => mapNotification(d.id, d.data())));
    },
    (error) => onError?.(error),
  );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  initFirebase();
  await updateDoc(doc(getFirebaseDb(), COLLECTIONS.notifications, notificationId), {
    read: true,
  });
}

/** Client-side inbox entry when push is received in foreground. */
export async function createLocalNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
}): Promise<void> {
  initFirebase();
  const ref = doc(collection(getFirebaseDb(), COLLECTIONS.notifications));
  await setDoc(ref, {
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    bookingId: input.bookingId ?? "",
    read: false,
    createdAt: new Date().toISOString(),
  });
}
