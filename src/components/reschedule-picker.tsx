"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  subscribeToBuffers,
  subscribeToClosedDays,
} from "@/lib/calendar";
import {
  filterAvailableSlots,
  generateTimeSlots,
  toDateKey,
} from "@/lib/calendar-utils";
import {
  subscribeToConfirmedBookings,
  formatBookingServicesLabel,
  type SavedBooking,
} from "@/lib/bookings";
import {
  DEFAULT_BUSINESS_HOURS,
  effectiveCleanupPaddingMinutes,
  subscribeToBusinessHours,
  type BusinessHours,
} from "@/lib/settings";
import type { ClosedDay, TimeBuffer } from "@/types/calendar";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type ReschedulePickerProps = {
  booking: SavedBooking;
  busy?: boolean;
  onConfirm: (selectedDate: Date, selectedTime: string) => void;
  onCancel: () => void;
};

export function ReschedulePicker({
  booking,
  busy = false,
  onConfirm,
  onCancel,
}: ReschedulePickerProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    ...DEFAULT_BUSINESS_HOURS,
  });
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [buffers, setBuffers] = useState<TimeBuffer[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<SavedBooking[]>(
    [],
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => subscribeToBusinessHours(setBusinessHours), []);
  useEffect(() => subscribeToClosedDays(setClosedDays), []);
  useEffect(() => subscribeToBuffers(setBuffers), []);
  useEffect(() => subscribeToConfirmedBookings(setConfirmedBookings), []);

  const today = startOfDay(new Date());
  const closedDateKeys = useMemo(
    () => new Set(closedDays.map((d) => d.dateKey).filter(Boolean)),
    [closedDays],
  );

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [monthCursor]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    const serviceMinutes = booking.duration || 30;
    const padding = effectiveCleanupPaddingMinutes(
      selectedDate,
      businessHours.cleanupPadding,
    );
    const durationMinutes = serviceMinutes + padding;
    const slots = generateTimeSlots(
      businessHours.openTime,
      businessHours.closeTime,
      {
        durationMinutes,
        intervalMinutes: businessHours.slotIntervalMinutes,
      },
    );
    const others = confirmedBookings.filter((b) => b.id !== booking.id);
    return filterAvailableSlots(slots, {
      dateKey: toDateKey(selectedDate),
      durationMinutes,
      bookingPaddingMinutes: padding,
      buffers,
      bookings: others,
      now: new Date(nowTick),
    });
  }, [
    selectedDate,
    businessHours,
    booking.duration,
    booking.id,
    buffers,
    confirmedBookings,
    nowTick,
  ]);

  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot]);

  function selectDate(day: Date) {
    if (isBefore(day, today)) return;
    if (closedDateKeys.has(toDateKey(day))) return;
    setSelectedDate(day);
    setSelectedSlot(null);
  }

  const canSave = Boolean(selectedDate && selectedSlot) && !busy;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-salon-ink">
          Reschedule {formatBookingServicesLabel(booking)}
        </p>
        <p className="mt-1 text-xs text-salon-muted">
          Total visit time: {booking.duration} mins. Pick a new date and time.
          Closed days, buffers, and taken slots are hidden.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-salon-beige/35 bg-salon-surface p-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonthCursor((m) => addMonths(m, -1))}
            disabled={isSameMonth(monthCursor, today) || busy}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-salon-muted hover:bg-salon-surface disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-salon-ink">
            {format(monthCursor, "MMMM yyyy")}
          </p>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonthCursor((m) => addMonths(m, 1))}
            disabled={busy}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-salon-muted hover:bg-salon-surface disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[11px] font-medium text-salon-muted"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day) => {
            const inMonth = isSameMonth(day, monthCursor);
            const past = isBefore(day, today);
            const closed = closedDateKeys.has(toDateKey(day));
            const selected = selectedDate ? isSameDay(day, selectedDate) : false;
            const disabled = past || closed || !inMonth || busy;

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={disabled}
                onClick={() => selectDate(day)}
                className={`flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                  selected
                    ? "salon-gold-btn text-black"
                    : disabled
                      ? "text-salon-muted/40"
                      : "text-salon-ink hover:bg-salon-surface"
                }`}
              >
                {format(day, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-salon-muted">Available times</p>
          {availableSlots.length === 0 ? (
            <p className="rounded-xl border border-salon-beige/35 px-3 py-4 text-center text-xs text-salon-muted">
              No open slots on this day.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const selected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={busy}
                    onClick={() => setSelectedSlot(slot)}
                    className={`rounded-xl border px-2 py-2.5 text-center text-xs font-semibold sm:text-sm ${
                      selected
                        ? "border-salon-gold/50 salon-gold-btn text-black"
                        : "border-salon-beige/35 bg-salon-surface text-salon-ink hover:border-salon-gold/40"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="flex h-11 flex-1 items-center justify-center rounded-xl border border-salon-beige/40 text-sm font-semibold text-salon-muted disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={() => {
            if (!selectedDate || !selectedSlot) return;
            onConfirm(selectedDate, selectedSlot);
          }}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl salon-gold-btn text-sm font-bold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save new time
        </button>
      </div>
    </div>
  );
}
