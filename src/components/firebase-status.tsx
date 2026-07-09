"use client";

import { useAuth } from "@/contexts/auth-context";

const useEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";

export function FirebaseStatus() {
  const { isConfigured, loading, user } = useAuth();
  const emulators = useEmulators;

  if (!isConfigured) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Firebase is not configured yet. Copy <code>.env.local.example</code> to{" "}
        <code>.env.local</code> and add your project keys.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-xs text-zinc-500">Checking authentication...</p>
    );
  }

  return (
    <p className="text-xs text-emerald-700">
      Firebase connected
      {emulators ? " (local emulators)" : ""}
      {user ? ` · Signed in as ${user.email ?? user.uid}` : " · Not signed in"}
    </p>
  );
}
