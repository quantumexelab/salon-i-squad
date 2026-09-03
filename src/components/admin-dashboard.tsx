"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { format, addDays, isValid, parseISO, parse } from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Loader2,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { formatLkr } from "@/lib/booking/dummy-services";
import { toDateKey } from "@/lib/calendar-utils";
import {
  cancelBookingWithReason,
  checkInBooking,
  completeBookingWithPayment,
  formatBookingServicesLabel,
  subscribeToAdminBookingsByDate,
  type PaymentMethod,
  type SavedBooking,
} from "@/lib/bookings";
import { applyBookingCalendarSync } from "@/lib/request-calendar-sync";
import {
  getProfilePhone,
  phoneDocId,
  subscribeToClientUsers,
  updateMemberProfileFields,
} from "@/lib/users";
import {
  bookingStatusMessage,
  buildWhatsAppUrl,
} from "@/lib/whatsapp";
import type { UserProfile } from "@/types/firestore";

function formatBookingDate(iso: string): string {
  const date = parseISO(iso);
  if (!isValid(date)) return iso || "—";
  return format(date, "EEE, MMM d, yyyy");
}

function formatDateKeyLabel(dateKey: string): string {
  const date = parse(dateKey, "yyyy-MM-dd", new Date());
  if (!isValid(date)) return dateKey;
  return format(date, "EEE, MMM d, yyyy");
}

export function AdminDashboard() {
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    toDateKey(new Date()),
  );
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<SavedBooking | null>(
    null,
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [hairType, setHairType] = useState("");
  const [conditions, setConditions] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [syncMemberProfile, setSyncMemberProfile] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<SavedBooking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [clients, setClients] = useState<UserProfile[]>([]);

  useEffect(() => {
    return subscribeToClientUsers(setClients);
  }, []);

  const memberLookup = useMemo(() => {
    const byUid = new Map<string, UserProfile>();
    const byPhone = new Map<string, UserProfile>();
    for (const c of clients) {
      byUid.set(c.uid, c);
      const phone = getProfilePhone(c);
      if (phone) byPhone.set(phoneDocId(phone), c);
    }
    return { byUid, byPhone };
  }, [clients]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAdminBookingsByDate(
      selectedDateKey,
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
  }, [selectedDateKey]);

  const isToday = selectedDateKey === toDateKey(new Date());

  function shiftSelectedDate(days: number) {
    const base = parse(selectedDateKey, "yyyy-MM-dd", new Date());
    if (!isValid(base)) return;
    setSelectedDateKey(toDateKey(addDays(base, days)));
  }

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

  async function handleCancelConfirm() {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setActionError("Cancel reason is required.");
      return;
    }

    setActionId(cancelTarget.id);
    setActionError(null);

    try {
      await cancelBookingWithReason(cancelTarget.id, {
        cancelReason: cancelReason.trim(),
        cancelledBy: "admin",
      });
      void applyBookingCalendarSync("delete", {
        ...cancelTarget,
        status: "cancelled",
      });
      setCancelTarget(null);
      setCancelReason("");
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

  async function handleCheckIn(bookingId: string) {
    setActionId(bookingId);
    try {
      await checkInBooking(bookingId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Check-in failed.");
    } finally {
      setActionId(null);
    }
  }

  async function handleConfirmComplete() {
    if (!completeTarget) return;

    setActionId(completeTarget.id);
    setActionError(null);

    try {
      await completeBookingWithPayment(completeTarget.id, {
        paymentMethod,
        hairType,
        conditions,
        adminNotes,
      });

      if (syncMemberProfile && completeTarget.userId) {
        const member = memberLookup.byUid.get(completeTarget.userId);
        if (member?.isMember) {
          await updateMemberProfileFields(completeTarget.userId, {
            hairType: hairType.trim(),
            conditions: conditions.trim(),
          });
        }
      }

      setCompleteTarget(null);
      setPaymentMethod("cash");
      setHairType("");
      setConditions("");
      setAdminNotes("");
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
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-salon-gold">
              Owner console
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-salon-ink">
              Bookings
            </h1>
            <p className="mt-2 max-w-xl text-sm text-salon-muted">
              Track appointments and tally expected vs realized income when you
              complete a visit.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-salon-beige/30 bg-salon-surface px-3 py-1.5 text-xs text-salon-muted">
            <RefreshCw className="h-3.5 w-3.5 text-salon-gold" />
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

        <section className="overflow-hidden rounded-2xl border border-salon-beige/30 bg-salon-surface">
          <div className="flex flex-col gap-3 border-b border-salon-beige/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-sm font-semibold text-salon-ink">
                Appointment list
              </h2>
              <p className="mt-0.5 text-xs text-salon-muted">
                {loading
                  ? "Loading…"
                  : `Showing ${formatDateKeyLabel(selectedDateKey)} · ${bookings.length} record${bookings.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => shiftSelectedDate(-1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-salon-beige/40 text-salon-muted transition hover:border-salon-gold/40 hover:text-salon-gold"
                aria-label="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <input
                type="date"
                value={selectedDateKey}
                onChange={(e) => setSelectedDateKey(e.target.value)}
                className="h-9 rounded-lg border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/50"
              />
              <button
                type="button"
                onClick={() => shiftSelectedDate(1)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-salon-beige/40 text-salon-muted transition hover:border-salon-gold/40 hover:text-salon-gold"
                aria-label="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={isToday}
                onClick={() => setSelectedDateKey(toDateKey(new Date()))}
                className="h-9 rounded-lg border border-salon-gold/30 px-3 text-xs font-semibold text-salon-gold transition hover:bg-salon-gold/10 disabled:cursor-default disabled:opacity-50"
              >
                Today
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-salon-muted">
              <Loader2 className="h-5 w-5 animate-spin text-salon-gold" />
              Loading bookings…
            </div>
          ) : error ? (
            <div className="px-4 py-10 text-center sm:px-6">
              <p className="text-sm text-red-300">{error}</p>
              <p className="mt-2 text-xs text-salon-ink0">
                If this is a permissions error, make sure Firestore rules allow
                signed-in reads on <code>bookings</code>, then refresh.
              </p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="px-4 py-16 text-center sm:px-6">
              <p className="text-sm font-medium text-salon-muted">
                No bookings on this day
              </p>
              <p className="mt-1 text-xs text-salon-ink0">
                Pick another date or wait for new appointments from /booking.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-salon-bg/60 text-xs uppercase tracking-wide text-salon-ink0">
                    <tr>
                      <th className="px-6 py-3 font-medium">#</th>
                      <th className="px-6 py-3 font-medium">Client</th>
                      <th className="px-6 py-3 font-medium">Gender</th>
                      <th className="px-6 py-3 font-medium">Service</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                      <th className="px-6 py-3 font-medium">Time</th>
                      <th className="px-6 py-3 font-medium">Price</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-salon-beige/30">
                    {bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="transition hover:bg-salon-surface"
                      >
                        <td className="px-6 py-4 font-semibold text-salon-gold">
                          {booking.appointmentNumber ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <ClientCell
                            booking={booking}
                            memberLookup={memberLookup}
                          />
                        </td>
                        <td className="px-6 py-4 text-salon-muted">
                          <GenderCell gender={booking.customerGender} />
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-salon-ink">
                            {formatBookingServicesLabel(booking)}
                          </p>
                          {booking.services && booking.services.length > 1 ? (
                            <p className="mt-0.5 text-xs text-salon-muted">
                              {booking.services
                                .map((service) => service.name)
                                .join(", ")}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-xs text-salon-ink0">
                            {booking.duration} mins
                          </p>
                        </td>
                        <td className="px-6 py-4 text-salon-muted">
                          {formatBookingDate(booking.selectedDate)}
                        </td>
                        <td className="px-6 py-4 text-salon-muted">
                          {booking.selectedTime}
                        </td>
                        <td className="px-6 py-4 font-medium text-salon-gold">
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
                              setHairType("");
                              setConditions("");
                              setAdminNotes("");
                              setCompleteTarget(booking);
                            }}
                            onCancel={() => {
                              setCancelReason("");
                              setCancelTarget(booking);
                            }}
                            onCheckIn={() => void handleCheckIn(booking.id)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-salon-beige/30 md:hidden">
                {bookings.map((booking) => (
                  <li key={booking.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-salon-ink">
                          {formatBookingServicesLabel(booking)}
                        </p>
                        <div className="mt-2">
                          <ClientCell
                            booking={booking}
                            memberLookup={memberLookup}
                          />
                        </div>
                        <p className="mt-1 text-xs text-salon-muted">
                          Gender:{" "}
                          <GenderCell gender={booking.customerGender} inline />
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-salon-muted">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          {formatBookingDate(booking.selectedDate)}
                        </p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-salon-muted">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {booking.selectedTime} · {booking.duration} mins
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-salon-gold">
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
                          setHairType("");
                          setConditions("");
                          setAdminNotes("");
                          setCompleteTarget(booking);
                        }}
                        onCancel={() => {
                          setCancelReason("");
                          setCancelTarget(booking);
                        }}
                        onCheckIn={() => void handleCheckIn(booking.id)}
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
            hairType={hairType}
            conditions={conditions}
            adminNotes={adminNotes}
            syncMemberProfile={syncMemberProfile}
            busy={actionId === completeTarget.id}
            onPaymentMethodChange={setPaymentMethod}
            onHairTypeChange={setHairType}
            onConditionsChange={setConditions}
            onAdminNotesChange={setAdminNotes}
            onSyncMemberProfileChange={setSyncMemberProfile}
            onCancel={() => {
              if (actionId) return;
              setCompleteTarget(null);
            }}
            onConfirm={handleConfirmComplete}
          />
        ) : null}

        {cancelTarget ? (
          <CancelReasonModal
            booking={cancelTarget}
            reason={cancelReason}
            busy={actionId === cancelTarget.id}
            onReasonChange={setCancelReason}
            onCancel={() => {
              if (actionId) return;
              setCancelTarget(null);
            }}
            onConfirm={handleCancelConfirm}
          />
        ) : null}
      </div>
    </AuthGuard>
  );
}

function CompletePaymentModal({
  booking,
  paymentMethod,
  hairType,
  conditions,
  adminNotes,
  syncMemberProfile,
  busy,
  onPaymentMethodChange,
  onHairTypeChange,
  onConditionsChange,
  onAdminNotesChange,
  onSyncMemberProfileChange,
  onCancel,
  onConfirm,
}: {
  booking: SavedBooking;
  paymentMethod: PaymentMethod;
  hairType: string;
  conditions: string;
  adminNotes: string;
  syncMemberProfile: boolean;
  busy: boolean;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onHairTypeChange: (value: string) => void;
  onConditionsChange: (value: string) => void;
  onAdminNotesChange: (value: string) => void;
  onSyncMemberProfileChange: (value: boolean) => void;
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
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-salon-beige/40 bg-salon-bg p-5 shadow-2xl">
        <h2
          id="complete-payment-title"
          className="text-lg font-semibold text-salon-ink"
        >
          Complete booking
        </h2>
        <p className="mt-2 text-sm text-salon-muted">
          {client} · {booking.serviceName} · {formatLkr(booking.price)}
        </p>
        <p className="mt-1 text-xs text-salon-ink0">
          How did the client pay?
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onPaymentMethodChange("cash")}
            className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
              paymentMethod === "cash"
                ? "border-salon-gold/50 bg-salon-gold/15 text-salon-gold"
                : "border-salon-beige/40 bg-salon-surface text-salon-muted hover:border-salon-gold/40"
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
                ? "border-salon-gold/50 bg-salon-gold/15 text-salon-gold"
                : "border-salon-beige/40 bg-salon-surface text-salon-muted hover:border-salon-gold/40"
            }`}
          >
            Card
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          <input
            placeholder="Hair type"
            value={hairType}
            disabled={busy}
            onChange={(e) => onHairTypeChange(e.target.value)}
            className="h-10 rounded-xl border border-salon-beige/40 bg-salon-surface px-3 text-sm"
          />
          <textarea
            placeholder="Conditions / allergies"
            value={conditions}
            disabled={busy}
            onChange={(e) => onConditionsChange(e.target.value)}
            rows={2}
            className="rounded-xl border border-salon-beige/40 bg-salon-surface px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Admin notes"
            value={adminNotes}
            disabled={busy}
            onChange={(e) => onAdminNotesChange(e.target.value)}
            rows={2}
            className="rounded-xl border border-salon-beige/40 bg-salon-surface px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs text-salon-muted">
            <input
              type="checkbox"
              checked={syncMemberProfile}
              onChange={(e) => onSyncMemberProfileChange(e.target.checked)}
            />
            Save hair type & conditions to member profile
          </label>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-salon-beige/40 text-sm font-semibold text-salon-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 salon-gold-btn rounded-xl text-sm font-bold text-black disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function CancelReasonModal({
  booking,
  reason,
  busy,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  booking: SavedBooking;
  reason: string;
  busy: boolean;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-salon-beige/40 bg-salon-bg p-5">
        <h2 className="text-lg font-semibold text-salon-ink">Cancel booking</h2>
        <p className="mt-2 text-sm text-salon-muted">
          #{booking.appointmentNumber ?? "—"} · {booking.serviceName}
        </p>
        <textarea
          required
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Reason (sent to client notification)"
          rows={3}
          className="mt-4 w-full rounded-xl border border-salon-beige/40 bg-salon-surface px-3 py-2 text-sm"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-11 flex-1 rounded-xl border border-salon-beige/40 text-sm"
          >
            Back
          </button>
          <button
            type="button"
            disabled={busy || !reason.trim()}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-xl bg-red-500/20 text-sm font-semibold text-red-300"
          >
            Confirm cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function GenderCell({
  gender,
  inline = false,
}: {
  gender?: SavedBooking["customerGender"];
  inline?: boolean;
}) {
  if (gender === "male") {
    return (
      <span
        className={`inline-flex rounded-full border border-salon-gold/35 bg-salon-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-salon-gold ${inline ? "" : ""}`}
      >
        Male
      </span>
    );
  }

  if (gender === "female") {
    return (
      <span className="inline-flex rounded-full border border-salon-beige/50 bg-salon-surface px-2.5 py-0.5 text-[11px] font-semibold text-salon-ink">
        Female
      </span>
    );
  }

  if (inline) {
    return <span className="font-medium text-salon-muted">—</span>;
  }

  return (
    <span className="inline-flex rounded-full border border-salon-beige/30 bg-salon-bg/60 px-2.5 py-0.5 text-[11px] font-medium text-salon-muted">
      —
    </span>
  );
}

function ClientCell({
  booking,
  memberLookup,
}: {
  booking: SavedBooking;
  memberLookup: {
    byUid: Map<string, UserProfile>;
    byPhone: Map<string, UserProfile>;
  };
}) {
  const name = booking.customerName?.trim() || "Client";
  const email = booking.customerEmail?.trim();
  const phone = booking.phoneNumber?.trim();
  const member =
    memberLookup.byUid.get(booking.userId) ??
    (phone ? memberLookup.byPhone.get(phoneDocId(phone)) : undefined);

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 font-medium text-salon-ink">{name}</p>
        {member?.isMember ? (
          <span className="rounded-full bg-salon-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-salon-gold">
            Member
          </span>
        ) : null}
      </div>
      {email ? (
        <p className="mt-0.5 truncate text-xs text-salon-ink0">{email}</p>
      ) : null}
      <p className="mt-0.5 text-xs text-salon-gold/90">{phone || "No phone"}</p>
    </div>
  );
}

function BookingActions({
  booking,
  busy,
  onComplete,
  onCancel,
  onCheckIn,
}: {
  booking: SavedBooking;
  busy: boolean;
  onComplete: () => void;
  onCancel: () => void;
  onCheckIn: () => void;
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#25D366]/15 px-3 py-2 text-xs font-semibold text-[#25D366] transition hover:bg-[#25D366]/25"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </a>
      ) : (
        <span
          title="No phone number on this booking"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-salon-surface px-3 py-2 text-xs font-semibold text-salon-ink0"
        >
          <WhatsAppIcon className="h-3.5 w-3.5" />
          WhatsApp
        </span>
      )}

      {booking.status === "confirmed" ? (
        <>
          {!booking.checkedInAt ? (
            <button
              type="button"
              disabled={busy}
              onClick={onCheckIn}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300"
            >
              Check in
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={onComplete}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="rounded-2xl border border-salon-beige/30 bg-salon-surface px-4 py-4">
      <div className="flex items-center gap-2 text-salon-muted">
        <span className="text-salon-gold">{icon}</span>
        <p className="text-xs font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-salon-ink">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-salon-ink0">{hint}</p> : null}
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
          : "bg-salon-surface text-salon-muted";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${styles}`}
      >
        {status || "unknown"}
      </span>
      {status === "completed" && booking.paymentMethod ? (
        <span className="text-[10px] font-medium uppercase tracking-wide text-salon-ink0">
          {booking.paymentMethod}
        </span>
      ) : null}
    </span>
  );
}
