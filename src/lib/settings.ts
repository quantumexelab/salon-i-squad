import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { parseSlotMinutes } from "@/lib/calendar-utils";

export const BUSINESS_SETTINGS_DOC_ID = "business";

export const DEFAULT_BUSINESS_HOURS = {
  openTime: "09:00 AM",
  closeTime: "07:00 PM",
} as const;

export type BusinessHours = {
  openTime: string;
  closeTime: string;
  updatedAt?: string;
};

export function subscribeToBusinessHours(
  onData: (hours: BusinessHours) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const ref = doc(
    getFirebaseDb(),
    COLLECTIONS.settings,
    BUSINESS_SETTINGS_DOC_ID,
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ ...DEFAULT_BUSINESS_HOURS });
        return;
      }
      const data = snapshot.data();
      onData({
        openTime: String(data.openTime ?? DEFAULT_BUSINESS_HOURS.openTime),
        closeTime: String(data.closeTime ?? DEFAULT_BUSINESS_HOURS.closeTime),
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      });
    },
    (error) => onError?.(error),
  );
}

export async function saveBusinessHours(input: {
  openTime: string;
  closeTime: string;
}): Promise<BusinessHours> {
  initFirebase();

  const open = parseSlotMinutes(input.openTime);
  const close = parseSlotMinutes(input.closeTime);
  if (Number.isNaN(open) || Number.isNaN(close)) {
    throw new Error("Pick valid open and close times.");
  }
  if (!(open < close)) {
    throw new Error("Close time must be after open time.");
  }

  const payload: BusinessHours = {
    openTime: input.openTime,
    closeTime: input.closeTime,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.settings, BUSINESS_SETTINGS_DOC_ID),
    payload,
    { merge: true },
  );

  return payload;
}
