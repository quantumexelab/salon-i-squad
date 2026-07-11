"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site";
import { useAuth } from "@/contexts/auth-context";

const clientNav = [
  { href: "/booking", label: "Book" },
  { href: "/my-bookings", label: "My bookings" },
] as const;

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const showNav =
    pathname.startsWith("/booking") ||
    pathname.startsWith("/my-bookings") ||
    pathname.startsWith("/reschedule");

  return (
    <div className="flex min-h-full flex-col bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide text-zinc-50">
              {siteConfig.name}
            </p>
            {user && showNav ? (
              <p className="truncate text-[11px] text-zinc-500">
                {user.displayName ?? user.email ?? "Signed in"}
              </p>
            ) : null}
          </div>
          {showNav ? (
            <nav className="flex shrink-0 gap-1">
              {clientNav.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "bg-amber-400/10 text-amber-300"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
