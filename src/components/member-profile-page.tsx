"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import { ArrowLeft, ImagePlus, Loader2, Trash2, User } from "lucide-react";
import {
  subscribeToBookingsByUserId,
  type SavedBooking,
} from "@/lib/bookings";
import {
  clearMemberStyleImage,
  getProfilePhone,
  getUserProfile,
  updateMemberProfileFields,
  uploadMemberStyleImage,
  type MemberStyleKind,
} from "@/lib/users";
import type { UserProfile } from "@/types/firestore";

const STYLE_KINDS: { kind: MemberStyleKind; label: string }[] = [
  { kind: "hair", label: "Hair" },
  { kind: "beard", label: "Beard" },
  { kind: "facial", label: "Facial" },
];

export function MemberProfilePage({ uid }: { uid: string }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [hairType, setHairType] = useState("");
  const [conditions, setConditions] = useState("");
  const [memberNotes, setMemberNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState<MemberStyleKind | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function refreshProfile() {
    const p = await getUserProfile(uid);
    setProfile(p);
  }

  async function handleSaveNotes() {
    setSaving(true);
    setError(null);
    try {
      await updateMemberProfileFields(uid, {
        hairType,
        conditions,
        memberNotes,
      });
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStyleUpload(kind: MemberStyleKind, file: File) {
    setImageBusy(kind);
    setError(null);
    try {
      await uploadMemberStyleImage(uid, kind, file);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setImageBusy(null);
    }
  }

  async function handleStyleClear(kind: MemberStyleKind) {
    if (!window.confirm(`Remove ${kind} photo?`)) return;
    setImageBusy(kind);
    setError(null);
    try {
      await clearMemberStyleImage(uid, kind);
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove image.");
    } finally {
      setImageBusy(null);
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

  const phone = getProfilePhone(profile);
  const memberSinceLabel = profile.memberSince
    ? formatSafeDate(profile.memberSince)
    : null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href="/members"
        className="mb-6 inline-flex items-center gap-1 text-sm text-salon-gold"
      >
        <ArrowLeft className="h-4 w-4" /> Back to members
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-salon-beige/40 bg-salon-surface sm:mx-0">
          {profile.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-salon-muted">
              <User className="h-10 w-10" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-2xl font-semibold text-salon-ink">
            {profile.firstName} {profile.lastName}
          </h1>
          <dl className="mt-2 space-y-1 text-sm text-salon-muted">
            {profile.email ? (
              <div>
                <dt className="sr-only">Email</dt>
                <dd className="truncate">{profile.email}</dd>
              </div>
            ) : null}
            {phone ? (
              <div>
                <dt className="sr-only">Phone</dt>
                <dd>{phone}</dd>
              </div>
            ) : null}
            {profile.whatsappNumber ? (
              <div>
                <dt className="sr-only">WhatsApp</dt>
                <dd>WhatsApp {profile.whatsappNumber}</dd>
              </div>
            ) : null}
            {profile.gender ? (
              <div>
                <dt className="sr-only">Gender</dt>
                <dd className="capitalize">{profile.gender.replaceAll("_", " ")}</dd>
              </div>
            ) : null}
            {memberSinceLabel ? (
              <div>
                <dt className="sr-only">Member since</dt>
                <dd>Member since {memberSinceLabel}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-salon-ink">
          Style references
        </h2>
        <p className="mb-4 text-xs text-salon-muted">
          One photo each for hair, beard, and facial. Replacing overwrites the
          previous image — nothing is kept in history.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {STYLE_KINDS.map(({ kind, label }) => (
            <StyleImageSlot
              key={kind}
              label={label}
              url={profile.memberImages?.[kind]}
              busy={imageBusy === kind}
              onUpload={(file) => void handleStyleUpload(kind, file)}
              onClear={() => void handleStyleClear(kind)}
            />
          ))}
        </div>
      </div>

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

function StyleImageSlot({
  label,
  url,
  busy,
  onUpload,
  onClear,
}: {
  label: string;
  url?: string;
  busy: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-salon-beige/30 bg-salon-surface">
      <div className="relative aspect-square bg-salon-bg">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-salon-muted">
            <ImagePlus className="h-8 w-8" />
            <span className="text-xs">No photo</span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-salon-gold" />
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-3">
        <p className="text-sm font-semibold text-salon-ink">{label}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onUpload(file);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex h-9 w-full items-center justify-center rounded-lg border border-salon-gold/40 text-xs font-semibold text-salon-gold disabled:opacity-60"
        >
          {url ? "Replace" : "Add photo"}
        </button>
        {url ? (
          <button
            type="button"
            disabled={busy}
            onClick={onClear}
            className="flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-salon-beige/40 text-xs font-semibold text-salon-muted disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

function formatSafeDate(iso: string): string | null {
  try {
    const d = parseISO(iso.slice(0, 10));
    if (isValid(d)) return format(d, "MMM d, yyyy");
  } catch {
    /* ignore */
  }
  return null;
}

function formatWhen(b: SavedBooking): string {
  if (b.dateKey) {
    const d = parseISO(b.dateKey);
    if (isValid(d)) return `${format(d, "MMM d, yyyy")} ${b.selectedTime}`;
  }
  return `${b.selectedTime}`;
}
