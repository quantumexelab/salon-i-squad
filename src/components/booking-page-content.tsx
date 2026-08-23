"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { BookingFlow } from "@/components/booking-flow";
import { useAuth } from "@/contexts/auth-context";
import {
  canBootstrapMaster,
  ensureMasterRole,
  MASTER_BOOTSTRAP_EMAIL,
} from "@/lib/bootstrap-master";
import { isMasterRole } from "@/lib/roles";

export function BookingPageContent() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const [redirectError, setRedirectError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;

    const currentUser = user;
    const currentProfile = profile;

    async function redirectStaffAwayFromBooking() {
      // Master owner email must never stay on the client booking page —
      // even when the Firestore profile doc is still missing.
      if (canBootstrapMaster(currentUser)) {
        setRedirecting(true);
        setRedirectError(null);
        try {
          await ensureMasterRole(currentUser);
          await refreshProfile();
          router.replace("/master");
        } catch (err) {
          setRedirectError(
            err instanceof Error
              ? err.message
              : "Could not open master console.",
          );
          router.replace("/claim-master");
        }
        return;
      }

      if (!currentProfile) return;

      if (isMasterRole(currentProfile.role)) {
        router.replace("/master");
        return;
      }
      if (currentProfile.role === "admin") {
        router.replace("/admin");
      }
    }

    void redirectStaffAwayFromBooking();
  }, [loading, user, profile, router, refreshProfile]);

  if (canBootstrapMaster(user) || redirecting) {
    return (
      <AuthGuard>
        <section className="flex flex-1 flex-col items-center justify-center gap-3 bg-salon-bg px-4 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-salon-gold" />
          <p className="text-sm text-salon-muted">
            Opening master console for {MASTER_BOOTSTRAP_EMAIL}…
          </p>
          {redirectError ? (
            <p className="max-w-md text-center text-xs text-red-600">
              {redirectError}{" "}
              <Link href="/claim-master" className="underline">
                Claim master
              </Link>
            </p>
          ) : null}
        </section>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <section className="relative flex flex-1 flex-col overflow-hidden bg-salon-bg px-4 pb-4 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-salon-gold/8 via-salon-bg to-salon-bg" />

        <div className="relative z-10 mx-auto w-full max-w-lg">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-salon-gold/10 ring-1 ring-salon-gold/25">
                <CalendarDays className="h-5 w-5 text-salon-gold" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-salon-ink sm:text-2xl">
                  Book Appointment
                </h1>
                <p className="truncate text-xs text-salon-muted sm:text-sm">
                  Signed in as{" "}
                  {user?.email ?? user?.displayName ?? user?.uid}
                  {profile?.role ? ` · ${profile.role}` : ""}
                </p>
              </div>
            </div>
            <Link
              href="/my-bookings"
              className="shrink-0 rounded-xl border border-salon-gold/30 px-3 py-2 text-xs font-semibold text-salon-gold"
            >
              My bookings
            </Link>
          </div>

          <BookingFlow />
        </div>
      </section>
    </AuthGuard>
  );
}
