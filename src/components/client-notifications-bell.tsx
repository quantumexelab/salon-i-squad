"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  markNotificationRead,
  subscribeToUserNotifications,
} from "@/lib/notifications";
import type { AppNotification } from "@/types/firestore";

export function ClientNotificationsBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      return;
    }
    return subscribeToUserNotifications(user.uid, setItems);
  }, [user?.uid]);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  if (!user) return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 text-salon-muted transition hover:bg-salon-surface hover:text-salon-ink"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-salon-gold px-1 text-[9px] font-bold text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-salon-beige/40 bg-salon-white shadow-lg shadow-black/10">
            <div className="border-b border-salon-beige/30 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-salon-ink">
                Notifications
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-salon-muted">
                  No notifications yet.
                </p>
              ) : (
                items.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`block w-full border-b border-salon-beige/20 px-3 py-2.5 text-left transition hover:bg-salon-surface/80 ${
                      n.read ? "opacity-70" : ""
                    }`}
                    onClick={() => {
                      if (!n.read) void markNotificationRead(n.id);
                      setOpen(false);
                    }}
                  >
                    <p className="text-sm font-medium text-salon-ink">{n.title}</p>
                    <p className="mt-0.5 text-xs text-salon-muted">{n.body}</p>
                    {n.bookingId ? (
                      <Link
                        href="/my-bookings"
                        className="mt-1 inline-block text-[11px] font-semibold text-salon-gold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View booking
                      </Link>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
