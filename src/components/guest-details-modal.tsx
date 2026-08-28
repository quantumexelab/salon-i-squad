"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !mounted) return null;

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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-salon-ink/60 p-4">
      <button
        type="button"
        aria-label="Close guest form"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-salon-gold/25 bg-salon-white shadow-xl">
        <div className="flex items-center justify-between border-b border-salon-beige/50 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-salon-ink">
              Guest details
            </h2>
            <p className="mt-1 text-sm text-salon-muted">
              We need your name and mobile number to confirm bookings.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-salon-muted transition hover:bg-salon-surface hover:text-salon-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-salon-ink">
              Full name
            </span>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-salon-muted" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Nimal Perera"
                className="h-12 w-full rounded-xl border border-salon-beige bg-salon-white pl-10 pr-4 text-sm text-salon-ink outline-none transition placeholder:text-salon-muted/60 focus:border-salon-gold/60 focus:ring-2 focus:ring-salon-gold/15"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-salon-ink">
              Mobile number
            </span>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-salon-muted" />
              <input
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                placeholder="e.g. 077 123 4567"
                className="h-12 w-full rounded-xl border border-salon-beige bg-salon-white pl-10 pr-4 text-sm text-salon-ink outline-none transition placeholder:text-salon-muted/60 focus:border-salon-gold/60 focus:ring-2 focus:ring-salon-gold/15"
              />
            </div>
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="salon-gold-btn flex h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>,
    document.body,
  );
}
