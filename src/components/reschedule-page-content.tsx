"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { ReschedulePicker } from "@/components/reschedule-picker";
import { useAuth } from "@/contexts/auth-context";
import {
  CLIENT_MODIFY_CUTOFF_HOURS,
  canClientModifyBooking,
} from "@/lib/booking-policy";
import { rescheduleBooking, clientOwnsBooking, parseBookingDoc, type SavedBooking } from "@/lib/bookings";
import { toDateKey } from "@/lib/calendar-utils";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";
import { applyBookingCalendarSync } from "@/lib/request-calendar-sync";
import { getProfilePhone } from "@/lib/users";

export function ReschedulePageContent() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!bookingId || !user || !profile) {
        if (!user) setLoading(false);
        return;
      }
      try {
        initFirebase();
        const snap = await getDoc(
          doc(getFirebaseDb(), COLLECTIONS.bookings, bookingId),
        );
        if (cancelled) return;
        if (!snap.exists()) {
          setError("Booking not found.");
          setBooking(null);
        } else {
          const mapped = parseBookingDoc(snap.id, snap.data());
          const profilePhone = getProfilePhone(profile);
          if (
            !clientOwnsBooking(
              mapped,
              user.uid,
              profilePhone,
              user.email,
            )
          ) {
            setError("You can only reschedule your own bookings.");
            setBooking(null);
          } else {
            setBooking(mapped);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load booking.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId, user, profile]);

  async function handleConfirm(selectedDate: Date, selectedTime: string) {
    if (!booking) return;
    if (!canClientModifyBooking(booking)) {
      setError(
        `Cannot be modified within ${CLIENT_MODIFY_CUTOFF_HOURS} hours of the appointment.`,
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await rescheduleBooking(booking.id, { selectedDate, selectedTime });
      void applyBookingCalendarSync("update", {
        ...booking,
        selectedDate: selectedDate.toISOString(),
        selectedTime,
        dateKey: toDateKey(selectedDate),
        status: "confirmed",
      });
      router.replace("/my-bookings");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reschedule booking.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthGuard>
      <section className="mx-auto w-full max-w-lg px-4 py-6">
        <Link
          href="/my-bookings"
          className="text-xs font-medium text-salon-gold hover:text-salon-gold/80"
        >
          ← My bookings
        </Link>

        {loading ? (
          <div className="mt-10 flex justify-center text-salon-muted">
            <Loader2 className="h-5 w-5 animate-spin text-salon-gold" />
          </div>
        ) : error && !booking ? (
          <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : booking && !canClientModifyBooking(booking) ? (
          <p className="mt-6 rounded-xl border border-salon-gold/25 bg-salon-gold/10 px-4 py-3 text-sm text-salon-ink">
            Cannot be modified within {CLIENT_MODIFY_CUTOFF_HOURS} hours of the
            appointment.
          </p>
        ) : booking ? (
          <div className="mt-4">
            {error ? (
              <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            ) : null}
            <ReschedulePicker
              booking={booking}
              busy={saving}
              onCancel={() => router.push("/my-bookings")}
              onConfirm={handleConfirm}
            />
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}
