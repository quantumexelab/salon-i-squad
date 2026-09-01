"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Crown, Loader2 } from "lucide-react";
import { ClientProfileForm } from "@/components/client-profile-form";
import { useAuth } from "@/contexts/auth-context";
import {
  isProfileRegistrationComplete,
  updateClientProfile,
  uploadProfilePhoto,
} from "@/lib/users";

export function ClientProfilePage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (!isProfileRegistrationComplete(profile)) {
      router.replace("/register");
    }
  }, [profile, router]);

  if (!profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-salon-gold" />
      </div>
    );
  }

  if (!isProfileRegistrationComplete(profile)) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-salon-ink">My profile</h1>
        <p className="mt-1 text-sm text-salon-muted">
          Update your contact details and profile photo.
        </p>
        {profile.isMember ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-salon-gold/40 bg-salon-gold/10 px-3 py-1 text-xs font-semibold text-salon-gold">
            <Crown className="h-3.5 w-3.5" />
            VIP Member
            {profile.memberSince
              ? ` · since ${new Date(profile.memberSince).toLocaleDateString()}`
              : ""}
          </p>
        ) : null}
      </div>

      <ClientProfileForm
        mode="edit"
        initialProfile={profile}
        defaultEmail={user?.email ?? ""}
        submitLabel="Save changes"
        saving={saving}
        error={error}
        success={success}
        onSubmit={async (values) => {
          if (!user) return;

          setSaving(true);
          setError(null);
          setSuccess(null);

          try {
            let photoUrl: string | undefined = profile.photoUrl;

            if (values.removePhoto) {
              photoUrl = "";
            } else if (values.photoFile) {
              photoUrl = await uploadProfilePhoto(user.uid, values.photoFile);
            }

            await updateClientProfile({
              uid: user.uid,
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email,
              phoneNumber: values.phoneNumber,
              whatsappNumber: values.whatsappNumber,
              gender: values.gender,
              photoUrl,
            });
            await refreshProfile();
            setSuccess("Profile updated successfully.");
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Could not save profile.",
            );
          } finally {
            setSaving(false);
          }
        }}
      />

      <p className="mt-6 text-center text-sm text-salon-muted">
        <Link href="/my-bookings" className="text-salon-gold hover:underline">
          View my bookings
        </Link>
      </p>
    </section>
  );
}
