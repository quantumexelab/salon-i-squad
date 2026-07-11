"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Phone,
  Scissors,
} from "lucide-react";
import { formatLkr } from "@/lib/booking/dummy-services";
import {
  createBooking,
  subscribeToConfirmedBookings,
  type SavedBooking,
} from "@/lib/bookings";
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
  DEFAULT_BUSINESS_HOURS,
  effectiveCleanupPaddingMinutes,
  subscribeToBusinessHours,
  type BusinessHours,
} from "@/lib/settings";
import {
  CONSULTATION_DURATION_MINUTES,
  getBookableDurationMinutes,
  getBookableServiceLabel,
  subscribeToServices,
} from "@/lib/services";
import {
  getProfilePhone,
  isValidMobile,
  updateUserPhoneNumber,
} from "@/lib/users";
import { useAuth } from "@/contexts/auth-context";
import type { ClosedDay, TimeBuffer } from "@/types/calendar";
import type { Service } from "@/types/firestore";

type Step = "service" | "date" | "time";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function BookingFlow() {
  const { user, profile, refreshProfile } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [businessHours, setBusinessHours] = useState<BusinessHours>({
    ...DEFAULT_BUSINESS_HOURS,
  });
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([]);
  const [buffers, setBuffers] = useState<TimeBuffer[]>([]);
  const [confirmedBookings, setConfirmedBookings] = useState<SavedBooking[]>(
    [],
  );
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [phoneInput, setPhoneInput] = useState("");
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToServices(
      (next) => {
        setServices(next);
        setServicesLoading(false);
        setServicesError(null);
      },
      (err) => {
        setServicesError(err.message);
        setServicesLoading(false);
      },
      { activeOnly: true },
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    return subscribeToBusinessHours(setBusinessHours);
  }, []);

  useEffect(() => {
    return subscribeToClosedDays(setClosedDays);
  }, []);

  useEffect(() => {
    return subscribeToBuffers(setBuffers);
  }, []);

  useEffect(() => {
    if (!user) {
      setConfirmedBookings([]);
      return;
    }
    return subscribeToConfirmedBookings(setConfirmedBookings);
  }, [user]);

  const today = startOfDay(new Date());

  const closedDateKeys = useMemo(
    () => new Set(closedDays.map((d) => d.dateKey).filter(Boolean)),
    [closedDays],
  );

  const step: Step = !selectedService
    ? "service"
    : !selectedDate
      ? "date"
      : "time";

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [monthCursor]);

  const bookableDuration = selectedService
    ? getBookableDurationMinutes(selectedService)
    : 0;
  const needsConsultation = Boolean(selectedService?.requiresConsultation);

  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return [];
    const serviceMinutes = getBookableDurationMinutes(selectedService);
    const padding = effectiveCleanupPaddingMinutes(
      selectedDate,
      businessHours.cleanupPadding,
    );
    const durationMinutes = serviceMinutes + padding;
    const slots = generateTimeSlots(
      businessHours.openTime,
      businessHours.closeTime,
      { durationMinutes },
    );
    return filterAvailableSlots(slots, {
      dateKey: toDateKey(selectedDate),
      durationMinutes,
      bookingPaddingMinutes: padding,
      buffers,
      bookings: confirmedBookings,
    });
  }, [
    selectedService,
    selectedDate,
    businessHours,
    buffers,
    confirmedBookings,
  ]);

  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot]);

  function resetBooking() {
    setSelectedService(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setMonthCursor(startOfMonth(new Date()));
    setError(null);
  }

  function selectService(service: Service) {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setError(null);
    setSuccessMessage(null);
  }

  function selectDate(day: Date) {
    if (isBefore(day, today)) return;
    if (closedDateKeys.has(toDateKey(day))) return;
    setSelectedDate(day);
    setSelectedSlot(null);
    setError(null);
    setSuccessMessage(null);
  }

  function resetFrom(stepToReset: Step) {
    if (stepToReset === "service") {
      setSelectedService(null);
      setSelectedDate(null);
      setSelectedSlot(null);
      return;
    }
    if (stepToReset === "date") {
      setSelectedDate(null);
      setSelectedSlot(null);
    }
  }

  const profilePhone = getProfilePhone(profile);
  const needsPhone = Boolean(user && !profilePhone);
  const resolvedPhone = profilePhone || phoneInput.trim();

  const hasSelection = Boolean(
    selectedService && selectedDate && selectedSlot && user,
  );
  const canConfirm =
    hasSelection &&
    !saving &&
    Boolean(resolvedPhone) &&
    (!needsPhone || isValidMobile(phoneInput));

  async function handleConfirmBooking() {
    if (!user || !selectedService || !selectedDate || !selectedSlot) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let phoneNumber = profilePhone;
      if (!phoneNumber) {
        if (!isValidMobile(phoneInput)) {
          throw new Error("Please enter a valid phone number.");
        }
        phoneNumber = await updateUserPhoneNumber(user.uid, phoneInput);
        await refreshProfile();
        setPhoneInput("");
      }

      const customerName = profile
        ? `${profile.firstName} ${profile.lastName}`.trim()
        : user.displayName ?? "";

      const booking = await createBooking({
        userId: user.uid,
        service: {
          id: selectedService.id,
          name: getBookableServiceLabel(selectedService),
          durationMinutes: getBookableDurationMinutes(selectedService),
          price: selectedService.price,
        },
        selectedDate,
        selectedTime: selectedSlot,
        phoneNumber,
        customerName: customerName || undefined,
        customerEmail: profile?.email ?? user.email ?? undefined,
        isConsultation: selectedService.requiresConsultation,
        notes: selectedService.requiresConsultation
          ? `Prior consultation for ${selectedService.name} (full service ${selectedService.durationMinutes} mins).`
          : undefined,
      });

      setSuccessMessage(
        `Booked ${booking.serviceName} on ${format(selectedDate, "MMM d")} at ${selectedSlot}.`,
      );
      resetBooking();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save booking. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-lg flex-col gap-5 ${
        needsPhone ? "pb-36" : "pb-28"
      }`}
    >
      <StepHeader step={step} />

      {successMessage ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {successMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <SectionLabel
          icon={<Scissors className="h-3.5 w-3.5" />}
          title="Choose a service"
          action={
            selectedService ? (
              <button
                type="button"
                onClick={() => resetFrom("service")}
                className="text-xs font-medium text-amber-400"
              >
                Change
              </button>
            ) : null
          }
        />

        {selectedService && step !== "service" ? (
          <SelectedSummary
            title={getBookableServiceLabel(selectedService)}
            subtitle={
              needsConsultation
                ? `${CONSULTATION_DURATION_MINUTES} min consultation · ${formatLkr(selectedService.price)}`
                : `${selectedService.durationMinutes} min · ${formatLkr(selectedService.price)}`
            }
          />
        ) : servicesLoading ? (
          <ServiceListSkeleton />
        ) : servicesError ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {servicesError}
          </p>
        ) : services.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
            No services available yet. Ask the salon to add offerings in Admin →
            Services.
          </p>
        ) : (
          <ul className="grid gap-3">
            {services.map((service) => {
              const selected = selectedService?.id === service.id;
              return (
                <li key={service.id}>
                  <button
                    type="button"
                    onClick={() => selectService(service)}
                    disabled={saving}
                    className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:scale-[0.99] disabled:opacity-60 ${
                      selected
                        ? "border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/30"
                        : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 hover:bg-zinc-900"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        selected
                          ? "border-amber-400 bg-amber-400 text-zinc-950"
                          : "border-zinc-600"
                      }`}
                    >
                      {selected ? (
                        <Check className="h-3 w-3" strokeWidth={3} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-semibold text-white">
                          {service.name}
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-amber-400">
                          {formatLkr(service.price)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-400">
                        {service.description || "Salon service"}
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[11px] text-zinc-300">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          {service.requiresConsultation
                            ? `${CONSULTATION_DURATION_MINUTES} min consult`
                            : `${service.durationMinutes} mins`}
                        </span>
                        {service.requiresConsultation ? (
                          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                            Consultation first
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedService ? (
        <section className="space-y-3">
          {needsConsultation ? (
            <div
              role="status"
              className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
            >
              This complex service requires a prior consultation. You are
              booking a {CONSULTATION_DURATION_MINUTES}-minute consultation
              session first.
            </div>
          ) : null}
          <SectionLabel
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            title="Pick a date"
            action={
              selectedDate ? (
                <button
                  type="button"
                  onClick={() => resetFrom("date")}
                  className="text-xs font-medium text-amber-400"
                >
                  Change
                </button>
              ) : null
            }
          />

          {selectedDate && step === "time" ? (
            <SelectedSummary
              title={format(selectedDate, "EEEE, MMM d")}
              subtitle={format(selectedDate, "yyyy")}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setMonthCursor((m) => addMonths(m, -1))}
                  disabled={isSameMonth(monthCursor, today) || saving}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-sm font-semibold text-white">
                  {format(monthCursor, "MMMM yyyy")}
                </p>
                <button
                  type="button"
                  aria-label="Next month"
                  onClick={() => setMonthCursor((m) => addMonths(m, 1))}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-1 grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="py-1 text-center text-[11px] font-medium text-zinc-500"
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
                  const selected = selectedDate
                    ? isSameDay(day, selectedDate)
                    : false;
                  const isToday = isSameDay(day, today);
                  const disabled = past || closed || !inMonth || saving;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      title={closed ? "Salon closed" : undefined}
                      onClick={() => selectDate(day)}
                      className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                        selected
                          ? "bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20"
                          : disabled
                            ? "text-zinc-700"
                            : isToday
                              ? "bg-zinc-800 text-amber-300 ring-1 ring-amber-500/40"
                              : "text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {format(day, "d")}
                      {closed && inMonth && !past ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-red-400/80" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {selectedService && selectedDate ? (
        <section className="space-y-3">
          <SectionLabel
            icon={<Clock className="h-3.5 w-3.5" />}
            title="Available times"
          />
          {availableSlots.length === 0 ? (
            <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-6 text-center text-sm text-zinc-400">
              No open slots on this day. Try another date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availableSlots.map((slot) => {
                const selected = selectedSlot === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 sm:text-sm ${
                      selected
                        ? "border-amber-500/50 bg-amber-400 text-zinc-950"
                        : "border-zinc-800 bg-zinc-900/60 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {selectedService && selectedDate && selectedSlot && needsPhone ? (
        <section className="space-y-3">
          <SectionLabel
            icon={<Phone className="h-3.5 w-3.5" />}
            title="Your phone number"
          />
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="mb-3 text-xs text-zinc-400">
              The salon needs your number to confirm or reschedule. Saved to
              your profile for next time.
            </p>
            <label className="grid gap-1.5 text-xs text-zinc-400">
              Phone number
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="07X XXX XXXX"
                value={phoneInput}
                disabled={saving}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  setError(null);
                }}
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50 disabled:opacity-60"
              />
            </label>
          </div>
        </section>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-zinc-950/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
          {error ? (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
              {error}
            </p>
          ) : null}

          {hasSelection ? (
            <p className="truncate text-center text-xs text-zinc-400">
              {selectedService
                ? getBookableServiceLabel(selectedService)
                : ""}{" "}
              · {selectedDate ? format(selectedDate, "MMM d") : ""} ·{" "}
              {selectedSlot}
              {needsPhone && !phoneInput.trim()
                ? " · add phone to confirm"
                : ""}
              {needsConsultation ? ` · ${bookableDuration} min` : ""}
            </p>
          ) : (
            <p className="text-center text-xs text-zinc-500">
              {step === "service" && "Select a service to continue"}
              {step === "date" && "Select a date to see times"}
              {step === "time" && "Select a time slot"}
            </p>
          )}
          <button
            type="button"
            disabled={!canConfirm}
            onClick={handleConfirmBooking}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving…
              </>
            ) : (
              "Confirm booking"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceListSkeleton() {
  return (
    <ul className="grid gap-3" aria-busy="true" aria-label="Loading services">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4"
        >
          <div className="mb-3 flex justify-between gap-3">
            <div className="h-4 w-28 rounded bg-zinc-800" />
            <div className="h-4 w-16 rounded bg-zinc-800" />
          </div>
          <div className="mb-3 h-3 w-48 rounded bg-zinc-800/80" />
          <div className="h-5 w-20 rounded-full bg-zinc-800" />
        </li>
      ))}
    </ul>
  );
}

function StepHeader({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "service", label: "Service" },
    { id: "date", label: "Date" },
    { id: "time", label: "Time" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={s.id} className="flex flex-1 flex-col gap-1.5">
            <div
              className={`h-1 rounded-full transition ${
                done || active ? "bg-amber-400" : "bg-zinc-800"
              }`}
            />
            <span
              className={`text-[11px] font-medium ${
                active
                  ? "text-amber-400"
                  : done
                    ? "text-zinc-300"
                    : "text-zinc-600"
              }`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SectionLabel({
  icon,
  title,
  action,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-zinc-300">
        <span className="text-amber-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function SelectedSummary({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 text-amber-400">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>
    </div>
  );
}
