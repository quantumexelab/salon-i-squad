"use client";

import { useState } from "react";
import { Loader2, Phone, UserRound, X } from "lucide-react";

type GuestDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (details: { name: string; mobile: string }) => Promise<void>;
};

export function GuestDetailsModal({
  open,
  onClose,
  onSubmit,
}: GuestDetailsModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (!trimmedMobile) {
      setError("Please enter your mobile number.");
      return;
    }

    setLoading(true);

    try {
      await onSubmit({ name: trimmedName, mobile: trimmedMobile });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not continue as guest.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close guest form"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Guest details</h2>
            <p className="mt-1 text-sm text-zinc-400">
              We need your name and mobile number to confirm bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">Full name</span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Nimal Perera"
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-zinc-300">
              Mobile number
            </span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="e.g. 077 123 4567"
                className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Continuing...
              </>
            ) : (
              "Continue to booking"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
