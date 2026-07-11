"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import {
  canBootstrapMaster,
  MASTER_BOOTSTRAP_EMAIL,
  promoteMasterByEmail,
} from "@/lib/bootstrap-master";

export function ClaimMasterContent() {
  const router = useRouter();
  const { user, profile, refreshProfile, isMaster } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const eligible = canBootstrapMaster(user);

  async function handlePromote() {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      await promoteMasterByEmail(user);
      await refreshProfile();
      setDone(true);
      router.replace("/admin");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not promote account. Check Firestore rules.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <section className="flex flex-1 items-center justify-center bg-zinc-950 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
            <Crown className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-white">Claim master role</h1>
          <p className="mt-2 text-sm text-zinc-400">
            One-time bootstrap for <span className="text-amber-300">{MASTER_BOOTSTRAP_EMAIL}</span>.
            This finds your <code className="text-zinc-300">users</code> document
            by email and sets <code className="text-zinc-300">role: &quot;master&quot;</code>.
          </p>

          <p className="mt-4 text-xs text-zinc-500">
            Signed in as: {user?.email ?? "—"} · current role:{" "}
            {profile?.role ?? "…"}
          </p>

          {isMaster || done ? (
            <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              You are already master. Go to{" "}
              <button
                type="button"
                className="underline"
                onClick={() => router.push("/admin")}
              >
                /admin
              </button>
              .
            </p>
          ) : eligible ? (
            <button
              type="button"
              disabled={loading}
              onClick={handlePromote}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 hover:bg-amber-300 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Promoting…
                </>
              ) : (
                "Make me master now"
              )}
            </button>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Sign in with Google as <strong>{MASTER_BOOTSTRAP_EMAIL}</strong>{" "}
              first, then reopen this page.
            </p>
          )}

          {error ? (
            <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </section>
    </AuthGuard>
  );
}
