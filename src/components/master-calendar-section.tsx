"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  saveCalendarSettings,
  subscribeToCalendarSettings,
} from "@/lib/calendar-settings";

export function MasterCalendarSection() {
  const { user } = useAuth();
  const [calendarId, setCalendarId] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToCalendarSettings(
      (settings) => {
        setCalendarId(settings.calendarId);
        setServiceAccountJson(settings.serviceAccountJson);
        setEnabled(settings.enabled);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveCalendarSettings({
        calendarId,
        serviceAccountJson,
        enabled,
        updatedBy: user?.uid,
      });
      setMessage(
        enabled
          ? "Calendar sync settings saved. Confirmed bookings will sync when credentials are valid."
          : "Calendar settings saved. Sync is disabled.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save calendar settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Google Calendar sync</h3>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-zinc-400">
        Push confirmed, rescheduled, and cancelled bookings to the salon
        owner&apos;s Google Calendar. Store the Calendar ID and a Google Cloud
        service account JSON here (master-only). On Vercel, also set{" "}
        <code className="text-zinc-300">FIREBASE_SERVICE_ACCOUNT_JSON</code> so
        the API can read this document, or set{" "}
        <code className="text-zinc-300">GOOGLE_CALENDAR_ID</code> +{" "}
        <code className="text-zinc-300">GOOGLE_SERVICE_ACCOUNT_JSON</code> as
        env fallbacks.
      </p>

      {loading ? (
        <div className="flex justify-center py-8 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="grid gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-950 text-amber-400"
            />
            Enable Google Calendar sync
          </label>

          <label className="grid gap-1.5 text-xs text-zinc-400">
            Google Calendar ID
            <input
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="owner@gmail.com or …@group.calendar.google.com"
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
            />
          </label>

          <label className="grid gap-1.5 text-xs text-zinc-400">
            Service Account JSON
            <textarea
              value={serviceAccountJson}
              onChange={(e) => setServiceAccountJson(e.target.value)}
              rows={8}
              spellCheck={false}
              placeholder='{"type":"service_account","client_email":"…","private_key":"…"}'
              className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-amber-500/50"
            />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save calendar settings
          </button>

          {message ? (
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
