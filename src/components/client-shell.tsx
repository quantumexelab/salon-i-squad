"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { CustomerLogo, useLogoSessionAnimation } from "@/components/logo";
import { ClientMobileNav } from "@/components/client-mobile-nav";
import { LogoutButton } from "@/components/logout-button";
import { PushNotificationBootstrap } from "@/components/push-notification-bootstrap";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

const clientNav = [
  { href: "/booking", label: "Book" },
  { href: "/my-bookings", label: "My bookings" },
] as const;

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const animateLogo = useLogoSessionAnimation();

  const showNav =
    pathname.startsWith("/booking") ||
    pathname.startsWith("/my-bookings") ||
    pathname.startsWith("/reschedule");

  const hideChromeHeader = pathname === "/login";
  const isLogin = pathname === "/login";

  return (
    <div
      className={`flex min-h-full flex-col bg-salon-bg text-salon-ink ${
        isLogin ? "" : "pb-[calc(4.5rem+env(safe-area-inset-bottom))]"
      } md:pb-0`}
    >
      <PushNotificationBootstrap />
      {!hideChromeHeader ? (
        <header className="sticky top-0 z-20 border-b border-salon-beige/30 bg-salon-white/95 shadow-sm shadow-black/5 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              <CustomerLogo size="mark" animated={animateLogo} />
              <span className="hidden truncate font-serif text-[11px] font-medium uppercase tracking-[0.24em] text-salon-ink sm:inline">
                Salon <span className="text-salon-script">I</span> Squad
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <ThemeToggle size="compact" />
              {showNav ? (
                <>
                  <nav className="flex gap-1">
                    {clientNav.map((item) => {
                      const active =
                        pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                            active
                              ? "salon-gold-btn text-black shadow-sm shadow-salon-gold/20"
                              : "text-salon-muted hover:bg-salon-surface hover:text-salon-ink"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                  {user ? <LogoutButton compact tone="light" /> : null}
                </>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}
      <main className="flex flex-1 flex-col">{children}</main>
      <ClientMobileNav />
    </div>
  );
}
