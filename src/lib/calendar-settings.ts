import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";

export const CALENDAR_SETTINGS_DOC_ID = "calendar";

export type CalendarSyncAction = "create" | "update" | "delete";

export type CalendarSettings = {
  calendarId: string;
  /** Raw service account JSON string (master-only; never expose to clients). */
  serviceAccountJson: string;
  enabled: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export function subscribeToCalendarSettings(
  onData: (settings: CalendarSettings) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const ref = doc(
    getFirebaseDb(),
    COLLECTIONS.settings,
    CALENDAR_SETTINGS_DOC_ID,
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({
          calendarId: "",
          serviceAccountJson: "",
          enabled: false,
        });
        return;
      }
      const data = snapshot.data();
      onData({
        calendarId: String(data.calendarId ?? ""),
        serviceAccountJson: String(data.serviceAccountJson ?? ""),
        enabled: data.enabled !== false,
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
        updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
      });
    },
    (error) => onError?.(error),
  );
}

export async function saveCalendarSettings(input: {
  calendarId: string;
  serviceAccountJson: string;
  enabled: boolean;
  updatedBy?: string;
}): Promise<CalendarSettings> {
  initFirebase();

  const calendarId = input.calendarId.trim();
  const serviceAccountJson = input.serviceAccountJson.trim();

  if (input.enabled && !calendarId) {
    throw new Error("Google Calendar ID is required when sync is enabled.");
  }

  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as {
        client_email?: string;
        private_key?: string;
      };
      if (!parsed.client_email || !parsed.private_key) {
        throw new Error("Invalid service account JSON.");
      }
    } catch {
      throw new Error("Service Account JSON must be valid JSON.");
    }
  }

  const payload: CalendarSettings = {
    calendarId,
    serviceAccountJson,
    enabled: Boolean(input.enabled),
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy ?? "",
  };

  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.settings, CALENDAR_SETTINGS_DOC_ID),
    payload,
    { merge: true },
  );

  return payload;
}
