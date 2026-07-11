"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, LogOut, Shield, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";
import { createStaffAccount } from "@/lib/staff";

export function SettingsPageContent() {
  const router = useRouter();
  const { user, profile, isMaster, refreshProfile } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

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

  async function handleCreateStaff(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const staff = await createStaffAccount(form);
      setMessage(
        `Staff account created for ${staff.email}. They can sign in with email/password.`,
      );
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      await refreshProfile();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create staff account.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
          Account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Manage your session and salon staff access.
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

      {isMaster ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Staff management</h2>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-zinc-400">
            Create a sub-admin with email &amp; password. Uses a temporary Auth
            session so you stay logged in as master.
          </p>

          <form onSubmit={handleCreateStaff} className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs text-zinc-400">
              First name
              <input
                required
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-zinc-400">
              Last name
              <input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-zinc-400 sm:col-span-2">
              Temporary password
              <input
                required
                type="password"
                minLength={6}
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
                className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-white outline-none focus:border-amber-500/50"
              />
            </label>
            <button
              type="submit"
              disabled={creating}
              className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create staff admin"
              )}
            </button>
          </form>
        </section>
      ) : (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-xs text-zinc-500">
          Staff management is only available to the master owner account.
        </p>
      )}

      {message ? (
        <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
