import { getApps, getApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from "firebase/messaging";
import { initFirebase } from "@/lib/firebase";
import { updateUserFcmToken } from "@/lib/users";

const FCM_SW_PATH = "/firebase-messaging-sw.js";

function readVapidKey(): string {
  return (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "").trim();
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

  const existing = await navigator.serviceWorker.getRegistration(FCM_SW_PATH);
  if (existing) return existing;

  return navigator.serviceWorker.register(FCM_SW_PATH);
}

/** Fetch FCM device token (permission must already be granted). */
export async function getFcmDeviceToken(): Promise<string | null> {
  const messaging = await getMessagingIfSupported();
  if (!messaging) return null;

  const vapidKey = readVapidKey();
  if (!vapidKey) {
    console.info(
      "[FCM] NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — skipping token fetch.",
    );
    return null;
  }

  if (Notification.permission !== "granted") return null;

  const registration = await ensureMessagingServiceWorker();
  const token = await getToken(messaging, {
    vapidKey,
    ...(registration ? { serviceWorkerRegistration: registration } : {}),
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

/**
 * Client bootstrap: prompt when permission is unset; save token when logged in.
 */
export async function syncFcmTokenForUser(
  uid: string | null | undefined,
): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (!("Notification" in window)) return;

    const token = await requestFcmPermissionAndToken();
    if (token && uid) {
      await updateUserFcmToken(uid, token);
    }
  } catch (error) {
    console.warn("[FCM] sync failed:", error);
  }
}
