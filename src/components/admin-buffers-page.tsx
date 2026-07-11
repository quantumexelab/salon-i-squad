"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createBuffer,
  deleteBuffer,
  subscribeToBuffers,
} from "@/lib/calendar";
import {
  generateDayTimeOptions,
  generateTimeSlots,
  parseSlotMinutes,
} from "@/lib/calendar-utils";
import {
  DEFAULT_BUSINESS_HOURS,
  subscribeToBusinessHours,
  type BusinessHours,
} from "@/lib/settings";
import { useAuth } from "@/contexts/auth-context";
import type { TimeBuffer } from "@/types/calendar";

const FALLBACK_OPTIONS = generateDayTimeOptions(30);

export function AdminBuffersPage() {
  const { user } = useAuth();
  const [buffers, setBuffers] = useState<TimeBuffer[]>([]);
  const [hours, setHours] = useState<BusinessHours>({
    ...DEFAULT_BUSINESS_HOURS,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [startTime, setStartTime] = useState<string>(
    DEFAULT_BUSINESS_HOURS.openTime,
  );
  const [endTime, setEndTime] = useState<string>("01:00 PM");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const timeOptions = useMemo(() => {
    const fromHours = generateTimeSlots(hours.openTime, hours.closeTime, {
      durationMinutes: 30,
    });
    const withClose = fromHours.includes(hours.closeTime)
      ? fromHours
      : [...fromHours, hours.closeTime];
    return withClose.length > 0 ? withClose : FALLBACK_OPTIONS;
  }, [hours]);

  useEffect(() => {
    return subscribeToBusinessHours(setHours);
  }, []);

  useEffect(() => {
    return subscribeToBuffers(
      (next) => {
        setBuffers(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    if (timeOptions.length === 0) return;
    setStartTime((prev) =>
      timeOptions.includes(prev) ? prev : timeOptions[0],
    );
    setEndTime((prev) =>
      timeOptions.includes(prev)
        ? prev
        : timeOptions[Math.min(2, timeOptions.length - 1)],
    );
  }, [timeOptions]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const start = parseSlotMinutes(startTime);
    const end = parseSlotMinutes(endTime);
    if (!(start < end)) {
      setError("End time must be after start time.");
      setSaving(false);
      return;
    }

    try {
      await createBuffer({
        dateKey: dateValue,
        startTime,
        endTime,
        label,
        createdBy: user?.uid,
      });
      setLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save buffer.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(buffer: TimeBuffer) {
    if (
      !window.confirm(
        `Remove buffer ${buffer.startTime}–${buffer.endTime} on ${buffer.dateKey}?`,
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await deleteBuffer(buffer.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Calendar
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Buffers</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Block part of a day (lunch, short leave). Matching client time slots
          will be hidden. Times follow Settings → Business hours.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:grid-cols-2"
      >
        <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
          Date
          <input
            required
            type="date"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <label className="grid gap-1.5 text-xs text-zinc-400">
          Start time
          <select
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
          >
            {timeOptions.map((slot) => (
              <option key={`start-${slot}`} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-zinc-400">
          End time
          <select
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
          >
            {timeOptions.map((slot) => (
              <option key={`end-${slot}`} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
          Label (optional)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Lunch break"
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60 sm:col-span-2"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add buffer
        </button>
      </form>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
        {loading ? (
          <div className="flex justify-center py-14 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          </div>
        ) : buffers.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-zinc-500">
            No buffers yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {buffers.map((buffer) => (
              <li
                key={buffer.id}
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6"
              >
                <div>
                  <p className="font-medium text-white">
                    {buffer.dateKey} · {buffer.startTime} – {buffer.endTime}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {buffer.label || "Blocked window"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDelete(buffer)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
