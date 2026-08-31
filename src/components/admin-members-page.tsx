"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { Crown, Loader2, Search } from "lucide-react";
import { subscribeToBookings } from "@/lib/bookings";
import {
  getProfilePhone,
  phoneDocId,
  setUserMemberStatus,
  subscribeToClientUsers,
} from "@/lib/users";
import type { SavedBooking } from "@/lib/bookings";
import type { UserProfile } from "@/types/firestore";

export function AdminMembersPage() {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [actionUid, setActionUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubMembers = subscribeToClientUsers(
      (all) => {
        setClients(all);
        setMembers(all.filter((c) => c.isMember));
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    const unsubBookings = subscribeToBookings(setBookings);
    return () => {
      unsubMembers();
      unsubBookings();
    };
  }, []);

  const bookingStats = useMemo(() => {
    const byPhone = new Map<string, { count: number; lastDate: string }>();
    for (const b of bookings) {
      const phone = b.phoneNumber?.trim();
      if (!phone) continue;
      const key = phoneDocId(phone);
      const entry = byPhone.get(key) ?? { count: 0, lastDate: "" };
      entry.count += 1;
      const d = b.dateKey || b.selectedDate;
      if (d > entry.lastDate) entry.lastDate = d;
      byPhone.set(key, entry);
    }
    return byPhone;
  }, [bookings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      const name = `${m.firstName} ${m.lastName}`.toLowerCase();
      const phone = getProfilePhone(m);
      const key = phone ? phoneDocId(phone) : "";
      const stats = key ? bookingStats.get(key) : undefined;
      if (q && !name.includes(q) && !phone.includes(q) && !m.email?.includes(q)) {
        return false;
      }
      if (fromDate && stats?.lastDate && stats.lastDate < fromDate) return false;
      if (toDate && stats?.lastDate && stats.lastDate > toDate) return false;
      return true;
    });
  }, [members, query, fromDate, toDate, bookingStats]);

  const nonMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((c) => !c.isMember)
      .filter((c) => {
        if (!q) return false;
        const name = `${c.firstName} ${c.lastName}`.toLowerCase();
        return (
          name.includes(q) ||
          getProfilePhone(c).includes(q) ||
          c.email?.toLowerCase().includes(q)
        );
      })
      .slice(0, 5);
  }, [clients, query]);

  async function promote(uid: string) {
    setActionUid(uid);
    setError(null);
    try {
      await setUserMemberStatus(uid, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not promote member.");
    } finally {
      setActionUid(null);
    }
  }

  async function demote(uid: string) {
    if (!window.confirm("Remove member status?")) return;
    setActionUid(uid);
    try {
      await setUserMemberStatus(uid, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update member.");
    } finally {
      setActionUid(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-salon-gold">
          VIP clients
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-salon-ink">Members</h1>
        <p className="mt-2 text-sm text-salon-muted">
          Loyal clients promoted by admin — view history and notes.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-salon-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, email…"
            className="h-11 w-full rounded-xl border border-salon-beige/40 bg-salon-bg pl-9 pr-3 text-sm"
          />
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
          title="Last visit from"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
          title="Last visit to"
        />
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-salon-gold" />
        </div>
      ) : (
        <>
          {nonMembers.length > 0 && query ? (
            <div className="mb-6 rounded-2xl border border-salon-beige/30 bg-salon-surface p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-salon-muted">
                Promote to member
              </p>
              <ul className="space-y-2">
                {nonMembers.map((c) => (
                  <li
                    key={c.uid}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>
                      {c.firstName} {c.lastName} · {getProfilePhone(c) || "—"}
                    </span>
                    <button
                      type="button"
                      disabled={actionUid === c.uid}
                      onClick={() => void promote(c.uid)}
                      className="rounded-lg border border-salon-gold/40 px-2 py-1 text-xs font-semibold text-salon-gold"
                    >
                      Make member
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ul className="divide-y divide-salon-beige/30 rounded-2xl border border-salon-beige/30 bg-salon-surface">
            {filtered.length === 0 ? (
              <li className="px-4 py-12 text-center text-sm text-salon-muted">
                No members yet. Search a customer to promote them.
              </li>
            ) : (
              filtered.map((m) => {
                const phone = getProfilePhone(m);
                const stats = phone
                  ? bookingStats.get(phoneDocId(phone))
                  : undefined;
                return (
                  <li
                    key={m.uid}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-salon-gold" />
                        <p className="font-semibold text-salon-ink">
                          {m.firstName} {m.lastName}
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-salon-muted">
                        {m.email || "—"} · {phone || "—"}
                      </p>
                      <p className="mt-1 text-xs text-salon-muted">
                        {stats?.count ?? 0} booking(s)
                        {stats?.lastDate
                          ? ` · last ${formatDate(stats.lastDate)}`
                          : ""}
                        {m.memberSince
                          ? ` · member since ${formatDate(m.memberSince)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/members/${m.uid}`}
                        className="rounded-lg border border-salon-beige/40 px-3 py-2 text-xs font-semibold text-salon-ink"
                      >
                        View profile
                      </Link>
                      <button
                        type="button"
                        disabled={actionUid === m.uid}
                        onClick={() => void demote(m.uid)}
                        className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = parseISO(value);
    return isValid(d) ? format(d, "MMM d, yyyy") : value;
  }
  const d = parseISO(value);
  return isValid(d) ? format(d, "MMM d, yyyy") : value.slice(0, 10);
}
