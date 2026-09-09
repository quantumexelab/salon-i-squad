import { getApps, getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from "firebase/messaging";
import { initFirebase } from "@/lib/firebase";
import { updateUserFcmToken } from "@/lib/users";

/** Dedicated scope so next-pwa's root SW does not steal FCM. */
const FCM_SW_PATH = "/firebase-messaging-sw.js";
const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

function readVapidKey(): string {
  return (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "").trim();
}

export function isFcmVapidConfigured(): boolean {
  return Boolean(readVapidKey());
}

let messagingInstance: Messaging | null = null;

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (!(await isSupported())) return null;

  initFirebase();
  if (!messagingInstance) {
    if (getApps().length === 0) return null;
    messagingInstance = getMessaging(getApp());
  }
  return messagingInstance;
}

async function ensureMessagingServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find(
    (reg) =>
      reg.active?.scriptURL?.includes("firebase-messaging-sw.js") ||
      reg.installing?.scriptURL?.includes("firebase-messaging-sw.js") ||
      reg.waiting?.scriptURL?.includes("firebase-messaging-sw.js") ||
      reg.scope.includes("firebase-cloud-messaging-push-scope"),
  );
  if (existing) return existing;

  return navigator.serviceWorker.register(FCM_SW_PATH, {
    scope: FCM_SW_SCOPE,
  });
}

/** Fetch FCM device token (permission must already be granted). */
export async function getFcmDeviceToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const vapidKey = readVapidKey();
  if (!vapidKey) {
    console.warn(
      "[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push cannot register.",
    );
    return null;
  }

  if (Notification.permission !== "granted") return null;

  const registration = await ensureMessagingServiceWorker();
  if (!registration) {
    console.warn("[FCM] Service worker registration failed.");
    return null;
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

/**
 * Initialize Firebase Messaging and request the browser notification permission
 * when it has not been decided yet. Returns the FCM token when available.
 */
export async function requestFcmPermissionAndToken(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (!(await isSupported())) return null;

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return null;

  return getFcmDeviceToken();
}

export type NotificationEnableResult =
  | { ok: true; token: string }
  | { ok: false; reason: "unsupported" | "denied" | "no_vapid" | "no_token" | "error"; message: string };

/** User-gesture path for Profile “Enable notifications”. */
export async function enablePushNotificationsForUser(
  uid: string,
): Promise<NotificationEnableResult> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return {
        ok: false,
        reason: "unsupported",
        message: "This browser does not support notifications.",
      };
    }
    if (!(await isSupported())) {
      return {
        ok: false,
        reason: "unsupported",
        message: "Push messaging is not supported on this device.",
      };
    }
    if (!isFcmVapidConfigured()) {
      return {
        ok: false,
        reason: "no_vapid",
        message:
          "Push is not configured (missing VAPID key). Ask the salon admin to set NEXT_PUBLIC_FIREBASE_VAPID_KEY.",
      };
    }

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      return {
        ok: false,
        reason: "denied",
        message:
          "Notification permission blocked. Enable it in browser site settings, then try again.",
      };
    }

    const token = await getFcmDeviceToken();
    if (!token) {
      return {
        ok: false,
        reason: "no_token",
        message: "Could not get a push token. Try again after a refresh.",
      };
    }

    await updateUserFcmToken(uid, token);
    return { ok: true, token };
  } catch (err) {
    return {
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : "Could not enable notifications.",
    };
  }
}

/**
 * Client bootstrap: prompt when permission is unset; save token when logged in.
 */
export async function syncFcmTokenForUser(
  uid: string | null | undefined,
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (!("Notification" in window)) return;
    if (!isFcmVapidConfigured()) return;

    // Don't auto-prompt when already denied — Profile button handles retry UX.
    if (Notification.permission === "denied") return;

    const token = await requestFcmPermissionAndToken();
    if (token && uid) {
      await updateUserFcmToken(uid, token);
    }
  } catch (error) {
    console.warn("[FCM] sync failed:", error);
  }
}

/** Foreground push — show OS notification only (inbox already written by Cloud Functions). */
export async function bindForegroundMessaging(
  userId: string | null | undefined,
): Promise<(() => void) | null> {
  if (typeof window === "undefined" || !userId) return null;

  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const { onMessage } = await import("firebase/messaging");

  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? "Salon I Squad";
    const body = payload.notification?.body ?? "";
    if (Notification.permission === "granted" && (title || body)) {
      new Notification(title, {
        body,
        icon: "/icons/icon-192.png",
      });
    }
  });
}
