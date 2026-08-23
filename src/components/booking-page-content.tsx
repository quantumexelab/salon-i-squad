"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { BookingFlow } from "@/components/booking-flow";
import { useAuth } from "@/contexts/auth-context";
import {
  canBootstrapMaster,
  ensureMasterRole,
} from "@/lib/bootstrap-master";
import { isMasterRole } from "@/lib/roles";

export function BookingPageContent() {
  const router = useRouter();
  const { user, profile, refreshProfile, loading } = useAuth();

  useEffect(() => {
    if (loading || !user || !profile) return;

    async function redirectStaffAwayFromBooking() {
      if (isMasterRole(profile.role)) {
        router.replace("/master");
        return;
      }
      if (profile.role === "admin") {
        router.replace("/admin");
        return;
      }
      if (canBootstrapMaster(user) && !isMasterRole(profile.role)) {
        try {
          await ensureMasterRole(user);
          await refreshProfile();
          router.replace("/master");
        } catch {
          router.replace("/claim-master");
        }
      }
    }

    void redirectStaffAwayFromBooking();
  }, [loading, user, profile, router, refreshProfile]);

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
