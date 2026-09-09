import * as admin from "firebase-admin";
import {
  onDocumentCreated,
  onDocumentUpdated,
} from "firebase-functions/v2/firestore";
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

async function sendPush(input: {
  userId: string;
  title: string;
  body: string;
  type: string;
  bookingId?: string;
}) {
  await saveNotification(input);
  const token = await getUserFcmToken(input.userId);
  if (!token) {
    console.info(
      `[push] skipped FCM (no fcmToken) userId=${input.userId} type=${input.type}`,
    );
    return;
  }
  try {
    await admin.messaging().send({
      token,
      notification: { title: input.title, body: input.body },
      data: {
        type: input.type,
        bookingId: input.bookingId ?? "",
      },
      webpush: {
        fcmOptions: {
          link: input.bookingId ? "/my-bookings" : "/",
        },
      },
    });
  } catch (err) {
    console.error("[push] FCM send failed", err);
  }
}

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

function getSriLankaNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const p: Record<string, string> = {};
  for (const item of parts) p[item.type] = item.value;
  const hour = p.hour === "24" ? "00" : p.hour;
  return new Date(`${p.year}-${p.month}-${p.day}T${hour}:${p.minute}:${p.second}`);
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const sendAppointmentReminders = onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Asia/Colombo",
  },
  async () => {
    const slNow = getSriLankaNow();
    const todayKey = toDateKey(slNow);
    const nowMinutes = slNow.getHours() * 60 + slNow.getMinutes();
    const windowStart = nowMinutes + 45;
    const windowEnd = nowMinutes + 75;

    const snap = await getDb()
      .collection("bookings")
      .where("dateKey", "==", todayKey)
      .where("status", "==", "confirmed")
      .get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as BookingDoc & { whatsappReminderSentAt?: string };
      if (data.reminderSentAt || data.whatsappReminderSentAt) continue;
      if (!data.selectedTime) continue;

      const match = data.selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) continue;
      let hours = parseInt(match[1]!, 10);
      const mins = parseInt(match[2]!, 10);
      const ampm = match[3]!.toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const slotMinutes = hours * 60 + mins;

      if (slotMinutes < windowStart || slotMinutes > windowEnd) continue;

      if (data.userId) {
        await sendPush({
          userId: data.userId,
          title: "Appointment in 1 hour",
          body: `#${data.appointmentNumber ?? "?"} · ${data.serviceName ?? "Service"} at ${data.selectedTime}`,
          type: "reminder_1h",
          bookingId: docSnap.id,
        });
      }

      if (data.phoneNumber) {
        const reminderText = `⏰ *Salon I Squad — Appointment Reminder*\n\nHi! Your appointment is coming up in *1 hour*:\n\n• Appointment: #${data.appointmentNumber ?? "?"}\n• Service: ${data.serviceName ?? "Service"}\n• Time: ${data.selectedTime}\n• Location: Salon I Squad\n\nPlease arrive on time. We look forward to seeing you!`;
        await sendWhatsAppNotification(data.phoneNumber, reminderText);
      }

      const stamp = new Date().toISOString();
      await docSnap.ref.update({
        reminderSentAt: stamp,
        whatsappReminderSentAt: stamp,
      });
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
