import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { COLLECTIONS, SETTINGS_DOCS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import type { SalonPolicySettings } from "@/types/firestore";

export const DEFAULT_RESCHEDULE_CUTOFF_HOURS = 2;

export function subscribeToSalonPolicy(
  onData: (policy: SalonPolicySettings) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  initFirebase();
  const ref = doc(
    getFirebaseDb(),
    COLLECTIONS.settings,
    SETTINGS_DOCS.policy,
  );

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ rescheduleCutoffHours: DEFAULT_RESCHEDULE_CUTOFF_HOURS });
        return;
      }
      const data = snapshot.data();
      const hours = Number(data.rescheduleCutoffHours);
      onData({
        rescheduleCutoffHours:
          Number.isFinite(hours) && hours >= 0
            ? hours
            : DEFAULT_RESCHEDULE_CUTOFF_HOURS,
        updatedAt: data.updatedAt ? String(data.updatedAt) : undefined,
      });
    },
    (error) => onError?.(error),
  );
}

export async function saveSalonPolicy(input: {
  rescheduleCutoffHours: number;
}): Promise<SalonPolicySettings> {
  initFirebase();
  const hours = Math.max(0, Math.floor(input.rescheduleCutoffHours));
  const payload: SalonPolicySettings = {
    rescheduleCutoffHours: hours,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.settings, SETTINGS_DOCS.policy),
    payload,
    { merge: true },
  );
  return payload;
}
