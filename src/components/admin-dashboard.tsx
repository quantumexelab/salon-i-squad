"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  Clock,
  Loader2,
  RefreshCw,
  Scissors,
  Wallet,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { formatLkr } from "@/lib/booking/dummy-services";
import {
  subscribeToBookings,
  updateBookingStatus,
  type BookingStatusUpdate,
  type SavedBooking,
} from "@/lib/bookings";

function formatBookingDate(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso || "—";
  return format(date, "EEE, MMM d, yyyy");
}

export function AdminDashboard() {
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToBookings(
      (next) => {
        setBookings(next);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const revenue = confirmed.reduce((sum, b) => sum + (b.price || 0), 0);
    return {
      total: bookings.length,
      confirmed: confirmed.length,
      revenue,
    };
  }, [bookings]);

  async function handleStatusUpdate(
    bookingId: string,
    status: BookingStatusUpdate,
  ) {
    setActionId(bookingId);
    setActionError(null);

    try {
      await updateBookingStatus(bookingId, status);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not update booking status. Try again.",
      );
    } finally {
      setActionId(null);
    }
  }

  return (
    <AuthGuard>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
              Owner console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Bookings
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              Live appointments from the client PWA. Newest upcoming bookings
              appear first.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-400">
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            Real-time Firestore sync
          </div>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Total bookings"
            value={String(stats.total)}
            icon={<CalendarDays className="h-4 w-4" />}
          />
          <StatCard
            label="Confirmed"
            value={String(stats.confirmed)}
            icon={<Scissors className="h-4 w-4" />}
          />
          <StatCard
            label="Booked value"
            value={formatLkr(stats.revenue)}
            icon={<Wallet className="h-4 w-4" />}
          />
        </div>

        {actionError ? (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {actionError}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6">
            <h2 className="text-sm font-semibold text-white">Appointment list</h2>
            <span className="text-xs text-zinc-500">
              {loading ? "Loading…" : `${bookings.length} records`}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              Loading bookings…
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center sm:px-6">
              <p className="text-sm text-red-300">{error}</p>
              <p className="mt-2 text-xs text-zinc-500">
                If this is a permissions error, make sure Firestore rules allow
                signed-in reads on <code>bookings</code>, then refresh.
              </p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-4 py-16 text-center sm:px-6">
              <p className="text-sm font-medium text-zinc-300">No bookings yet</p>
              <p className="mt-1 text-xs text-zinc-500">
                New appointments from /booking will appear here automatically.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Service</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Time</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="transition hover:bg-zinc-900/80"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">
                            {booking.serviceName}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {booking.duration} mins
                          </p>
                        </td>
                        <td className="px-6 py-4 text-zinc-300">
                          {formatBookingDate(booking.selectedDate)}
                        </td>
                        <td className="px-6 py-4 text-zinc-300">
                          {booking.selectedTime}
                        </td>
                        <td className="px-6 py-4 font-medium text-amber-400">
                          {formatLkr(booking.price)}
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={booking.status} />
                        </td>
                        <td className="px-6 py-4">
                          <BookingActions
                            booking={booking}
                            busy={actionId === booking.id}
                            onUpdate={handleStatusUpdate}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-zinc-800 md:hidden">
                {bookings.map((booking) => (
                  <li key={booking.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {booking.serviceName}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {formatBookingDate(booking.selectedDate)}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock className="h-3.5 w-3.5" />
                          {booking.selectedTime} · {booking.duration} mins
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-400">
                          {formatLkr(booking.price)}
                        </p>
                        <div className="mt-2 flex justify-end">
                          <StatusPill status={booking.status} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <BookingActions
                        booking={booking}
                        busy={actionId === booking.id}
                        onUpdate={handleStatusUpdate}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}

function BookingActions({
  booking,
  busy,
  onUpdate,
}: {
  booking: SavedBooking;
  busy: boolean;
  onUpdate: (bookingId: string, status: BookingStatusUpdate) => Promise<void>;
}) {
  if (booking.status !== "confirmed") {
    return (
      <p className="text-xs text-zinc-500">
        No further actions
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() => onUpdate(booking.id, "completed")}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        Complete
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onUpdate(booking.id, "cancelled")}
        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <X className="h-3.5 w-3.5" />
        )}
        Cancel
      </button>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
      <div className="flex items-center gap-2 text-zinc-400">
        <span className="text-amber-400">{icon}</span>
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "completed"
        ? "bg-sky-500/15 text-sky-300"
        : status === "cancelled"
          ? "bg-red-500/15 text-red-300"
          : "bg-zinc-800 text-zinc-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}
    >
      {status || "unknown"}
    </span>
  );
}
