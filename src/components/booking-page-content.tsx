"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Loader2 } from "lucide-react";
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
      <section className="relative flex flex-1 flex-col bg-salon-bg px-4 pb-4 pt-4 md:px-6 md:pt-6">
        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1
                className="text-2xl font-semibold tracking-tight text-salon-ink md:text-3xl"
                style={{
                  fontFamily: "var(--font-landing-display, Georgia), serif",
                }}
              >
                Book Your Appointment
              </h1>
              <p className="mt-1 text-sm text-salon-muted">
                Select one or more services, then continue to date & time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/my-bookings"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-salon-gold/40 bg-salon-gold/10 px-3 text-xs font-semibold text-salon-gold hover:bg-salon-gold/20"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                My bookings
              </Link>
              <Link
                href="/"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-salon-beige/40 bg-salon-white px-3 text-xs font-semibold text-salon-ink hover:border-salon-gold/40"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Home
              </Link>
            </div>
          </div>

          <BookingFlow />
        </div>
      </section>
    </AuthGuard>
  );
}
