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
  if (!token) return;
  await admin.messaging().send({
    token,
    notification: { title: input.title, body: input.body },
    data: {
      type: input.type,
      bookingId: input.bookingId ?? "",
    },
  });
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

      const deadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await nextSnap.docs[0]!.ref.update({ noShowDeadlineAt: deadline });
    }
  },
);

export const sendAppointmentReminders = onSchedule(
  "every 5 minutes",
  async () => {
    const now = new Date();
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const todayKey = now.toISOString().slice(0, 10);

    const snap = await getDb()
      .collection("bookings")
      .where("dateKey", "==", todayKey)
      .where("status", "==", "confirmed")
      .get();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as BookingDoc;
      if (data.reminderSentAt) continue;
      if (!data.selectedTime) continue;

      const match = data.selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) continue;
      let hours = parseInt(match[1]!, 10);
      const mins = parseInt(match[2]!, 10);
      const ampm = match[3]!.toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      const apptStart = new Date(now);
      apptStart.setHours(hours, mins, 0, 0);

      if (apptStart <= now || apptStart > inOneHour) continue;
      if (!data.userId) continue;

      await sendPush({
        userId: data.userId,
        title: "Appointment in 1 hour",
        body: `#${data.appointmentNumber ?? "?"} · ${data.serviceName ?? "Service"} at ${data.selectedTime}`,
        type: "reminder_1h",
        bookingId: docSnap.id,
      });

      await docSnap.ref.update({
        reminderSentAt: new Date().toISOString(),
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
