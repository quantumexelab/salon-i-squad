"use client";

import { CalendarDays } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { BookingFlow } from "@/components/booking-flow";
import { useAuth } from "@/contexts/auth-context";

export function BookingPageContent() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <section className="relative flex flex-1 flex-col overflow-hidden bg-zinc-950 px-4 pb-4 pt-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/15 via-zinc-950 to-zinc-950" />

        <div className="relative z-10 mx-auto w-full max-w-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <CalendarDays className="h-5 w-5 text-amber-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                Book Appointment
              </h1>
              <p className="truncate text-xs text-zinc-400 sm:text-sm">
                Signed in as {user?.displayName ?? user?.email ?? user?.uid}
              </p>
            </div>
          </div>

          <BookingFlow />
        </div>
      </section>
    </AuthGuard>
  );
}
