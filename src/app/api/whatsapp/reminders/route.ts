import { NextResponse } from "next/server";
import { getSriLankaNow, parseSlotMinutes, toDateKey } from "@/lib/calendar-utils";
import {
  loadTodaysConfirmedBookings,
  markProductionReminderSent,
  markTestReminderSent,
  sendReminderChannels,
} from "@/lib/reminders/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/whatsapp/reminders
 * Sends ~1 hour reminders + due temporary test reminders.
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
  const nowIso = slNow.toISOString();

  // Minutes-until-appointment window. GitHub cron can lag hours; Firebase
  // pings every 5m. Keep this wide so a late tick still delivers.
  const minUntil = 5;
  const maxUntil = 180;

  try {
    const bookings = await loadTodaysConfirmedBookings(todayKey);
    const sent: Array<{
      id: string;
      appointmentNumber: number;
      channels: string[];
      kind: "reminder_1h" | "reminder_test";
      whatsappOk?: boolean;
    }> = [];
    const skipped: Array<{ id: string; reason: string }> = [];
    const testsSent: Array<{
      id: string;
      appointmentNumber: number;
      channels: string[];
    }> = [];

    for (const data of bookings) {
      // Due temporary 2-min tests (does not touch production reminderSentAt)
      const testAt = String(data.testReminderAt || "").trim();
      if (
        testAt &&
        !data.testReminderSentAt &&
        testAt <= nowIso
      ) {
        const result = await sendReminderChannels(data, {
          kind: "reminder_test",
        });
        if (result.channels.length > 0) {
          try {
            await markTestReminderSent(data.id);
          } catch (markErr) {
            console.warn(
              `[Reminders] Test sent but failed to mark ${data.id}`,
              markErr,
            );
          }
          testsSent.push({
            id: data.id,
            appointmentNumber: data.appointmentNumber || 1,
            channels: result.channels,
          });
        } else {
          skipped.push({
            id: data.id,
            reason: result.skippedReason || "test_no_channel",
          });
        }
      }

      if (data.reminderSentAt || data.whatsappReminderSentAt) {
        skipped.push({ id: data.id, reason: "already_sent" });
        continue;
      }

      const timeMinutes = parseSlotMinutes(String(data.selectedTime || ""));
      if (Number.isNaN(timeMinutes)) {
        skipped.push({ id: data.id, reason: "bad_time" });
        continue;
      }

      const minsUntil = timeMinutes - currentMinutes;
      if (minsUntil < minUntil || minsUntil > maxUntil) {
        skipped.push({
          id: data.id,
          reason: `outside_window(${minsUntil}m)`,
        });
        continue;
      }

      const result = await sendReminderChannels(data, { kind: "reminder_1h" });
      const hasPhone = Boolean(String(data.phoneNumber || "").trim());
      // Never stamp "already sent" if WhatsApp still failed — otherwise we
      // never retry after inbox/email-only success.
      if (hasPhone && !result.whatsappOk) {
        skipped.push({
          id: data.id,
          reason: result.skippedReason || "whatsapp_failed",
        });
        continue;
      }
      if (result.channels.length === 0) {
        skipped.push({
          id: data.id,
          reason: result.skippedReason || "no_channel",
        });
        continue;
      }

      try {
        await markProductionReminderSent(data.id);
      } catch (markErr) {
        console.warn(`[Reminders] Sent but failed to mark ${data.id}`, markErr);
      }

      sent.push({
        id: data.id,
        appointmentNumber: data.appointmentNumber || 1,
        channels: result.channels,
        kind: "reminder_1h",
        whatsappOk: result.whatsappOk,
      });
    }

    console.log(
      `[Reminders] today=${todayKey} nowMins=${currentMinutes} untilWindow=${minUntil}-${maxUntil}m found=${bookings.length} sent=${sent.length} tests=${testsSent.length}`,
    );

    return NextResponse.json({
      ok: true,
      todayKey,
      currentMinutes,
      minUntil,
      maxUntil,
      bookingsFound: bookings.length,
      remindersCount: sent.length,
      sent,
      testsSent,
      testsSentCount: testsSent.length,
      skipped,
      skippedCount: skipped.length,
      adminSdk: Boolean(
        process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
          process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim(),
      ),
      resendConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
      cronSecretConfigured: Boolean(cronSecret),
    });
  } catch (error) {
    console.error("[WhatsApp Reminders Cron Error]", error);
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
