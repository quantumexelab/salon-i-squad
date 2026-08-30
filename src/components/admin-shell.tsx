"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

const adminNav = [
  { href: "/admin", label: "Bookings" },
  { href: "/customers", label: "Customers" },
  { href: "/services", label: "Services" },
  { href: "/buffers", label: "Buffers" },
  { href: "/day-close", label: "Day Close" },
  { href: "/settings", label: "Settings" },
] as const;

function navLinkClass(active: boolean, compact = false) {
  const base = compact
    ? "whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium transition"
    : "rounded-xl px-3 py-2.5 text-sm font-medium transition";

  return active
    ? `${base} bg-salon-gold/10 text-salon-gold`
    : `${base} text-salon-muted hover:bg-salon-surface hover:text-salon-ink`;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, role } = useAuth();

  return (
    <AdminGuard>
      <div className="flex h-dvh overflow-hidden bg-salon-bg text-salon-ink">
        <aside className="hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-salon-beige/30 bg-salon-white/95 p-5 shadow-sm shadow-black/5 md:flex">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-salon-gold">
              Salon Owner Admin
            </p>
            <div className="mt-2">
              <LogoMark />
            </div>
            {profile ? (
              <p className="mt-1 text-xs text-salon-muted">
                {profile.firstName} · {role}
              </p>
            ) : null}
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {adminNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={navLinkClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto space-y-2 pt-4">
            <div className="flex justify-center pb-1">
              <ThemeToggle size="compact" />
            </div>
            <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-xl border border-salon-beige/40 px-3 py-2.5 text-sm font-semibold text-salon-muted transition hover:border-salon-gold/50 hover:text-salon-gold disabled:opacity-60" />
            <Link
              href="/booking"
              className="block rounded-xl border border-salon-beige/35 px-3 py-2 text-center text-xs text-salon-muted transition hover:border-salon-gold/40 hover:text-salon-ink"
            >
              ← Client booking app
            </Link>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 shrink-0 border-b border-salon-beige/30 bg-salon-white/95 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="md:hidden">
                  <LogoMark />
                </div>
                <p className="hidden text-sm font-semibold text-salon-ink md:block">
                  Salon Dashboard
                </p>
              </div>
              <div className="flex items-center gap-2">
                <nav className="flex gap-1 overflow-x-auto md:hidden">
                  {adminNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={navLinkClass(pathname === item.href, true)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <ThemeToggle size="compact" className="md:hidden" />
                <div className="md:hidden">
                  <LogoutButton compact tone="light" />
                </div>
              </div>
            </div>
          </header>
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </AdminGuard>
  );
}
