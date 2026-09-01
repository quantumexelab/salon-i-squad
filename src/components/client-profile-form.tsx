"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, Loader2, User } from "lucide-react";
import type { Gender, UserProfile } from "@/types/firestore";

export type ClientProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber: string;
  gender?: Gender;
  photoFile?: File | null;
  removePhoto?: boolean;
};

type ClientProfileFormProps = {
  mode: "register" | "edit";
  initialProfile?: UserProfile | null;
  defaultEmail?: string;
  submitLabel: string;
  saving?: boolean;
  error?: string | null;
  success?: string | null;
  onSubmit: (values: ClientProfileFormValues) => void | Promise<void>;
};

export function ClientProfileForm({
  mode,
  initialProfile,
  defaultEmail = "",
  submitLabel,
  saving = false,
  error = null,
  success = null,
  onSubmit,
}: ClientProfileFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [firstName, setFirstName] = useState(initialProfile?.firstName ?? "");
  const [lastName, setLastName] = useState(initialProfile?.lastName ?? "");
  const [email, setEmail] = useState(
    initialProfile?.email ?? defaultEmail,
  );
  const [phone, setPhone] = useState(
    initialProfile?.phoneNumber ?? initialProfile?.mobile ?? "",
  );
  const [whatsapp, setWhatsapp] = useState(
    initialProfile?.whatsappNumber ?? "",
  );
  const [gender, setGender] = useState<Gender | "">(
    initialProfile?.gender ?? "",
  );
  const [photoPreview, setPhotoPreview] = useState(
    initialProfile?.photoUrl ?? "",
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    setFirstName(initialProfile?.firstName ?? "");
    setLastName(initialProfile?.lastName ?? "");
    setEmail(initialProfile?.email ?? defaultEmail);
    setPhone(initialProfile?.phoneNumber ?? initialProfile?.mobile ?? "");
    setWhatsapp(initialProfile?.whatsappNumber ?? "");
    setGender(initialProfile?.gender ?? "");
    setPhotoPreview(initialProfile?.photoUrl ?? "");
    setPhotoFile(null);
    setRemovePhoto(false);
  }, [initialProfile, defaultEmail]);

  useEffect(() => {
    if (!photoFile) return;
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      firstName,
      lastName,
      email,
      phoneNumber: phone,
      whatsappNumber: whatsapp,
      gender: gender || undefined,
      photoFile,
      removePhoto,
    });
  }

  function handlePhotoChange(file: File | null) {
    if (!file) return;
    setPhotoFile(file);
    setRemovePhoto(false);
  }

  function handleRemovePhoto() {
    setPhotoFile(null);
    setPhotoPreview("");
    setRemovePhoto(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const showAvatar = mode === "edit" || photoPreview;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto grid w-full max-w-md gap-4 rounded-2xl border border-salon-beige/35 bg-salon-surface p-6"
    >
      {mode === "register" ? (
        <div>
          <h1 className="text-xl font-semibold text-salon-ink">
            Complete your profile
          </h1>
          <p className="mt-1 text-sm text-salon-muted">
            Required before your first booking — name, email, phone & WhatsApp.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}

      {showAvatar ? (
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-salon-gold/40 bg-salon-bg">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoPreview}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-salon-muted">
                <User className="h-10 w-10" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-salon-beige/50 bg-salon-bg px-3 py-1.5 text-xs font-medium text-salon-ink transition hover:border-salon-gold/50"
            >
              <Camera className="h-3.5 w-3.5" />
              Change photo
            </button>
            {photoPreview ? (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="rounded-full px-3 py-1.5 text-xs font-medium text-salon-muted transition hover:text-red-400"
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
        </div>
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
        {submitLabel}
      </button>
    </form>
  );
}
