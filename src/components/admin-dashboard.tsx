"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarDays,
  Check,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { formatLkr } from "@/lib/booking/dummy-services";
import {
  completeBookingWithPayment,
  subscribeToBookings,
  updateBookingStatus,
  type PaymentMethod,
  type SavedBooking,
} from "@/lib/bookings";
import {
  bookingStatusMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";

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
  const [completeTarget, setCompleteTarget] = useState<SavedBooking | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

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
    const completed = bookings.filter((b) => b.status === "completed");

    const expectedIncome = confirmed.reduce(
      (sum, b) => sum + (b.price || 0),
      0,
    );
    const realizedIncome = completed.reduce(
      (sum, b) => sum + (b.price || 0),
      0,
    );
    const cashTotal = completed
      .filter((b) => b.paymentMethod === "cash")
      .reduce((sum, b) => sum + (b.price || 0), 0);
    const cardTotal = completed
      .filter((b) => b.paymentMethod === "card")
      .reduce((sum, b) => sum + (b.price || 0), 0);

    return {
      confirmedCount: confirmed.length,
      expectedIncome,
      realizedIncome,
      cashTotal,
      cardTotal,
    };
  }, [bookings]);

  async function handleCancel(bookingId: string) {
    setActionId(bookingId);
    setActionError(null);

    try {
      await updateBookingStatus(bookingId, "cancelled");
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

  async function handleConfirmComplete() {
    if (!completeTarget) return;

    setActionId(completeTarget.id);
    setActionError(null);

    try {
      await completeBookingWithPayment(completeTarget.id, paymentMethod);
      setCompleteTarget(null);
      setPaymentMethod("cash");
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Could not complete booking. Try again.",
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
              Track appointments and tally expected vs realized income when you
              complete a visit.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-400">
            <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
            Real-time Firestore sync
          </div>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="Confirmed"
            value={String(stats.confirmedCount)}
            icon={<CalendarDays className="h-4 w-4" />}
            hint="Open appointments"
          />
          <StatCard
            label="Expected income"
            value={formatLkr(stats.expectedIncome)}
            icon={<Wallet className="h-4 w-4" />}
            hint="Sum of confirmed bookings"
          />
          <StatCard
            label="Realized income"
            value={formatLkr(stats.realizedIncome)}
            icon={<CreditCard className="h-4 w-4" />}
            hint={
              stats.realizedIncome > 0
                ? `Cash ${formatLkr(stats.cashTotal)} · Card ${formatLkr(stats.cardTotal)}`
                : "Completed bookings"
            }
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
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/60 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-6 py-3 font-medium">Client</th>
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
                          <ClientCell booking={booking} />
                        </td>
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
                          <StatusPill booking={booking} />
                        </td>
                        <td className="px-6 py-4">
                          <BookingActions
                            booking={booking}
                            busy={actionId === booking.id}
                            onComplete={() => {
                              setPaymentMethod("cash");
                              setCompleteTarget(booking);
                            }}
                            onCancel={() => handleCancel(booking.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-zinc-800 md:hidden">
                {bookings.map((booking) => (
                  <li key={booking.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">
                          {booking.serviceName}
                        </p>
                        <div className="mt-2">
                          <ClientCell booking={booking} />
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
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
                          <StatusPill booking={booking} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <BookingActions
                        booking={booking}
                        busy={actionId === booking.id}
                        onComplete={() => {
                          setPaymentMethod("cash");
                          setCompleteTarget(booking);
                        }}
                        onCancel={() => handleCancel(booking.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {completeTarget ? (
          <CompletePaymentModal
            booking={completeTarget}
            paymentMethod={paymentMethod}
            busy={actionId === completeTarget.id}
            onPaymentMethodChange={setPaymentMethod}
            onCancel={() => {
              if (actionId) return;
              setCompleteTarget(null);
            }}
            onConfirm={handleConfirmComplete}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}

function CompletePaymentModal({
  booking,
  paymentMethod,
  busy,
  onPaymentMethodChange,
  onCancel,
  onConfirm,
}: {
  booking: SavedBooking;
  paymentMethod: PaymentMethod;
  busy: boolean;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const client = booking.customerName?.trim() || "Client";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-payment-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default"
        disabled={busy}
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl">
        <h2
          id="complete-payment-title"
          className="text-lg font-semibold text-white"
        >
          Complete booking
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          {client} · {booking.serviceName} · {formatLkr(booking.price)}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          How did the client pay?
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onPaymentMethodChange("cash")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              paymentMethod === "cash"
                ? "border-amber-500/50 bg-amber-400/15 text-amber-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            Cash
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onPaymentMethodChange("card")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              paymentMethod === "card"
                ? "border-amber-500/50 bg-amber-400/15 text-amber-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-500"
            }`}
          >
            Card
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-zinc-700 text-sm font-semibold text-zinc-300 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientCell({ booking }: { booking: SavedBooking }) {
  const name = booking.customerName?.trim() || "Client";
  const email = booking.customerEmail?.trim();
  const phone = booking.phoneNumber?.trim();

  return (
    <div>
      <p className="font-medium text-white">{name}</p>
      {email ? (
        <p className="mt-0.5 text-xs text-zinc-500">{email}</p>
      ) : null}
      <p className="mt-0.5 text-xs text-amber-300/90">{phone || "No phone"}</p>
    </div>
  );
}

function BookingActions({
  booking,
  busy,
  onComplete,
  onCancel,
}: {
  booking: SavedBooking;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const whatsappUrl = booking.phoneNumber
    ? buildWhatsAppUrl(booking.phoneNumber, bookingStatusMessage(booking))
    : null;

  return (
    <div className="flex flex-wrap gap-2">
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-3 py-2 text-xs font-semibold text-[#25D366] transition hover:bg-[#25D366]/25"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      ) : (
        <span
          title="No phone number on this booking"
          className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-500"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </span>
      )}

      {booking.status === "confirmed" ? (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={onComplete}
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
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Cancel
          </button>
        </>
      ) : null}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
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
      {hint ? <p className="mt-1.5 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function StatusPill({ booking }: { booking: SavedBooking }) {
  const status = booking.status;
  const styles =
    status === "confirmed"
      ? "bg-emerald-500/15 text-emerald-300"
      : status === "completed"
        ? "bg-sky-500/15 text-sky-300"
        : status === "cancelled"
          ? "bg-red-500/15 text-red-300"
          : "bg-zinc-800 text-zinc-300";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}
      >
        {status || "unknown"}
      </span>
      {status === "completed" && booking.paymentMethod ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {booking.paymentMethod}
        </span>
      ) : null}
    </span>
  );
}
