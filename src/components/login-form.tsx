"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Loader2, Scissors, UserRound } from "lucide-react";
import { GuestDetailsModal } from "@/components/guest-details-modal";
import { getFirebaseAuth, initFirebase } from "@/lib/firebase";
import { homeForRole } from "@/lib/routing";
import { isStaffRole } from "@/lib/roles";
import {
  createGuestUserProfile,
  isValidMobile,
  upsertEmailUserProfile,
  upsertGoogleUserProfile,
} from "@/lib/users";
import { siteConfig } from "@/lib/site";
import { useAuth } from "@/contexts/auth-context";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const { user, loading: authLoading, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState<"google" | "guest" | "staff" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [guestModalOpen, setGuestModalOpen] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  useEffect(() => {
    if (!authLoading && user && profile) {
      router.replace(homeForRole(profile.role));
    }
  }, [authLoading, user, profile, router]);

  async function handleGoogleSignIn() {
    setLoading("google");
    setError(null);

    try {
      initFirebase();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(getFirebaseAuth(), provider);
      const nextProfile = await upsertGoogleUserProfile(result.user);
      await refreshProfile();
      router.push(homeForRole(nextProfile.role));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google sign-in failed. Try again.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleStaffSignIn(e: FormEvent) {
    e.preventDefault();
    setLoading("staff");
    setError(null);

    try {
      initFirebase();
      const result = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        staffEmail.trim(),
        staffPassword,
      );
      const nextProfile = await upsertEmailUserProfile(result.user);
      await refreshProfile();

      if (!isStaffRole(nextProfile.role)) {
        setError("This account is not a salon admin or master.");
        return;
      }

      router.push(homeForRole(nextProfile.role));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Staff sign-in failed. Try again.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleGuestSubmit({
    name,
    mobile,
  }: {
    name: string;
    mobile: string;
  }) {
    if (!isValidMobile(mobile)) {
      throw new Error("Please enter a valid mobile number.");
    }

    setLoading("guest");
    setError(null);

    try {
      initFirebase();
      const result = await signInAnonymously(getFirebaseAuth());
      await createGuestUserProfile(result.user.uid, name, mobile);
      await refreshProfile();
      setGuestModalOpen(false);
      router.push("/booking");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/40">
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-amber-500/10 to-transparent" />

        <div className="relative px-8 pb-8 pt-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Scissors className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {siteConfig.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Book your next haircut, styling, or treatment in seconds.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading !== null}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-4 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "google" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setGuestModalOpen(true);
              }}
              disabled={loading !== null}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:border-zinc-500 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading === "guest" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <UserRound className="h-5 w-5 text-amber-400" />
              )}
              Continue as Guest
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowStaffLogin((v) => !v)}
            className="mt-4 w-full text-center text-xs font-medium text-zinc-500 hover:text-amber-400"
          >
            {showStaffLogin ? "Hide staff sign-in" : "Staff / admin sign-in"}
          </button>

          {showStaffLogin ? (
            <form onSubmit={handleStaffSignIn} className="mt-3 space-y-2">
              <input
                type="email"
                required
                placeholder="Staff email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-amber-500/40"
              />
              <input
                type="password"
                required
                placeholder="Password"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-amber-500/40"
              />
              <button
                type="submit"
                disabled={loading !== null}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-bold text-zinc-950 disabled:opacity-60"
              >
                {loading === "staff" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Sign in as staff
              </button>
            </form>
          ) : null}

          {error && (
            <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs leading-relaxed text-zinc-500">
            By continuing, you agree to our booking terms. Guest sessions can book
            without creating a full account.
          </p>
        </div>
      </div>

      <GuestDetailsModal
        open={guestModalOpen}
        onClose={() => setGuestModalOpen(false)}
        onSubmit={handleGuestSubmit}
      />
    </>
  );
}
