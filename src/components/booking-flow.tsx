"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
import { applyBookingCalendarSync } from "@/lib/request-calendar-sync";
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
  canCombineServices,
  getBookableDurationMinutes,
  getBookableServiceLabel,
  getCombinedBookableDuration,
  getCombinedPrice,
  getCombinedServiceLabel,
  getSampleCatalogServices,
  resolveBookableServices,
  subscribeToServices,
} from "@/lib/services";
import {
  getProfilePhone,
  isValidMobile,
  updateUserPhoneNumber,
} from "@/lib/users";
import { useAuth } from "@/contexts/auth-context";
import { serviceImageFor } from "@/lib/service-images";
import { siteConfig } from "@/lib/site";
import type { ClosedDay, TimeBuffer } from "@/types/calendar";
import type { BookingGender, BookingLineItem, Service } from "@/types/firestore";

type Step = "service" | "date" | "time";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function BookingFlow() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [services, setServices] = useState<Service[]>(() =>
    getSampleCatalogServices(),
  );
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
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<BookingGender | null>(
    null,
  );
  const [activeStep, setActiveStep] = useState<Step>("service");
  const [phoneInput, setPhoneInput] = useState("");
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(new Date()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToServices(
      (next) => {
        setServices(resolveBookableServices(next));
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

  const step = activeStep;

  function goToNextStep() {
    if (activeStep === "service" && selectedServices.length > 0) {
      setActiveStep("date");
      setError(null);
      return;
    }
    if (activeStep === "date" && selectedDate) {
      setActiveStep("time");
      setError(null);
    }
  }

  const canGoNext =
    !saving &&
    ((activeStep === "service" && selectedServices.length > 0) ||
      (activeStep === "date" && Boolean(selectedDate)));

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(monthCursor);
    const monthEnd = endOfMonth(monthCursor);
    return eachDayOfInterval({
      start: startOfWeek(monthStart),
      end: endOfWeek(monthEnd),
    });
  }, [monthCursor]);

  const bookableDuration = useMemo(
    () => getCombinedBookableDuration(selectedServices),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => getCombinedPrice(selectedServices),
    [selectedServices],
  );

  const needsConsultation = selectedServices.some(
    (service) => service.requiresConsultation,
  );

  const serviceLabel = useMemo(() => {
    if (selectedServices.length === 0) return "";
    return getCombinedServiceLabel(selectedServices);
  }, [selectedServices]);

  const availableSlots = useMemo(() => {
    if (selectedServices.length === 0 || !selectedDate) return [];
    const padding = effectiveCleanupPaddingMinutes(
      selectedDate,
      businessHours.cleanupPadding,
    );
    const durationMinutes = bookableDuration + padding;
    const slots = generateTimeSlots(
      businessHours.openTime,
      businessHours.closeTime,
      {
        durationMinutes,
        intervalMinutes: businessHours.slotIntervalMinutes,
      },
    );
    return filterAvailableSlots(slots, {
      dateKey: toDateKey(selectedDate),
      durationMinutes,
      bookingPaddingMinutes: padding,
      buffers,
      bookings: confirmedBookings,
      now: new Date(nowTick),
    });
  }, [
    selectedServices,
    selectedDate,
    bookableDuration,
    businessHours,
    buffers,
    confirmedBookings,
    nowTick,
  ]);

  useEffect(() => {
    if (selectedSlot && !availableSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableSlots, selectedSlot]);

  function toggleService(service: Service) {
    setSelectedServices((prev) => {
      const exists = prev.some((item) => item.id === service.id);
      if (exists) {
        return prev.filter((item) => item.id !== service.id);
      }
      if (!canCombineServices(prev, service)) {
        return [service];
      }
      return [...prev, service];
    });
    setSelectedDate(null);
    setSelectedSlot(null);
    setError(null);
  }

  function resetFrom(stepToReset: Step) {
    if (stepToReset === "service") {
      setSelectedServices([]);
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedGender(null);
      setActiveStep("service");
      return;
    }
    if (stepToReset === "date") {
      setSelectedDate(null);
      setSelectedSlot(null);
      setSelectedGender(null);
      setActiveStep("date");
    }
  }

  function selectDate(day: Date) {
    if (isBefore(day, today)) return;
    if (closedDateKeys.has(toDateKey(day))) return;
    setSelectedDate(day);
    setSelectedSlot(null);
    setError(null);
  }

  const profilePhone = getProfilePhone(profile);
  const needsPhone = Boolean(user && !profilePhone);
  const resolvedPhone = profilePhone || phoneInput.trim();

  const hasSelection = Boolean(
    selectedServices.length > 0 && selectedDate && selectedSlot && user,
  );
  const canConfirm =
    hasSelection &&
    !saving &&
    Boolean(resolvedPhone) &&
    (!needsPhone || isValidMobile(phoneInput));

  async function handleConfirmBooking() {
    if (
      !user ||
      selectedServices.length === 0 ||
      !selectedDate ||
      !selectedSlot
    ) {
      return;
    }

    setSaving(true);
    setError(null);

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

      const consultationNote = needsConsultation
        ? selectedServices
            .filter((service) => service.requiresConsultation)
            .map(
              (service) =>
                `Prior consultation for ${service.name} (full service ${service.durationMinutes} mins).`,
            )
            .join(" ")
        : "";

      const lineItems: BookingLineItem[] = selectedServices.map((service) => ({
        serviceId: service.id,
        name: getBookableServiceLabel(service),
        duration: getBookableDurationMinutes(service),
        price: service.price,
      }));

      const booking = await createBooking({
        userId: user.uid,
        services: lineItems,
        selectedDate,
        selectedTime: selectedSlot,
        phoneNumber,
        customerName: customerName || undefined,
        customerEmail: profile?.email ?? user.email ?? undefined,
        customerGender: selectedGender ?? undefined,
        isConsultation: needsConsultation,
        notes: consultationNote || undefined,
      });

      void applyBookingCalendarSync("create", booking);

      router.push("/my-bookings");
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
      className={`mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row lg:gap-8 ${
        needsPhone ? "pb-44" : "pb-36"
      } md:pb-28`}
    >
      {/* Desktop sidebar stepper */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 lg:flex">
        <div className="rounded-2xl border border-salon-beige/35 bg-salon-white p-5 shadow-[var(--salon-shadow)]">
          <StepHeader step={step} />
        </div>
        <div className="rounded-2xl border border-salon-beige/35 bg-salon-surface p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-salon-muted">
                Need help?
              </p>
              <p className="mt-1 text-sm leading-snug text-salon-ink">
                Follow the steps — we will confirm once your booking is in.
              </p>
              <a
                href={`tel:${siteConfig.phoneTel}`}
                className="mt-2 inline-block text-sm font-semibold text-salon-gold hover:underline"
              >
                {siteConfig.phoneDisplay}
              </a>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-5">
        {/* Mobile stepper */}
        <div className="rounded-2xl border border-salon-beige/35 bg-salon-white p-4 lg:hidden">
          <StepHeader step={step} horizontal />
        </div>

        {activeStep === "service" ? (
          <section className="space-y-4">
            <SectionLabel
              icon={<Scissors className="h-3.5 w-3.5" />}
              title="Choose Your Service"
            />
            <p className="text-xs text-salon-muted">
              Select one or more services for this appointment.
            </p>

            {servicesLoading ? (
              <ServiceListSkeleton />
            ) : servicesError ? (
              <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600">
                {servicesError}
              </p>
            ) : services.length === 0 ? (
              <p className="rounded-2xl border border-salon-gold/15 bg-salon-surface/50 px-4 py-6 text-center text-sm text-salon-muted">
                No services
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => {
                  const selected = selectedServices.some(
                    (item) => item.id === service.id,
                  );
                  return (
                    <button
                      key={service.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleService(service);
                      }}
                      disabled={saving}
                      className={`relative overflow-hidden rounded-2xl border bg-salon-white text-left transition active:scale-[0.99] disabled:opacity-60 ${
                        selected
                          ? "border-salon-gold ring-2 ring-salon-gold/30"
                          : "border-salon-beige/40 shadow-[var(--salon-shadow)]"
                      }`}
                    >
                      <span
                        className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border-2 ${
                          selected
                            ? "border-salon-gold bg-salon-gold text-black"
                            : "border-white/80 bg-black/25 text-transparent"
                        }`}
                        aria-hidden
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={serviceImageFor(service.name, service.imageUrl)}
                        alt={service.name}
                        className="aspect-[16/10] w-full object-cover"
                      />
                      <span className="block px-3 py-3">
                        <span className="block text-sm font-semibold text-salon-ink">
                          {service.name}
                        </span>
                        <span className="mt-1 block text-[11px] text-salon-muted">
                          {getBookableDurationMinutes(service)} mins ·{" "}
                          <span className="font-semibold text-salon-gold">
                            {formatLkr(service.price)}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedServices.length > 0 ? (
              <p className="rounded-xl border border-salon-gold/25 bg-salon-gold/10 px-3 py-2 text-xs text-salon-ink">
                Selected: {serviceLabel} · {bookableDuration} mins ·{" "}
                <span className="font-semibold text-salon-gold">
                  {formatLkr(totalPrice)}
                </span>
              </p>
            ) : null}
          </section>
        ) : null}

        {activeStep !== "service" && selectedServices.length > 0 ? (
          <section className="space-y-3">
            <SectionLabel
              icon={<Scissors className="h-3.5 w-3.5" />}
              title="Service"
              action={
                <button
                  type="button"
                  onClick={() => resetFrom("service")}
                  className="text-xs font-medium text-salon-gold"
                >
                  Change
                </button>
              }
            />
            <SelectedSummary
              title={serviceLabel}
              subtitle={`${bookableDuration} min · ${formatLkr(totalPrice)}`}
            />
          </section>
        ) : null}

        {activeStep === "date" && selectedServices.length > 0 ? (
          <section className="space-y-3">
            {needsConsultation ? (
              <div
                role="status"
                className="rounded-2xl border border-salon-gold/30 bg-salon-gold/10 px-4 py-3 text-sm text-salon-gold"
              >
                This complex service requires a prior consultation. You are
                booking a {CONSULTATION_DURATION_MINUTES}-minute consultation
                session first.
              </div>
            ) : null}
            <SectionLabel
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              title="Pick a date"
            />

            <div className="overflow-hidden rounded-2xl border border-salon-beige/35 bg-salon-white p-3 shadow-[var(--salon-shadow)] sm:p-4">
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  onClick={() => setMonthCursor((m) => addMonths(m, -1))}
                  disabled={isSameMonth(monthCursor, today) || saving}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-salon-gold transition hover:bg-salon-surface disabled:opacity-30"
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
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-salon-gold transition hover:bg-salon-surface disabled:opacity-30"
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
                  if (!inMonth) {
                    return (
                      <div
                        key={day.toISOString()}
                        className="aspect-square"
                        aria-hidden
                      />
                    );
                  }

                  const past = isBefore(day, today);
                  const closed = closedDateKeys.has(toDateKey(day));
                  const selected = selectedDate
                    ? isSameDay(day, selectedDate)
                    : false;
                  const isToday = isSameDay(day, today);
                  const disabled = past || closed || saving;

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      disabled={disabled}
                      title={closed ? "Salon closed" : undefined}
                      onClick={() => selectDate(day)}
                      className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition ${
                        selected
                          ? "bg-salon-gold text-black shadow-lg shadow-salon-gold/20"
                          : disabled
                            ? "text-salon-muted/60"
                            : isToday
                              ? "bg-salon-surface text-salon-gold ring-1 ring-salon-gold/40"
                              : "text-salon-ink hover:bg-salon-surface"
                      }`}
                    >
                      {format(day, "d")}
                      {closed && !past ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-red-400/80" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {activeStep === "time" && selectedServices.length > 0 && selectedDate ? (
          <section className="space-y-3">
            <SectionLabel
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              title="Date"
              action={
                <button
                  type="button"
                  onClick={() => resetFrom("date")}
                  className="text-xs font-medium text-salon-gold"
                >
                  Change
                </button>
              }
            />
            <SelectedSummary
              title={format(selectedDate, "EEEE, MMM d")}
              subtitle={format(selectedDate, "yyyy")}
            />
          </section>
        ) : null}

        {activeStep === "time" && selectedServices.length > 0 && selectedDate ? (
          <section className="space-y-3">
            <SectionLabel
              icon={<Clock className="h-3.5 w-3.5" />}
              title="Available times"
            />
            {availableSlots.length === 0 ? (
              <p className="rounded-2xl border border-salon-gold/15 bg-salon-surface/50 px-4 py-6 text-center text-sm text-salon-muted">
                No open slots on this day. Try another date.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
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
                      }}
                      className={`rounded-xl border px-2 py-3 text-center text-xs font-semibold transition active:scale-[0.98] disabled:opacity-60 sm:text-sm ${
                        selected
                          ? "border-salon-gold/50 bg-salon-gold text-black"
                          : "border-salon-beige/40 bg-salon-white text-salon-ink hover:border-salon-gold/40"
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

        {activeStep === "time" &&
        selectedServices.length > 0 &&
        selectedDate &&
        selectedSlot ? (
          <section className="space-y-3">
            <SectionLabel title="Gender (optional)" />
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: "male" as const, label: "Male" },
                  { id: "female" as const, label: "Female" },
                ] as const
              ).map((option) => {
                const selected = selectedGender === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setSelectedGender((current) =>
                        current === option.id ? null : option.id,
                      );
                      setError(null);
                    }}
                    className={`h-11 rounded-xl border text-sm font-semibold transition active:scale-[0.98] disabled:opacity-60 ${
                      selected
                        ? "border-salon-gold/50 bg-salon-gold text-black"
                        : "border-salon-beige/40 bg-salon-white text-salon-ink hover:border-salon-gold/40"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeStep === "time" &&
        selectedServices.length > 0 &&
        selectedDate &&
        needsPhone ? (
          <section className="space-y-3">
            <SectionLabel
              icon={<Phone className="h-3.5 w-3.5" />}
              title="Your phone number"
            />
            <div className="rounded-2xl border border-salon-beige/35 bg-salon-white p-4 shadow-[var(--salon-shadow)]">
              <p className="mb-3 text-xs text-salon-muted">
                The salon needs your number to confirm or reschedule. Saved to
                your profile for next time.
              </p>
              <label className="grid gap-1.5 text-xs text-salon-muted">
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
                  className="h-11 rounded-xl border border-salon-beige/40 bg-salon-surface px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/50 disabled:opacity-60"
                />
              </label>
            </div>
          </section>
        ) : null}
      </div>

      {/* Sticky footer CTA */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-salon-beige/30 bg-salon-white/95 px-4 pb-3 pt-3 backdrop-blur md:bottom-0 md:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            {error ? (
              <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-600 lg:text-left">
                {error}
              </p>
            ) : hasSelection ? (
              <p className="truncate text-center text-xs text-salon-muted lg:text-left">
                {serviceLabel} ·{" "}
                {selectedDate ? format(selectedDate, "MMM d") : ""} ·{" "}
                {selectedSlot}
                {needsPhone && !phoneInput.trim()
                  ? " · add phone to confirm"
                  : ""}
                {` · ${bookableDuration} min · ${formatLkr(totalPrice)}`}
              </p>
            ) : (
              <p className="text-center text-xs text-salon-muted lg:text-left">
                {activeStep === "service" &&
                  "Select a service, then tap Next Step"}
                {activeStep === "date" && "Select a date, then tap Next Step"}
                {activeStep === "time" && "Select a time slot to confirm"}
              </p>
            )}
          </div>
          {activeStep === "time" ? (
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirmBooking}
              className="salon-gold-btn flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:bg-salon-surface disabled:text-salon-muted lg:w-auto lg:min-w-[220px] lg:px-8"
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
          ) : (
            <button
              type="button"
              disabled={!canGoNext}
              onClick={goToNextStep}
              className="salon-gold-btn flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:bg-salon-surface disabled:text-salon-muted lg:w-auto lg:min-w-[220px] lg:px-8"
            >
              Next Step
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceListSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Loading services"
    >
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-2xl border border-salon-beige/30 bg-salon-surface"
        >
          <div className="aspect-[16/10] bg-salon-beige/30" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-28 rounded bg-salon-beige/40" />
            <div className="h-3 w-20 rounded bg-salon-beige/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

function StepHeader({
  step,
  horizontal = false,
}: {
  step: Step;
  horizontal?: boolean;
}) {
  const steps: { id: Step; label: string; num: number }[] = [
    { id: "service", label: "Service", num: 1 },
    { id: "date", label: "Date & Time", num: 2 },
    { id: "time", label: "Confirmation", num: 3 },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  if (horizontal) {
    return (
      <ol className="flex items-center justify-between gap-2">
        {steps.map((s, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <li key={s.id} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  done || active
                    ? "bg-salon-gold text-black"
                    : "bg-salon-surface text-salon-muted ring-1 ring-salon-beige/50"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.num}
              </span>
              <span
                className={`text-center text-[10px] font-medium uppercase tracking-wide ${
                  active ? "text-salon-ink" : "text-salon-muted"
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

  return (
    <ol className="space-y-4">
      {steps.map((s, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li key={s.id} className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
                done || active
                  ? "bg-salon-gold text-black"
                  : "bg-salon-surface text-salon-muted ring-1 ring-salon-beige/50"
              }`}
            >
              {done ? <Check className="h-4 w-4" strokeWidth={3} /> : s.num}
            </span>
            <span
              className={`text-sm ${
                active
                  ? "font-semibold text-salon-ink"
                  : done
                    ? "text-salon-gold"
                    : "text-salon-muted"
              }`}
            >
              {s.num}. {s.label}
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
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-salon-gold">
        {icon ? <span className="text-salon-gold">{icon}</span> : null}
        <h2 className="text-sm font-semibold text-salon-ink md:text-base">
          {title}
        </h2>
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
    <div className="flex items-center gap-3 rounded-2xl border border-salon-gold/20 bg-salon-surface/80 px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-salon-gold/15 text-salon-gold">
        <Check className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-salon-ink">{title}</p>
        <p className="text-xs text-salon-muted">{subtitle}</p>
      </div>
    </div>
  );
}
