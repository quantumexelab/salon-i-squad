"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Clock, Loader2, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { generateDayTimeOptions, parseSlotMinutes } from "@/lib/calendar-utils";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";
import {
  DEFAULT_BUSINESS_HOURS,
  saveBusinessHours,
  subscribeToBusinessHours,
} from "@/lib/settings";

const TIME_OPTIONS = generateDayTimeOptions(30);

export function SettingsPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [openTime, setOpenTime] = useState<string>(
    DEFAULT_BUSINESS_HOURS.openTime,
  );
  const [closeTime, setCloseTime] = useState<string>(
    DEFAULT_BUSINESS_HOURS.closeTime,
  );
  const [cleanupPadding, setCleanupPadding] = useState<number>(
    DEFAULT_BUSINESS_HOURS.cleanupPadding,
  );
  const [hoursSaved, setHoursSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToBusinessHours(
      (hours) => {
        setOpenTime(hours.openTime);
        setCloseTime(hours.closeTime);
        setCleanupPadding(hours.cleanupPadding);
        setHoursLoading(false);
      },
      (err) => {
        setError(err.message);
        setHoursLoading(false);
      },
    );
  }, []);

  const openOptions = TIME_OPTIONS;
  const closeOptions = useMemo(() => {
    const openMins = parseSlotMinutes(openTime);
    return TIME_OPTIONS.filter((slot) => {
      const mins = parseSlotMinutes(slot);
      return !Number.isNaN(mins) && !Number.isNaN(openMins) && mins > openMins;
    });
  }, [openTime]);

  async function handleSaveHours(e: FormEvent) {
    e.preventDefault();
    setSavingHours(true);
    setError(null);
    setHoursSaved(false);
    try {
      await saveBusinessHours({ openTime, closeTime, cleanupPadding });
      setHoursSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save business hours.",
      );
    } finally {
      setSavingHours(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      initFirebase();
      await signOut(getFirebaseAuth());
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-salon-gold">
          Salon account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-salon-ink">
          Settings
        </h1>
        <p className="mt-2 text-sm text-salon-muted">
          Configure business hours, cleanup padding, and session. Client booking
          slots follow these settings.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-salon-beige/30 bg-salon-surface p-5">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-salon-gold/10 text-salon-gold">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-salon-ink">Salon schedule</h2>
            <p className="mt-1 text-xs text-salon-ink0">
              Bookable slots use open/close times (30 min steps). Cleanup padding
              only affects tomorrow and later.
            </p>
          </div>
        </div>

        {hoursLoading ? (
          <div className="flex justify-center py-8 text-salon-muted">
            <Loader2 className="h-5 w-5 animate-spin text-salon-gold" />
          </div>
        ) : (
          <form
            onSubmit={handleSaveHours}
            className="grid gap-3 sm:grid-cols-2"
          >
            <label className="grid gap-1.5 text-xs text-salon-muted">
              Open time
              <select
                value={openTime}
                onChange={(e) => {
                  setOpenTime(e.target.value);
                  setHoursSaved(false);
                  const nextOpen = parseSlotMinutes(e.target.value);
                  const closeMins = parseSlotMinutes(closeTime);
                  if (
                    !Number.isNaN(nextOpen) &&
                    !Number.isNaN(closeMins) &&
                    !(nextOpen < closeMins)
                  ) {
                    const fallback = TIME_OPTIONS.find(
                      (slot) => parseSlotMinutes(slot) > nextOpen,
                    );
                    if (fallback) setCloseTime(fallback);
                  }
                }}
                className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/50"
              >
                {openOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs text-salon-muted">
              Close time
              <select
                value={closeTime}
                onChange={(e) => {
                  setCloseTime(e.target.value);
                  setHoursSaved(false);
                }}
                className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/50"
              >
                {closeOptions.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs text-salon-muted sm:col-span-2">
              Cleanup padding (minutes)
              <input
                type="number"
                min={0}
                max={180}
                step={5}
                value={cleanupPadding}
                onChange={(e) => {
                  setCleanupPadding(Number(e.target.value));
                  setHoursSaved(false);
                }}
                className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink outline-none focus:border-salon-gold/50"
              />
              <span className="text-[11px] text-salon-ink0">
                Extra sanitation time after each appointment. Applies from
                tomorrow onward only — today&apos;s schedule ignores padding so
                live bookings are not disrupted. Default 0.
              </span>
            </label>
            <button
              type="submit"
              disabled={savingHours}
              className="inline-flex h-11 items-center justify-center gap-2 salon-gold-btn rounded-xl px-4 text-sm font-bold text-black disabled:opacity-60 sm:col-span-2"
            >
              {savingHours ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save settings
            </button>
            {hoursSaved ? (
              <p className="text-xs text-emerald-400 sm:col-span-2">
                Settings saved. Padding applies to bookings for tomorrow and
                later.
              </p>
            ) : null}
          </form>
        )}
      </section>

      <section className="mb-6 rounded-2xl border border-salon-beige/30 bg-salon-surface p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-salon-gold/10 text-salon-gold">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-salon-ink">Signed in</h2>
            <p className="mt-1 text-sm text-salon-muted">
              {profile
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : user?.email ?? user?.uid}
            </p>
            <p className="mt-1 text-xs text-salon-ink0">
              {user?.email ?? "No email"} · role:{" "}
              <span className="text-salon-gold">{profile?.role ?? "…"}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-salon-beige/40 bg-salon-bg px-4 text-sm font-semibold text-salon-ink transition hover:border-salon-gold/40 disabled:opacity-60"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 text-salon-gold" />
          )}
          Logout
        </button>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
