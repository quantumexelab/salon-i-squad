"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import {
  enablePushNotificationsForUser,
  isFcmVapidConfigured,
} from "@/lib/fcm";

type Props = {
  uid: string;
  hasToken?: boolean;
};

export function EnableNotificationsCard({ uid, hasToken }: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(Boolean(hasToken));

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    setEnabled(Boolean(hasToken));
  }, [hasToken]);

  async function handleEnable() {
    setBusy(true);
    setMessage(null);
    const result = await enablePushNotificationsForUser(uid);
    setBusy(false);

    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }

    if (result.ok) {
      setEnabled(true);
      setMessage("Notifications enabled for this device.");
      return;
    }
    setMessage(result.message);
  }

  if (permission === "unsupported") {
    return null;
  }

  return (
    <div className="mb-6 rounded-2xl border border-salon-beige/35 bg-salon-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
          {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-salon-ink">Booking notifications</p>
          <p className="mt-1 text-xs text-salon-muted">
            Get alerts when your booking is confirmed, reminded, or updated.
          </p>
          {!isFcmVapidConfigured() ? (
            <p className="mt-2 text-xs text-amber-700">
              Push is not configured on the server yet (VAPID key missing).
            </p>
          ) : null}
          {message ? (
            <p
              className={`mt-2 text-xs ${
                enabled ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {message}
            </p>
          ) : null}
          <button
            type="button"
            disabled={busy || (enabled && permission === "granted")}
            onClick={() => void handleEnable()}
            className="salon-gold-btn mt-3 inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-black disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            {enabled && permission === "granted"
              ? "Notifications on"
              : permission === "denied"
                ? "Permission blocked — open settings"
                : "Enable notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
