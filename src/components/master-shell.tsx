"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { MasterGuard } from "@/components/master-guard";
import { useAuth } from "@/contexts/auth-context";

export function MasterShell({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();

  return (
    <MasterGuard>
      <div className="flex min-h-full flex-col bg-zinc-950 text-zinc-50">
        <header className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                QuantumExe · System Owner
              </p>
              <div className="mt-1">
                <Logo textClassName="text-lg font-semibold text-white" />
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                Master Console ·{" "}
                {profile
                  ? `${profile.firstName} ${profile.lastName}`.trim()
                  : user?.email}{" "}
                · master
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-xs">
              <Link
                href="/master"
                className="rounded-lg bg-amber-400/10 px-3 py-2 font-medium text-amber-300"
              >
                Salon admins
              </Link>
              <Link
                href="/master/calendar"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500"
              >
                Calendar
              </Link>
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500"
              >
                View salon admin
              </Link>
              <Link
                href="/booking"
                className="rounded-lg border border-zinc-700 px-3 py-2 text-zinc-300 hover:border-zinc-500"
              >
                Client app
              </Link>
              <LogoutButton compact />
            </nav>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </MasterGuard>
  );
}
