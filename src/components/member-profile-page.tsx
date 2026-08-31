"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  subscribeToBookingsByUserId,
  type SavedBooking,
} from "@/lib/bookings";
import {
  getUserProfile,
  updateMemberProfileFields,
} from "@/lib/users";

export function MemberProfilePage({ uid }: { uid: string }) {
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof getUserProfile>
  > | null>(null);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hairType, setHairType] = useState("");
  const [conditions, setConditions] = useState("");
  const [memberNotes, setMemberNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getUserProfile(uid).then((p) => {
      setProfile(p);
      setHairType(p?.hairType ?? "");
      setConditions(p?.conditions ?? "");
      setMemberNotes(p?.memberNotes ?? "");
      setLoading(false);
    });
    return subscribeToBookingsByUserId(uid, setBookings);
  }, [uid]);

  async function handleSaveNotes() {
    setSaving(true);
    try {
      await updateMemberProfileFields(uid, {
        hairType,
        conditions,
        memberNotes,
      });
      setProfile(await getUserProfile(uid));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-salon-gold" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="px-4 py-20 text-center text-salon-muted">Member not found.</p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/members"
        className="mb-6 inline-flex items-center gap-1 text-sm text-salon-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      <h1 className="text-2xl font-semibold text-salon-ink">
        {profile.firstName} {profile.lastName}
      </h1>
      <p className="mt-1 text-sm text-salon-muted">
        {profile.email} · {profile.phoneNumber || profile.mobile}
        {profile.whatsappNumber
          ? ` · WhatsApp ${profile.whatsappNumber}`
          : ""}
      </p>

      <div className="mt-6 grid gap-3 rounded-2xl border border-salon-beige/30 bg-salon-surface p-5">
        <h2 className="text-sm font-semibold text-salon-ink">Member notes</h2>
        <label className="grid gap-1 text-xs text-salon-muted">
          Hair type
          <input
            value={hairType}
            onChange={(e) => setHairType(e.target.value)}
            className="h-10 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-salon-muted">
          Conditions / allergies
          <textarea
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            rows={2}
            className="rounded-xl border border-salon-beige/40 bg-salon-bg px-3 py-2 text-sm"
          />
        </label>
        <label className="grid gap-1 text-xs text-salon-muted">
          Admin notes
          <textarea
            value={memberNotes}
            onChange={(e) => setMemberNotes(e.target.value)}
            rows={3}
            className="rounded-xl border border-salon-beige/40 bg-salon-bg px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSaveNotes()}
          className="salon-gold-btn h-10 rounded-xl text-sm font-bold text-black disabled:opacity-60"
        >
          Save notes
        </button>
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-salon-ink">
        Booking history ({bookings.length})
      </h2>
      <ul className="divide-y divide-salon-beige/30 rounded-2xl border border-salon-beige/30 bg-salon-surface">
        {bookings.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-salon-muted">
            No bookings linked to this account yet.
          </li>
        ) : (
          bookings.map((b) => (
            <li key={b.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-salon-ink">
                #{b.appointmentNumber ?? "—"} · {b.serviceName}
              </p>
              <p className="text-xs text-salon-muted">
                {formatWhen(b)} · {b.status}
                {b.hairType ? ` · hair: ${b.hairType}` : ""}
              </p>
              {b.adminNotes ? (
                <p className="mt-1 text-xs text-salon-muted">{b.adminNotes}</p>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function formatWhen(b: SavedBooking): string {
  if (b.dateKey) {
    const d = parseISO(b.dateKey);
    if (isValid(d)) return `${format(d, "MMM d, yyyy")} ${b.selectedTime}`;
  }
  return `${b.selectedTime}`;
}
