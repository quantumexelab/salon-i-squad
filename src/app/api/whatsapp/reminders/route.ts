import { NextResponse } from "next/server";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { getClientAuth, getClientDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getSriLankaNow, parseSlotMinutes, toDateKey } from "@/lib/calendar-utils";
import { sendWhatsAppText } from "@/lib/whatsapp/api";
import { t } from "@/lib/whatsapp/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getFirebaseAdminApp(): App | null {
  if (getApps().length > 0) return getApps()[0]!;

  const saRaw =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!saRaw) return null;

  try {
    const key = JSON.parse(saRaw);
    if (!key.client_email || !key.private_key) return null;
    return initializeApp({
      credential: cert({
        projectId: key.project_id || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: key.client_email,
        privateKey: key.private_key.replace(/\\n/g, "\n"),
      }),
    });
  } catch {
    return null;
  }
}

type ReminderBooking = {
  id: string;
  userId?: string;
  phoneNumber?: string;
  selectedTime?: string;
  serviceName?: string;
  staffName?: string;
  appointmentNumber?: number;
  reminderSentAt?: string;
  whatsappReminderSentAt?: string;
};

function isAppUserId(userId?: string): boolean {
  return Boolean(userId && !userId.startsWith("wa_"));
}

async function ensureClientAuth() {
  const auth = getClientAuth();
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

async function loadTodaysConfirmedBookings(todayKey: string): Promise<ReminderBooking[]> {
  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    const snap = await getFirestore(adminApp)
      .collection(COLLECTIONS.bookings)
      .where("dateKey", "==", todayKey)
      .where("status", "==", "confirmed")
      .get();

    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReminderBooking, "id">) }));
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

  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReminderBooking, "id">) }));
}

async function markReminderSent(bookingId: string): Promise<void> {
  const stamp = new Date().toISOString();
  const payload = {
    reminderSentAt: stamp,
    whatsappReminderSentAt: stamp,
  };

  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    await getFirestore(adminApp).collection(COLLECTIONS.bookings).doc(bookingId).update(payload);
    return;
  }

  await ensureClientAuth();
  await updateDoc(doc(getClientDb(), COLLECTIONS.bookings, bookingId), payload);
}

async function createAppInboxNotification(input: {
  userId: string;
  title: string;
  body: string;
  bookingId: string;
}): Promise<boolean> {
  const payload = {
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: "reminder_1h",
    bookingId: input.bookingId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const adminApp = getFirebaseAdminApp();
  if (adminApp) {
    await getFirestore(adminApp).collection(COLLECTIONS.notifications).add(payload);
    return true;
  }

  await ensureClientAuth();
  await addDoc(collection(getClientDb(), COLLECTIONS.notifications), payload);
  return true;
}

async function sendAppPushIfPossible(input: {
  userId: string;
  title: string;
  body: string;
  bookingId: string;
}): Promise<boolean> {
  const adminApp = getFirebaseAdminApp();
  if (!adminApp) return false;

  try {
    const userSnap = await getFirestore(adminApp)
      .collection(COLLECTIONS.users)
      .doc(input.userId)
      .get();
    const fcmToken = String(userSnap.data()?.fcmToken || "").trim();
    if (!fcmToken) return false;

    await getMessaging(adminApp).send({
      token: fcmToken,
      notification: { title: input.title, body: input.body },
      data: {
        type: "reminder_1h",
        bookingId: input.bookingId,
        url: "/my-bookings",
      },
    });
    return true;
  } catch (err) {
    console.warn(`[Reminders] FCM push failed for ${input.userId}`, err);
    return false;
  }
}

/**
 * GET /api/whatsapp/reminders
 * Sends ~1 hour reminders via:
 * - In-app notification inbox (logged-in app users)
 * - FCM push (when Admin SDK + fcmToken available)
 * - WhatsApp (when phone number present)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const slNow = getSriLankaNow();
  const todayKey = toDateKey(slNow);
  const currentMinutes = slNow.getHours() * 60 + slNow.getMinutes();

  // ~1 hour ahead, 15-minute-wide window (matches GitHub Actions cron interval)
  const windowStart = currentMinutes + 52;
  const windowEnd = currentMinutes + 67;

  try {
    const bookings = await loadTodaysConfirmedBookings(todayKey);
    const sent: Array<{
      id: string;
      appointmentNumber: number;
      channels: string[];
    }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const data of bookings) {
      if (data.reminderSentAt || data.whatsappReminderSentAt) {
        skipped.push({ id: data.id, reason: "already_sent" });
        continue;
      }

      const timeMinutes = parseSlotMinutes(String(data.selectedTime || ""));
      if (Number.isNaN(timeMinutes)) {
        skipped.push({ id: data.id, reason: "bad_time" });
        continue;
      }

      if (timeMinutes < windowStart || timeMinutes > windowEnd) {
        skipped.push({ id: data.id, reason: "outside_window" });
        continue;
      }

      const channels: string[] = [];
      const title = "Appointment in 1 hour";
      const body = `#${data.appointmentNumber ?? "?"} · ${data.serviceName || "Service"} at ${data.selectedTime || ""}`;

      if (isAppUserId(data.userId)) {
        try {
          await createAppInboxNotification({
            userId: data.userId!,
            title,
            body,
            bookingId: data.id,
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
          });
          if (pushed) channels.push("fcm");
        } catch (err) {
          console.warn(`[Reminders] Push failed for ${data.id}`, err);
        }
      }

      const phone = String(data.phoneNumber || "").trim();
      if (phone) {
        const reminderMsg = t("reminder1Hour", "en", {
          num: data.appointmentNumber || 1,
          service: data.serviceName || "Service",
          staff: data.staffName || "Stylist",
          time: data.selectedTime || "",
        });
        const waOk = await sendWhatsAppText(phone, reminderMsg);
        if (waOk) channels.push("whatsapp");
      }

      if (channels.length === 0) {
        skipped.push({ id: data.id, reason: "no_channel" });
        continue;
      }

      try {
        await markReminderSent(data.id);
      } catch (markErr) {
        console.warn(`[Reminders] Sent but failed to mark ${data.id}`, markErr);
      }

      sent.push({
        id: data.id,
        appointmentNumber: data.appointmentNumber || 1,
        channels,
      });
    }

    console.log(
      `[Reminders] today=${todayKey} nowMins=${currentMinutes} window=${windowStart}-${windowEnd} sent=${sent.length}`,
    );

    return NextResponse.json({
      ok: true,
      todayKey,
      currentMinutes,
      windowStart,
      windowEnd,
      remindersCount: sent.length,
      sent,
      skippedCount: skipped.length,
    });
  } catch (error) {
    console.error("[WhatsApp Reminders Cron Error]", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
