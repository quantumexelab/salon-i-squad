import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { sendWhatsAppButtons, sendWhatsAppText } from "@/lib/whatsapp/api";
import { t } from "@/lib/whatsapp/i18n";

export const runtime = "nodejs";

function getFirebaseAdmin(): App | null {
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

/**
 * POST /api/whatsapp/status-hook
 * Triggered when a booking is completed or updated via admin dashboard.
 * - Sends 5-star rating prompt to the completed customer
 * - Sends 'Your turn is next' notification to the next customer in queue
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, status } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Missing bookingId" }, { status: 400 });
    }

    const app = getFirebaseAdmin();
    if (!app) {
      return NextResponse.json({ ok: false, error: "Firebase Admin not available" }, { status: 500 });
    }

    const db = getFirestore(app);
    const bookingDoc = await db.collection(COLLECTIONS.bookings).doc(bookingId).get();

    if (!bookingDoc.exists) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const bookingData = bookingDoc.data() || {};
    const phone = String(bookingData.phoneNumber || "").trim();
    const dateKey = String(bookingData.dateKey || "");
    const appointmentNum = Number(bookingData.appointmentNumber || 0);

    if (status === "completed") {
      // 1. Send 5-star feedback rating to completed customer
      if (phone) {
        const feedbackPrompt = t("feedbackPrompt", "en");
        await sendWhatsAppButtons(
          phone,
          feedbackPrompt,
          [
            { id: `rate_5_${bookingId}`, title: "⭐⭐⭐⭐⭐ 5 Stars" },
            { id: `rate_4_${bookingId}`, title: "⭐⭐⭐⭐ 4 Stars" },
            { id: `rate_3_${bookingId}`, title: "⭐⭐⭐ 3 Stars" },
          ],
          { headerText: "Salon Experience", footerText: "Tap to rate" },
        );
      }

      // 2. Alert next customer in queue (appointmentNumber + 1 on same date)
      if (dateKey && appointmentNum > 0) {
        const nextSnap = await db
          .collection(COLLECTIONS.bookings)
          .where("dateKey", "==", dateKey)
          .where("appointmentNumber", "==", appointmentNum + 1)
          .where("status", "==", "confirmed")
          .limit(1)
          .get();

        if (!nextSnap.empty) {
          const nextData = nextSnap.docs[0]!.data();
          const nextPhone = String(nextData.phoneNumber || "").trim();
          if (nextPhone) {
            const queueAlert = t("queueTurnAlert", "en", {
              num: appointmentNum + 1,
              service: nextData.serviceName || "Service",
            });
            await sendWhatsAppText(nextPhone, queueAlert);
          }
        }
      }

      return NextResponse.json({ ok: true, action: "completed_notifications_sent" });
    }

    if (status === "cancelled") {
      if (phone) {
        const cancelMsg = `Salon I Squad: Appointment #${appointmentNum} has been cancelled. Send *Hi* anytime to rebook.`;
        await sendWhatsAppText(phone, cancelMsg);
      }
      return NextResponse.json({ ok: true, action: "cancelled_notification_sent" });
    }

    return NextResponse.json({ ok: true, status });
  } catch (err) {
    console.error("[WhatsApp Status Hook Error]", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
