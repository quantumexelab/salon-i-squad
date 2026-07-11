"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";

export function SettingsPageContent() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      initFirebase();
      await signOut(getFirebaseAuth());
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed.");
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Salon account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Salon owner session settings. Platform account creation lives in the
          Master console.
        </p>
      </div>

      <section className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Signed in</h2>
            <p className="mt-1 text-sm text-zinc-300">
              {profile
                ? `${profile.firstName} ${profile.lastName}`.trim()
                : user?.email ?? user?.uid}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {user?.email ?? "No email"} · role:{" "}
              <span className="text-amber-300">{profile?.role ?? "…"}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:border-zinc-500 disabled:opacity-60"
        >
          {loggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 text-amber-400" />
          )}
          Logout
        </button>
      </section>

      {error ? (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
