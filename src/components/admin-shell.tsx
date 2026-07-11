"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminGuard } from "@/components/admin-guard";
import { LogoMark } from "@/components/logo";
import { useAuth } from "@/contexts/auth-context";

const adminNav = [
  { href: "/admin", label: "Bookings" },
  { href: "/customers", label: "Customers" },
  { href: "/services", label: "Services" },
  { href: "/buffers", label: "Buffers" },
  { href: "/day-close", label: "Day Close" },
  { href: "/settings", label: "Settings" },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, role } = useAuth();

  return (
    <AdminGuard>
      <div className="flex min-h-full bg-zinc-950 text-zinc-50">
        <aside className="hidden w-60 shrink-0 border-r border-zinc-800 bg-zinc-950 p-5 md:flex md:flex-col">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-400">
              Salon Owner Admin
            </p>
            <div className="mt-2">
              <LogoMark />
            </div>
            {profile ? (
              <p className="mt-1 text-xs text-zinc-500">
                {profile.firstName} · {role}
              </p>
            ) : null}
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {adminNav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-amber-400/10 text-amber-300"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/booking"
            className="mt-auto rounded-xl border border-zinc-800 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          >
            ← Client booking app
          </Link>
        </aside>

        <div className="flex min-h-full flex-1 flex-col">
          <header className="border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="md:hidden">
                  <LogoMark />
                </div>
                <p className="hidden text-sm font-semibold text-white md:block">
                  Salon Dashboard
                </p>
              </div>
              <nav className="flex gap-1 overflow-x-auto md:hidden">
                {adminNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                      pathname === item.href
                        ? "bg-amber-400/10 text-amber-300"
                        : "text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </div>
    </AdminGuard>
  );
}
