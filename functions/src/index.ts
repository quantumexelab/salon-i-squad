import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "asia-south1" });

function getDb() {
  if (!admin.apps.length) admin.initializeApp();
  return admin.firestore();
}

type BookingDoc = {
  userId?: string;
  phoneNumber?: string;
  serviceName?: string;
  selectedTime?: string;
  dateKey?: string;
  appointmentNumber?: number;
  status?: string;
  cancelReason?: string;
  cancelledBy?: string;
  reminderSentAt?: string;
  checkedInAt?: string;
  noShowDeadlineAt?: string;
};

async function sendWhatsAppNotification(toPhone: string, text: string) {
  const token = process.env.META_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "1283961314800179";
  if (!token) return;

  let cleaned = toPhone.replace(/\D/g, "");
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    cleaned = "94" + cleaned.slice(1);
  }
  if (!cleaned) return;

  try {
    await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleaned,
        type: "text",
        text: { preview_url: false, body: text },
      }),
    });
  } catch (err) {
    console.error("Failed to send WhatsApp notification", err);
  }
}

async function getUserFcmToken(userId: string): Promise<string | null> {
  if (!userId) return null;
  const snap = await getDb().collection("users").doc(userId).get();
  const token = snap.data()?.fcmToken;
  return typeof token === "string" && token.trim() ? token.trim() : null;
}

async function saveNotification(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
}) {
  await getDb().collection("notifications").add({
    userId: input.userId,
    title: input.title,
    body: input.body,
    type: input.type,
    bookingId: input.bookingId ?? "",
    read: false,
    createdAt: new Date().toISOString(),
  });
}

async function sendFcmOnly(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const token = await getUserFcmToken(input.userId);
  if (!token) {
    console.info(
      `[push] skipped FCM (no fcmToken) userId=${input.userId} type=${input.type}`,
    );
    return { ok: false, reason: "no_fcm_token" };
  }
  const site =
    (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "")
      .trim()
      .replace(/\/$/, "") || "https://salon-i-squad.vercel.app";
  const path = input.bookingId ? "/my-bookings" : "/";
  const link = `${site}${path}`;
  const icon = `${site}/icons/icon-192.png`;
  try {
    await admin.messaging().send({
      token,
      data: {
        title: input.title,
        body: input.body,
        type: input.type,
        bookingId: input.bookingId ?? "",
        url: path,
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
    return { ok: true };
  } catch (err) {
    console.error("[push] FCM send failed", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "fcm_send_failed",
    };
  }
}

async function sendPush(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
}) {
  await saveNotification(input);
  await sendFcmOnly(input);
}

/**
 * HTTP relay so Next.js (local/Vercel without service-account JSON) can still
 * send OS push via Cloud Functions default credentials.
 * Auth: Firebase ID token of admin/master.
 */
export const relayFcmPush = onRequest(
  { cors: true, invoker: "public" },
  async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST only" });
    return;
  }

  const authHeader = String(req.headers.authorization || "");
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!idToken) {
    res.status(401).json({ ok: false, error: "Missing auth token" });
    return;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const staffSnap = await getDb().collection("users").doc(decoded.uid).get();
    const role = String(staffSnap.data()?.role || "");
    if (role !== "admin" && role !== "master") {
      res.status(403).json({ ok: false, error: "Staff only" });
      return;
    }

    const body = (req.body || {}) as {
      userId?: string;
      title?: string;
      body?: string;
      type?: string;
      bookingId?: string;
    };
    const userId = String(body.userId || "").trim();
    const title = String(body.title || "").trim();
    const text = String(body.body || "").trim();
    if (!userId || !title) {
      res.status(400).json({ ok: false, error: "userId and title required" });
      return;
    }

    const result = await sendFcmOnly({
      userId,
      title,
      body: text,
      type: String(body.type || "reminder_test"),
      bookingId: body.bookingId,
    });

    if (!result.ok) {
      res.status(422).json({ ok: false, error: result.reason || "fcm_failed" });
      return;
    }
    res.status(200).json({ ok: true, channel: "fcm" });
  } catch (err) {
    console.error("[relayFcmPush]", err);
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

export const onBookingCreated = onDocumentCreated(
  "bookings/{bookingId}",
  async (event) => {
    const data = event.data?.data() as BookingDoc | undefined;
    const bookingId = event.params.bookingId;
    if (!data?.userId) return;

    await sendPush({
      userId: data.userId,
      title: "Booking confirmed",
      body: `Appointment #${data.appointmentNumber ?? "?"} · ${data.serviceName ?? "Service"} at ${data.selectedTime ?? ""}`,
      type: "booking_confirmed",
      bookingId,
    });

    if (data.phoneNumber) {
      const confirmText = `🎉 *Salon I Squad — Booking Confirmed!*\n\n• Appointment: #${data.appointmentNumber ?? "?"}\n• Service: ${data.serviceName ?? "Service"}\n• Time: ${data.selectedTime ?? ""}\n• Date: ${data.dateKey ?? ""}\n\n⏰ We will send a reminder 1 hour before your appointment. Thank you!`;
      await sendWhatsAppNotification(data.phoneNumber, confirmText);
    }
  },
);

export const onBookingUpdated = onDocumentUpdated(
  "bookings/{bookingId}",
  async (event) => {
    const before = event.data?.before.data() as BookingDoc | undefined;
    const after = event.data?.after.data() as BookingDoc | undefined;
    const bookingId = event.params.bookingId;
    if (!after?.userId) return;

    if (before?.status !== "cancelled" && after.status === "cancelled") {
      const reason = after.cancelReason?.trim();
      await sendPush({
        userId: after.userId,
        title: "Booking cancelled",
        body: reason
          ? reason
          : `Appointment #${after.appointmentNumber ?? "?"} was cancelled.`,
        type: "booking_cancelled",
        bookingId,
      });

      if (after.phoneNumber) {
        const cancelMsg = `Salon I Squad: Appointment #${after.appointmentNumber ?? "?"} has been cancelled.`;
        await sendWhatsAppNotification(after.phoneNumber, cancelMsg);
      }
      return;
    }

    if (before?.status !== "completed" && after.status === "completed") {
      const dateKey = after.dateKey;
      const currentNum = after.appointmentNumber;
      if (!dateKey || currentNum == null) return;

      const nextSnap = await getDb()
        .collection("bookings")
        .where("dateKey", "==", dateKey)
        .where("appointmentNumber", "==", currentNum + 1)
        .where("status", "==", "confirmed")
        .limit(1)
        .get();

      if (nextSnap.empty) return;
      const next = nextSnap.docs[0]!.data() as BookingDoc;
      const nextUserId = next.userId;
      if (!nextUserId) return;

      await sendPush({
        userId: nextUserId,
        title: "Your turn is coming up",
        body: `Appointment #${currentNum + 1} — we're ready for you. Please arrive within 15 minutes.`,
        type: "queue_turn",
        bookingId: nextSnap.docs[0]!.id,
      });

      if (next.phoneNumber) {
        const queueAlert = `🚶‍♂️ *Salon I Squad — Your Turn is Next!*\n\nAppointment #${currentNum + 1} (${next.serviceName || "Service"}):\nWe are ready for you soon! Please arrive at the salon within 15 minutes. Thank you!`;
        await sendWhatsAppNotification(next.phoneNumber, queueAlert);
      }

      if (after.phoneNumber) {
        const reviewPrompt = `⭐ *How was your styling experience at Salon I Squad today?*\n\nThank you for visiting! We would love your feedback. Reply with 1 to 5 stars or let us know how we did! ✨`;
        await sendWhatsAppNotification(after.phoneNumber, reviewPrompt);
      }

      const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await nextSnap.docs[0]!.ref.update({ noShowDeadlineAt: deadline });
    }
  },
);

/**
 * Reliable 5-minute tick (Asia/Colombo). GitHub Actions schedules often lag
 * hours, so this Cloud Function pings the Next.js reminder endpoint.
 */
export const sendAppointmentReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Colombo",
  },
  async () => {
    const url =
      process.env.REMINDERS_URL?.trim() ||
      "https://salon-i-squad.vercel.app/api/whatsapp/reminders";
    const secret = process.env.CRON_SECRET?.trim();
    const res = await fetch(url, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    const body = await res.text();
    console.log(
      `[sendAppointmentReminders] status=${res.status} body=${body.slice(0, 800)}`,
    );
    if (!res.ok) {
      throw new Error(`Reminders endpoint failed: ${res.status}`);
    }
  },
);

export const processNoShows = onSchedule("every 1 minutes", async () => {
  const nowIso = new Date().toISOString();
  const todayKey = new Date().toISOString().slice(0, 10);

  const snap = await getDb()
    .collection("bookings")
    .where("dateKey", "==", todayKey)
    .where("status", "==", "confirmed")
    .get();

  for (const docSnap of snap.docs) {
    const data = docSnap.data() as BookingDoc;

    if (data.noShowDeadlineAt && data.noShowDeadlineAt <= nowIso && !data.checkedInAt) {
      await docSnap.ref.update({
        status: "no_show",
        cancelReason: "Auto-cancelled — no arrival within 15 minutes",
        cancelledBy: "system",
        updatedAt: nowIso,
      });
      if (data.userId) {
        await sendPush({
          userId: data.userId,
          title: "Appointment cancelled",
          body: "We did not see you within 15 minutes. Your appointment was auto-cancelled.",
          type: "no_show",
          bookingId: docSnap.id,
        });
      }
      continue;
    }

    if (data.checkedInAt || data.noShowDeadlineAt) continue;
    if (!data.selectedTime) continue;

    const match = data.selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) continue;
    let hours = parseInt(match[1]!, 10);
    const mins = parseInt(match[2]!, 10);
    const ampm = match[3]!.toUpperCase();
    if (ampm === "PM" && hours !== 12) hours += 12;
    if (ampm === "AM" && hours === 12) hours = 0;

    const slot = new Date();
    slot.setHours(hours, mins, 0, 0);
    const diffMs = Date.now() - slot.getTime();
    if (diffMs >= 0 && diffMs < 60 * 1000 && data.userId) {
      const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await docSnap.ref.update({ noShowDeadlineAt: deadline });
      await sendPush({
        userId: data.userId,
        title: "Your appointment is now",
        body: `Please arrive within 15 minutes for appointment #${data.appointmentNumber ?? "?"}.`,
        type: "appointment_now",
        bookingId: docSnap.id,
      });
    }
  }
});
