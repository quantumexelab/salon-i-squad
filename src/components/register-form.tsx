"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ClientProfileForm } from "@/components/client-profile-form";
import {
  completeClientRegistration,
  isProfileRegistrationComplete,
} from "@/lib/users";

export function RegisterForm() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && isProfileRegistrationComplete(profile)) {
      router.replace("/booking");
    }
  }, [profile, router]);

  return (
    <ClientProfileForm
      mode="register"
      initialProfile={profile}
      defaultEmail={user?.email ?? ""}
      submitLabel="Save & continue to booking"
      saving={saving}
      error={error}
      onSubmit={async (values) => {
        if (!user) return;

        setSaving(true);
        setError(null);
        try {
          await completeClientRegistration({
            uid: user.uid,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            phoneNumber: values.phoneNumber,
            whatsappNumber: values.whatsappNumber,
            gender: values.gender,
          });
          await refreshProfile();
          router.replace("/booking");
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Registration failed.",
          );
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
