"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  CalendarClock,
  Loader2,
  XCircle,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { ReschedulePicker } from "@/components/reschedule-picker";
import { useAuth, readRememberedGuestPhone } from "@/contexts/auth-context";
import { formatLkr } from "@/lib/booking/dummy-services";
import {
  CLIENT_MODIFY_CUTOFF_HOURS,
  canClientModifyBooking,
  getBookingStartDate,
  isUpcomingBooking,
} from "@/lib/booking-policy";
import {
  cancelBooking,
  clientOwnsBooking,
  rescheduleBooking,
  subscribeToClientBookings,
  type SavedBooking,
} from "@/lib/bookings";
import { toDateKey } from "@/lib/calendar-utils";
import { applyBookingCalendarSync } from "@/lib/request-calendar-sync";
import { getProfilePhone, normalizeMobile } from "@/lib/users";

export function MyBookingsPage() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] =
    useState<SavedBooking | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const profilePhone = getProfilePhone(profile);
    const remembered = readRememberedGuestPhone();
    const lookupPhone =
      profilePhone ||
      (remembered
        ? remembered.startsWith("+")
          ? remembered
          : normalizeMobile(remembered)
        : "");
    return subscribeToClientBookings(
      user.uid,
      lookupPhone || undefined,
      (next) => {
        setBookings(next);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, [user, profile]);

  const { upcoming, past } = useMemo(() => {
    const up: SavedBooking[] = [];
    const pa: SavedBooking[] = [];
    for (const booking of bookings) {
      if (isUpcomingBooking(booking, nowTick)) up.push(booking);
      else pa.push(booking);
    }
    return { upcoming: up, past: pa };
  }, [bookings, nowTick]);

  async function handleCancel(booking: SavedBooking) {
    if (!canClientModifyBooking(booking, nowTick)) return;
    if (
      !window.confirm(
        `Cancel ${booking.serviceName} on ${formatBookingWhen(booking)}?`,
      )
    ) {
      return;
    }

    setActionId(booking.id);
    setError(null);
    try {
      await cancelBooking(booking.id);
      void applyBookingCalendarSync("delete", {
        ...booking,
        status: "cancelled",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not cancel booking.",
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleRescheduleConfirm(
    selectedDate: Date,
    selectedTime: string,
  ) {
    if (!rescheduleTarget) return;
    if (!canClientModifyBooking(rescheduleTarget, nowTick)) {
      setError(
        `Cannot be modified within ${CLIENT_MODIFY_CUTOFF_HOURS} hours of the appointment.`,
      );
      setRescheduleTarget(null);
      return;
    }

    setActionId(rescheduleTarget.id);
    setError(null);
    try {
      await rescheduleBooking(rescheduleTarget.id, {
        selectedDate,
        selectedTime,
      });
      const updated: SavedBooking = {
        ...rescheduleTarget,
        selectedDate: selectedDate.toISOString(),
        selectedTime,
        dateKey: toDateKey(selectedDate),
        status: "confirmed",
      };
      void applyBookingCalendarSync("update", updated);
      setRescheduleTarget(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not reschedule booking.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <AuthGuard>
      <section className="relative flex flex-1 flex-col overflow-hidden bg-salon-bg px-4 pb-10 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-salon-gold/10 via-salon-bg to-salon-bg" />

        <div className="relative z-10 mx-auto w-full max-w-lg">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-salon-ink sm:text-2xl">
                My bookings
              </h1>
              <p className="mt-1 text-xs text-salon-muted sm:text-sm">
                Cancel or reschedule with at least{" "}
                {CLIENT_MODIFY_CUTOFF_HOURS} hours&apos; notice.
              </p>
            </div>
            <Link
              href="/booking"
              className="shrink-0 rounded-xl border border-salon-gold/25 px-3 py-2 text-xs font-semibold text-salon-gold"
            >
              New booking
            </Link>
          </div>

          {error ? (
            <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          {loading ? (
            <div className="flex justify-center gap-2 py-16 text-salon-muted">
              <Loader2 className="h-5 w-5 animate-spin text-salon-gold" />
              Loading…
            </div>
          ) : (
            <div className="space-y-8">
              <BookingSection
                title="Upcoming"
                empty="No upcoming appointments."
                bookings={upcoming}
                now={nowTick}
                actionId={actionId}
                onCancel={handleCancel}
                onReschedule={setRescheduleTarget}
              />
              <BookingSection
                title="Past"
                empty="No past bookings yet."
                bookings={past}
                now={nowTick}
                actionId={actionId}
                past
              />
            </div>
          )}
        </div>

        {rescheduleTarget ? (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label="Close"
              className="absolute inset-0"
              disabled={actionId === rescheduleTarget.id}
              onClick={() => setRescheduleTarget(null)}
            />
            <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-salon-gold/25 bg-salon-white p-5 shadow-2xl">
              <ReschedulePicker
                booking={rescheduleTarget}
                busy={actionId === rescheduleTarget.id}
                onCancel={() => setRescheduleTarget(null)}
                onConfirm={handleRescheduleConfirm}
              />
            </div>
          </div>
        ) : null}
      </section>
    </AuthGuard>
  );
}

function BookingSection({
  title,
  empty,
  bookings,
  now,
  actionId,
  onCancel,
  onReschedule,
  past = false,
}: {
  title: string;
  empty: string;
  bookings: SavedBooking[];
  now: Date;
  actionId: string | null;
  onCancel?: (booking: SavedBooking) => void;
  onReschedule?: (booking: SavedBooking) => void;
  past?: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-salon-ink">{title}</h2>
      {bookings.length === 0 ? (
        <p className="rounded-2xl border border-salon-gold/15 bg-salon-surface/40 px-4 py-8 text-center text-sm text-salon-muted">
          {empty}
        </p>
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              now={now}
              busy={actionId === booking.id}
              past={past}
              onCancel={onCancel}
              onReschedule={onReschedule}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function BookingCard({
  booking,
  now,
  busy,
  past,
  onCancel,
  onReschedule,
}: {
  booking: SavedBooking;
  now: Date;
  busy: boolean;
  past: boolean;
  onCancel?: (booking: SavedBooking) => void;
  onReschedule?: (booking: SavedBooking) => void;
}) {
  const canModify =
    !past &&
    booking.status === "confirmed" &&
    canClientModifyBooking(booking, now);
  const showCutoffNote =
    !past && booking.status === "confirmed" && !canModify;

  return (
    <li className="rounded-2xl border border-salon-gold/15 bg-salon-surface/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-salon-ink">{booking.serviceName}</p>
          <p className="mt-1 text-xs text-salon-muted">
            {formatBookingWhen(booking)}
          </p>
          <p className="mt-1 text-xs text-salon-muted">
            {booking.duration} mins · {formatLkr(booking.price)}
          </p>
        </div>
        <StatusPill status={booking.status} />
      </div>

      {!past && booking.status === "confirmed" ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!canModify || busy}
              onClick={() => onReschedule?.(booking)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-salon-gold/15 px-3 py-2 text-xs font-semibold text-salon-gold transition hover:bg-salon-gold/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarClock className="h-3.5 w-3.5" />
              )}
              Reschedule
            </button>
            <button
              type="button"
              disabled={!canModify || busy}
              onClick={() => onCancel?.(booking)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              Cancel
            </button>
          </div>
          {showCutoffNote ? (
            <p className="text-[11px] text-salon-muted">
              Cannot be modified within {CLIENT_MODIFY_CUTOFF_HOURS} hours of
              the appointment.
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function formatBookingWhen(booking: SavedBooking): string {
  const start = getBookingStartDate(booking);
  if (start) {
    return `${format(start, "EEE, MMM d, yyyy")} · ${booking.selectedTime}`;
  }
  return `${booking.dateKey || booking.selectedDate} · ${booking.selectedTime}`;
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "completed"
        ? "bg-sky-500/15 text-sky-300"
        : status === "cancelled"
          ? "bg-red-500/15 text-red-300"
          : "bg-salon-surface text-salon-gold";

  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}
    >
      {status}
    </span>
  );
}
