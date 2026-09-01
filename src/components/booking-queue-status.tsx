"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCurrentlyServingNumber,
  subscribeToTodayBookingsForQueue,
  type SavedBooking,
} from "@/lib/bookings";
import { toDateKey } from "@/lib/calendar-utils";

type Props = {
  userBooking?: SavedBooking | null;
};

export function BookingQueueStatus({ userBooking }: Props) {
  const [todayBookings, setTodayBookings] = useState<SavedBooking[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    return subscribeToTodayBookingsForQueue(setTodayBookings);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const serving = useMemo(
    () => getCurrentlyServingNumber(todayBookings),
    [todayBookings],
  );

  if (!userBooking || userBooking.status !== "confirmed") return null;
  if (userBooking.dateKey !== toDateKey(now)) return null;
  if (!userBooking.appointmentNumber) return null;

  const myNum = userBooking.appointmentNumber;
  const ahead =
    serving != null && myNum > serving ? myNum - serving - 1 : myNum - 1;

  const countdownMs = userBooking.noShowDeadlineAt
    ? Date.parse(userBooking.noShowDeadlineAt) - now.getTime()
    : null;

  return (
    <div className="mb-4 rounded-2xl border border-salon-gold/30 bg-salon-gold/10 px-4 py-3 text-sm text-salon-ink">
      <p className="font-semibold">
        Your appointment #{myNum}
        {userBooking.selectedTime ? ` · ${userBooking.selectedTime}` : ""}
      </p>
      {serving != null ? (
        <p className="mt-1 text-xs text-salon-muted">
          Now serving #{serving}
          {ahead > 0
            ? ` · ~${ahead} ahead of you`
            : myNum === serving + 1
              ? " · You're next — please arrive within 15 minutes"
              : myNum <= serving
                ? " · Your slot time — please check in at the salon"
                : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-salon-muted">
          Queue updates when the salon starts completing appointments today.
        </p>
      )}
      {countdownMs != null && countdownMs > 0 ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          Arrive within {formatCountdown(countdownMs)} or your booking may be
          auto-cancelled.
        </p>
      ) : null}
      {userBooking.checkedInAt ? (
        <p className="mt-1 text-xs font-medium text-emerald-700">Checked in</p>
      ) : null}
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
