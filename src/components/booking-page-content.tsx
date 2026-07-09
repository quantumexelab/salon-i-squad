"use client";

import { CalendarDays } from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";

export function BookingPageContent() {
  const { user } = useAuth();

  return (
    <AuthGuard>
      <section className="px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <CalendarDays className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Book Appointment</h1>
              <p className="text-sm text-zinc-400">
                Signed in as {user?.email ?? user?.uid}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
            <p className="text-sm text-zinc-400">
              Smart calendar booking with service-based slots will be built here
              next.
            </p>
          </div>
        </div>
      </section>
    </AuthGuard>
  );
}
