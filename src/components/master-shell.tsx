"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { MasterGuard } from "@/components/master-guard";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

function masterNavLinkClass(active: boolean) {
  return active
    ? "rounded-lg bg-salon-gold/10 px-3 py-2 font-medium text-salon-gold"
    : "rounded-lg border border-salon-beige/40 px-3 py-2 text-salon-muted transition hover:border-salon-gold/40 hover:text-salon-ink";
}

export function MasterShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, user } = useAuth();

  return (
    <MasterGuard>
      <div className="flex h-dvh flex-col overflow-hidden bg-salon-bg text-salon-ink">
        <header className="sticky top-0 z-20 shrink-0 border-b border-salon-beige/30 bg-salon-white/95 px-4 py-4 shadow-sm shadow-black/5 backdrop-blur md:px-8">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-salon-gold">
                QuantumExe · System Owner
              </p>
              <div className="mt-1">
                <Logo textClassName="text-lg font-semibold text-salon-ink" />
              </div>
              <p className="mt-0.5 text-xs text-salon-muted">
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
                className={masterNavLinkClass(pathname === "/master")}
              >
                Salon admins
              </Link>
              <Link
                href="/master/calendar"
                className={masterNavLinkClass(pathname === "/master/calendar")}
              >
                Calendar
              </Link>
              <Link href="/admin" className={masterNavLinkClass(false)}>
                View salon admin
              </Link>
              <Link href="/booking" className={masterNavLinkClass(false)}>
                Client app
              </Link>
              <ThemeToggle size="compact" />
              <LogoutButton compact tone="light" />
            </nav>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col overflow-y-auto px-4 py-8 md:px-8">
          {children}
        </main>
      </div>
    </MasterGuard>
  );
}
