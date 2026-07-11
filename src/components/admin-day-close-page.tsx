"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  createClosedDay,
  deleteClosedDay,
  subscribeToClosedDays,
} from "@/lib/calendar";
import { useAuth } from "@/contexts/auth-context";
import type { ClosedDay } from "@/types/calendar";

export function AdminDayClosePage() {
  const { user } = useAuth();
  const [days, setDays] = useState<ClosedDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToClosedDays(
      (next) => {
        setDays(next);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createClosedDay({
        dateKey: dateValue,
        note,
        createdBy: user?.uid,
      });
      setDateValue("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close day.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(day: ClosedDay) {
    if (!window.confirm(`Re-open ${day.dateKey}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteClosedDay(day.id);
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
        <h1 className="mt-2 text-3xl font-semibold text-white">Day close</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Mark full days as closed (holidays, off days). Clients cannot select
          these dates when booking.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="mb-6 grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="grid gap-1.5 text-xs text-zinc-400">
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
          Note (optional)
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Public holiday"
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-xl bg-amber-400 px-4 text-sm font-bold text-zinc-950 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Close day
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
        ) : days.length === 0 ? (
          <p className="px-4 py-14 text-center text-sm text-zinc-500">
            No closed days yet.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {days.map((day) => (
              <li
                key={day.id}
                className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6"
              >
                <div>
                  <p className="font-medium text-white">{day.dateKey}</p>
                  <p className="text-xs text-zinc-500">
                    {day.note || "Closed"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => handleDelete(day)}
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
