"use client";

import { AuthGuard } from "@/components/auth-guard";
import { ClientProfilePage } from "@/components/client-profile-page";

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ClientProfilePage />
    </AuthGuard>
  );
}
