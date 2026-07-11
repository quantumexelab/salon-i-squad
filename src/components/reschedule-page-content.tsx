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
import { rescheduleBooking, type SavedBooking } from "@/lib/bookings";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { getFirebaseDb, initFirebase } from "@/lib/firebase";

function mapBooking(id: string, data: Record<string, unknown>): SavedBooking {
  return {
    id,
    userId: String(data.userId ?? ""),
    serviceId: String(data.serviceId ?? ""),
    serviceName: String(data.serviceName ?? "Service"),
    duration: Number(data.duration ?? 0),
    price: Number(data.price ?? 0),
    selectedDate: String(data.selectedDate ?? ""),
    selectedTime: String(data.selectedTime ?? ""),
    dateKey: data.dateKey ? String(data.dateKey) : undefined,
    phoneNumber: data.phoneNumber ? String(data.phoneNumber) : undefined,
    customerName: data.customerName ? String(data.customerName) : undefined,
    customerEmail: data.customerEmail
      ? String(data.customerEmail)
      : undefined,
    status: String(data.status ?? "confirmed"),
    createdAt: String(data.createdAt ?? ""),
  };
}

export function ReschedulePageContent() {
  const params = useParams<{ bookingId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!bookingId || !user) {
        setLoading(false);
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
          const mapped = mapBooking(snap.id, snap.data());
          if (mapped.userId !== user.uid) {
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
  }, [bookingId, user]);

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
          className="text-xs font-medium text-amber-400 hover:text-amber-300"
        >
          ← My bookings
        </Link>

        {loading ? (
          <div className="mt-10 flex justify-center text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : error && !booking ? (
          <p className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : booking && !canClientModifyBooking(booking) ? (
          <p className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
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
