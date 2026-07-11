import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { parseSlotMinutes } from "@/lib/calendar-utils";

export const BUSINESS_SETTINGS_DOC_ID = "business";

export const DEFAULT_BUSINESS_HOURS = {
  openTime: "09:00 AM",
  closeTime: "07:00 PM",
  cleanupPadding: 0,
} as const;

export type BusinessHours = {
  openTime: string;
  closeTime: string;
  /** Minutes of cleanup between appointments; applied from tomorrow onward. */
  cleanupPadding: number;
  updatedAt?: string;
};

function normalizeCleanupPadding(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), 180);
}

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
        cleanupPadding: normalizeCleanupPadding(
          data.cleanupPadding ?? DEFAULT_BUSINESS_HOURS.cleanupPadding,
        ),
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      });
    },
    (error) => onError?.(error),
  );
}

export async function saveBusinessHours(input: {
  openTime: string;
  closeTime: string;
  cleanupPadding?: number;
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

  const cleanupPadding = normalizeCleanupPadding(input.cleanupPadding ?? 0);

  const payload: BusinessHours = {
    openTime: input.openTime,
    closeTime: input.closeTime,
    cleanupPadding,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.settings, BUSINESS_SETTINGS_DOC_ID),
    payload,
    { merge: true },
  );

  return payload;
}

/**
 * Cleanup padding applies only from the next calendar day forward.
 * Today's bookings ignore padding so the live schedule is not disrupted.
 */
export function effectiveCleanupPaddingMinutes(
  selectedDate: Date,
  cleanupPadding: number,
  now = new Date(),
): number {
  const padding = normalizeCleanupPadding(cleanupPadding);
  if (padding === 0) return 0;

  const selectedDay = new Date(
    selectedDate.getFullYear(),
    selectedDate.getMonth(),
    selectedDate.getDate(),
  );
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (selectedDay.getTime() <= today.getTime()) {
    return 0;
  }
  return padding;
}
