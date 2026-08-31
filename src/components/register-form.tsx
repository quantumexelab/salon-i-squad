"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import {
  completeClientRegistration,
  isProfileRegistrationComplete,
} from "@/lib/users";
import type { Gender } from "@/types/firestore";

export function RegisterForm() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [firstName, setFirstName] = useState(profile?.firstName ?? "");
  const [lastName, setLastName] = useState(profile?.lastName ?? "");
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? "");
  const [phone, setPhone] = useState(profile?.phoneNumber ?? profile?.mobile ?? "");
  const [whatsapp, setWhatsapp] = useState(profile?.whatsappNumber ?? "");
  const [gender, setGender] = useState<Gender | "">(profile?.gender ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && isProfileRegistrationComplete(profile)) {
      router.replace("/booking");
    }
  }, [profile, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError(null);
    try {
      await completeClientRegistration({
        uid: user.uid,
        firstName,
        lastName,
        email,
        phoneNumber: phone,
        whatsappNumber: whatsapp,
        gender: gender || undefined,
      });
      await refreshProfile();
      router.replace("/booking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid w-full max-w-md gap-4 rounded-2xl border border-salon-beige/35 bg-salon-surface p-6"
    >
      <div>
        <h1 className="text-xl font-semibold text-salon-ink">Complete your profile</h1>
        <p className="mt-1 text-sm text-salon-muted">
          Required before your first booking — name, email, phone & WhatsApp.
        </p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <label className="grid gap-1 text-xs text-salon-muted">
        First name
        <input
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        />
      </label>
      <label className="grid gap-1 text-xs text-salon-muted">
        Last name
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        />
      </label>
      <label className="grid gap-1 text-xs text-salon-muted">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        />
      </label>
      <label className="grid gap-1 text-xs text-salon-muted">
        Phone number
        <input
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07X XXX XXXX"
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        />
      </label>
      <label className="grid gap-1 text-xs text-salon-muted">
        WhatsApp number
        <input
          required
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="07X XXX XXXX"
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        />
      </label>
      <label className="grid gap-1 text-xs text-salon-muted">
        Gender (optional)
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value as Gender | "")}
          className="h-11 rounded-xl border border-salon-beige/40 bg-salon-bg px-3 text-sm text-salon-ink"
        >
          <option value="">Prefer not to say</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={saving}
        className="salon-gold-btn mt-2 flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-black disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Save & continue to booking
      </button>
    </form>
  );
}
