import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { isValidEmail, normalizeEmail } from "@/lib/email-validation";
import { sendSalonEmail } from "@/lib/email/send";
import { sendWhatsAppTextOrTemplate } from "@/lib/whatsapp/api";
import { t } from "@/lib/whatsapp/i18n";
import { getFirebaseAdminApp } from "@/lib/reminders/firebase-admin";
import {
  restCreateDocument,
  restGetDocument,
  restUpdateDocument,
} from "@/lib/reminders/firestore-rest";
import { absoluteSitePath, getPublicSiteUrl } from "@/lib/site-url";

export type ReminderKind = "reminder_1h" | "reminder_test";

/** Staff ID token for local/dev writes when Admin SDK is missing. */
let staffAccessToken: string | null = null;

export async function withStaffAccessToken<T>(
  token: string | null | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = staffAccessToken;
  staffAccessToken = token?.trim() || null;
  try {
    return await fn();
  } finally {
    staffAccessToken = prev;
  }
}

export type ReminderBooking = {
  id: string;
  userId?: string;
  phoneNumber?: string;
  customerEmail?: string;
  customerName?: string;
  selectedTime?: string;
  serviceName?: string;
  staffName?: string;
  appointmentNumber?: number;
  status?: string;
  dateKey?: string;
  reminderSentAt?: string;
  whatsappReminderSentAt?: string;
  testReminderAt?: string;
  testReminderSentAt?: string;
};

export type ReminderSendResult = {
  channels: string[];
  skippedReason?: string;
  /** Why phone OS push did/didn't send (for admin test UI). */
  fcmStatus?: string;
  whatsappOk?: boolean;
  whatsappError?: string;
};

export function isAppUserId(userId?: string): boolean {
  return Boolean(userId && !userId.startsWith("wa_"));
}

async function ensureClientAuth() {
  const auth = getClientAuth();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export async function loadTodaysConfirmedBookings(
  todayKey: string,
): Promise<ReminderBooking[]> {
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    const snap = await getFirestore(adminApp)
      .collection(COLLECTIONS.bookings)
      .where("dateKey", "==", todayKey)
      .where("status", "==", "confirmed")
      .get();

    return snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<ReminderBooking, "id">),
    }));
  }

  await ensureClientAuth();
  const db = getClientDb();
  const snap = await getDocs(
    query(
      collection(db, COLLECTIONS.bookings),
      where("dateKey", "==", todayKey),
      where("status", "==", "confirmed"),
    ),
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<ReminderBooking, "id">),
  }));
}

export async function loadBookingById(
  bookingId: string,
): Promise<ReminderBooking | null> {
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    const snap = await getFirestore(adminApp)
      .collection(COLLECTIONS.bookings)
      .doc(bookingId)
      .get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() as Omit<ReminderBooking, "id">) };
  }

  if (staffAccessToken) {
    const docData = await restGetDocument(
      COLLECTIONS.bookings,
      bookingId,
      staffAccessToken,
    );
    if (!docData) return null;
    const { id, ...rest } = docData;
    return { id, ...(rest as Omit<ReminderBooking, "id">) };
  }

  await ensureClientAuth();
  const snap = await getDoc(doc(getClientDb(), COLLECTIONS.bookings, bookingId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<ReminderBooking, "id">) };
}

export async function updateBookingFields(
  bookingId: string,
  payload: Record<string, unknown>,
  deleteKeys: string[] = [],
): Promise<void> {
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    const adminPayload: Record<string, unknown> = { ...payload };
    for (const key of deleteKeys) {
      adminPayload[key] = FieldValue.delete();
    }
    await getFirestore(adminApp)
      .collection(COLLECTIONS.bookings)
      .doc(bookingId)
      .update(adminPayload);
    return;
  }

  if (staffAccessToken) {
    await restUpdateDocument(
      COLLECTIONS.bookings,
      bookingId,
      payload,
      staffAccessToken,
      deleteKeys,
    );
    return;
  }

  await ensureClientAuth();
  const clientPayload: Record<string, unknown> = { ...payload };
  for (const key of deleteKeys) {
    clientPayload[key] = deleteField();
  }
  await updateDoc(
    doc(getClientDb(), COLLECTIONS.bookings, bookingId),
    clientPayload,
  );
}

export async function markProductionReminderSent(
  bookingId: string,
): Promise<void> {
  const stamp = new Date().toISOString();
  await updateBookingFields(bookingId, {
    reminderSentAt: stamp,
    whatsappReminderSentAt: stamp,
  });
}

export async function markTestReminderSent(bookingId: string): Promise<void> {
  await updateBookingFields(bookingId, {
    testReminderSentAt: new Date().toISOString(),
  });
}

async function createAppInboxNotification(input: {
  userId: string;
  title: string;
  body: string;
  bookingId: string;
  type: ReminderKind;
}): Promise<boolean> {
  const payload = {
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    bookingId: input.bookingId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    await getFirestore(adminApp).collection(COLLECTIONS.notifications).add(payload);
    return true;
  }

  if (staffAccessToken) {
    await restCreateDocument(
      COLLECTIONS.notifications,
      payload,
      staffAccessToken,
    );
    return true;
  }

  await ensureClientAuth();
  await addDoc(collection(getClientDb(), COLLECTIONS.notifications), payload);
  return true;
}

async function sendAppPushViaCloudRelay(input: {
  userId: string;
  title: string;
  body: string;
  bookingId: string;
  type: ReminderKind;
}): Promise<{ ok: boolean; reason: string }> {
  if (!staffAccessToken) {
    return { ok: false, reason: "no_staff_token_for_relay" };
  }
  const projectId = (
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "salon-i-squad"
  ).trim();
  const relayUrl =
    (process.env.FCM_RELAY_URL || "").trim() ||
    `https://asia-south1-${projectId}.cloudfunctions.net/relayFcmPush`;

  try {
    const res = await fetch(relayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${staffAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: input.userId,
        title: input.title,
        body: input.body,
        type: input.type,
        bookingId: input.bookingId,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        reason: data.error || `relay_http_${res.status}`,
      };
    }
    return { ok: true, reason: "sent_via_relay" };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "relay_failed",
    };
  }
}

async function sendAppPushIfPossible(input: {
  userId: string;
  title: string;
  body: string;
  bookingId: string;
  type: ReminderKind;
}): Promise<{ ok: boolean; reason: string }> {
  const adminApp = getFirebaseAdminApp();
  if (!adminApp) {
    console.warn(
      "[Reminders] No Admin SDK — trying Cloud Function FCM relay",
    );
    return sendAppPushViaCloudRelay(input);
  }

  try {
    const userSnap = await getFirestore(adminApp)
      .collection(COLLECTIONS.users)
      .doc(input.userId)
      .get();
    const fcmToken = String(userSnap.data()?.fcmToken || "").trim();
    if (!fcmToken) {
      console.info(
        `[Reminders] FCM skipped (no fcmToken) userId=${input.userId}`,
      );
      return { ok: false, reason: "no_fcm_token" };
    }

    const site = getPublicSiteUrl();
    const link = absoluteSitePath("/my-bookings");
    const icon = absoluteSitePath("/icons/icon-192.png");

    await getMessaging(adminApp).send({
      token: fcmToken,
      data: {
        title: input.title,
        body: input.body,
        type: input.type,
        bookingId: input.bookingId,
        url: "/my-bookings",
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: {
          title: input.title,
          body: input.body,
          icon,
          badge: icon,
        },
        fcmOptions: { link },
      },
    });
    console.info(
      `[Reminders] FCM sent userId=${input.userId} site=${site} type=${input.type}`,
    );
    return { ok: true, reason: "sent" };
  } catch (err) {
    console.warn(`[Reminders] FCM push failed for ${input.userId}`, err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "fcm_send_failed",
    };
  }
}

/** Send inbox + FCM + WhatsApp + email. Does not stamp sent flags. */
export async function sendReminderChannels(
  data: ReminderBooking,
  options: { kind: ReminderKind },
): Promise<ReminderSendResult> {
  const channels: string[] = [];
  let fcmStatus = "not_attempted";
  const isTest = options.kind === "reminder_test";
  const title = isTest
    ? "Test reminder (2 min)"
    : "Appointment in 1 hour";
  const body = `#${data.appointmentNumber ?? "?"} · ${data.serviceName || "Service"} at ${data.selectedTime || ""}`;

  if (isAppUserId(data.userId)) {
    try {
      await createAppInboxNotification({
        userId: data.userId!,
        title,
        body,
        bookingId: data.id,
        type: options.kind,
      });
      channels.push("app_inbox");
    } catch (err) {
      console.warn(`[Reminders] App inbox failed for ${data.id}`, err);
    }

    try {
      const pushed = await sendAppPushIfPossible({
        userId: data.userId!,
        title,
        body,
        bookingId: data.id,
        type: options.kind,
      });
      fcmStatus = pushed.reason;
      if (pushed.ok) channels.push("fcm");
    } catch (err) {
      fcmStatus = err instanceof Error ? err.message : "push_error";
      console.warn(`[Reminders] Push failed for ${data.id}`, err);
    }
  } else {
    fcmStatus = "no_app_user";
  }

  let whatsappOk = false;
  const phone = String(data.phoneNumber || "").trim();
  if (phone) {
    const reminderMsg = isTest
      ? `🧪 *Test reminder*\n\nAppointment #${data.appointmentNumber || "?"}\n${data.serviceName || "Service"} at ${data.selectedTime || ""}\n\n(This is a debug test — real 1h reminders still work separately.)`
      : t("reminder1Hour", "en", {
          num: data.appointmentNumber || 1,
          service: data.serviceName || "Service",
          staff: data.staffName || "Barber",
          time: data.selectedTime || "",
        });
    whatsappOk = await sendWhatsAppTextOrTemplate(phone, reminderMsg, [
      String(data.appointmentNumber || 1),
      String(data.serviceName || "Service").slice(0, 60),
      String(data.selectedTime || "").slice(0, 20),
    ]);
    if (whatsappOk) channels.push("whatsapp");
  }

  const emailTo = normalizeEmail(String(data.customerEmail || ""));
  if (isValidEmail(emailTo)) {
    try {
      const emailOk = await sendSalonEmail({
        to: emailTo,
        type: "reminder_1h",
        customerName: data.customerName,
        appointmentNumber: data.appointmentNumber,
        serviceName: isTest
          ? `[TEST] ${data.serviceName || "Service"}`
          : data.serviceName,
        selectedTime: data.selectedTime,
      });
      if (emailOk.ok) channels.push("email");
    } catch (err) {
      console.warn(`[Reminders] Email failed for ${data.id}`, err);
    }
  }

  if (channels.length === 0) {
    return {
      channels,
      skippedReason: phone ? "whatsapp_failed" : "no_channel",
      fcmStatus,
      whatsappOk,
    };
  }

  return { channels, fcmStatus, whatsappOk };
}

export async function scheduleTestReminder(
  bookingId: string,
  delayMs = 2 * 60 * 1000,
): Promise<string> {
  const at = new Date(Date.now() + delayMs).toISOString();
  await updateBookingFields(
    bookingId,
    { testReminderAt: at },
    ["testReminderSentAt"],
  );
  return at;
}
