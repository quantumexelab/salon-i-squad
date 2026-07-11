"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Loader2, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";
import { createStaffAccount } from "@/lib/staff";
import { MasterBrandingSection } from "@/components/master-branding-section";

export function MasterDashboard() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
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

  async function handleCreateSalonAdmin(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setMessage(null);

    try {
      const admin = await createStaffAccount(form);
      setMessage(
        `Salon admin created for ${admin.email}. They sign in via Staff login and land on /admin.`,
      );
      setForm({ firstName: "", lastName: "", email: "", password: "" });
      await refreshProfile();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create salon admin account.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Platform control
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Create salon owner accounts. Each admin manages their salon bookings
          and settings in the separate <code className="text-zinc-300">/admin</code>{" "}
          dashboard — not here.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">
            Create Salon Admin Account
          </h3>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-zinc-400">
          Creates an Auth user with role <code className="text-zinc-300">admin</code>{" "}
          without signing you out (secondary Auth session).
        </p>

        <form
          onSubmit={handleCreateSalonAdmin}
          className="grid gap-3 sm:grid-cols-2"
        >
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-60 sm:col-span-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create salon admin"
            )}
          </button>
        </form>

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
      </section>

      <MasterBrandingSection />

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:border-zinc-500 disabled:opacity-60"
      >
        {loggingOut ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 text-amber-400" />
        )}
        Logout
      </button>
    </div>
  );
}
