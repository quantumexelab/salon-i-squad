"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Users } from "lucide-react";
import { subscribeToBookings } from "@/lib/bookings";
import { getProfilePhone, subscribeToClientUsers } from "@/lib/users";
import {
  buildWhatsAppUrl,
  customerGreetingMessage,
} from "@/lib/whatsapp";
import type { UserProfile } from "@/types/firestore";

type CustomerRow = {
  user: UserProfile;
  totalBookings: number;
};

export function AdminCustomersPage() {
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>(
    {},
  );
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToClientUsers(
      (next) => {
        setClients(next);
        setLoadingClients(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoadingClients(false);
      },
    );
  }, []);

  useEffect(() => {
    return subscribeToBookings(
      (bookings) => {
        const counts: Record<string, number> = {};
        for (const booking of bookings) {
          if (!booking.userId) continue;
          counts[booking.userId] = (counts[booking.userId] ?? 0) + 1;
        }
        setBookingCounts(counts);
        setLoadingBookings(false);
      },
      (err) => {
        setError(err.message);
        setLoadingBookings(false);
      },
    );
  }, []);

  const rows = useMemo<CustomerRow[]>(() => {
    return clients
      .map((user) => ({
        user,
        totalBookings: bookingCounts[user.uid] ?? 0,
      }))
      .sort((a, b) => b.totalBookings - a.totalBookings);
  }, [clients, bookingCounts]);

  const loading = loadingClients || loadingBookings;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-salon-gold">
          CRM
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-salon-ink">
          Customers
        </h1>
        <p className="mt-2 max-w-xl text-sm text-salon-muted">
          Unique clients from the booking app, with contact details and total
          appointments. Tap a phone number to open WhatsApp.
        </p>
      </div>

      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-salon-beige/30 bg-salon-surface px-3 py-1.5 text-xs text-salon-muted">
        <Users className="h-3.5 w-3.5 text-salon-gold" />
        {loading ? "Loading…" : `${rows.length} clients`}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-salon-beige/30 bg-salon-surface">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-salon-muted">
            <Loader2 className="h-5 w-5 animate-spin text-salon-gold" />
            Loading customers…
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-16 text-center sm:px-6">
            <p className="text-sm font-medium text-salon-muted">No customers yet</p>
            <p className="mt-1 text-xs text-salon-ink0">
              Clients appear here after they sign in or book.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-salon-bg/60 text-xs uppercase tracking-wide text-salon-ink0">
                  <tr>
                    <th className="px-6 py-3 font-medium">Name</th>
                    <th className="px-6 py-3 font-medium">Email</th>
                    <th className="px-6 py-3 font-medium">Phone</th>
                    <th className="px-6 py-3 font-medium">Total bookings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-salon-beige/30">
                  {rows.map(({ user, totalBookings }) => {
                    const name =
                      `${user.firstName} ${user.lastName}`.trim() || "Client";
                    const phone = getProfilePhone(user);
                    return (
                      <tr
                        key={user.uid}
                        className="transition hover:bg-salon-surface"
                      >
                        <td className="px-6 py-4 font-medium text-salon-ink">
                          {name}
                          {user.isGuest ? (
                            <span className="ml-2 rounded-full bg-salon-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-salon-muted">
                              Guest
                            </span>
                          ) : null}
                        </td>
                        <td className="px-6 py-4 text-salon-muted">
                          {user.email || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <CustomerPhoneLink name={name} phone={phone} />
                        </td>
                        <td className="px-6 py-4 font-semibold text-salon-ink">
                          {totalBookings}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-salon-beige/30 md:hidden">
              {rows.map(({ user, totalBookings }) => {
                const name =
                  `${user.firstName} ${user.lastName}`.trim() || "Client";
                const phone = getProfilePhone(user);
                return (
                  <li key={user.uid} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-salon-ink">{name}</p>
                        <p className="mt-1 text-xs text-salon-muted">
                          {user.email || "No email"}
                        </p>
                        <div className="mt-1 text-xs">
                          <CustomerPhoneLink name={name} phone={phone} />
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-salon-ink">
                        {totalBookings}{" "}
                        <span className="text-xs font-normal text-salon-ink0">
                          bookings
                        </span>
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}

function CustomerPhoneLink({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  if (!phone) {
    return <span className="text-salon-ink0">—</span>;
  }

  const url = buildWhatsAppUrl(phone, customerGreetingMessage(name));
  if (!url) {
    return <span className="text-salon-gold/90">{phone}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[#25D366] underline-offset-2 transition hover:underline"
      title="Open WhatsApp"
    >
      {phone}
    </a>
  );
}
