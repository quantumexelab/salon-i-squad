"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Menu, X } from "lucide-react";
import { AdminGuard } from "@/components/admin-guard";
import { LogoMark } from "@/components/logo";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";

const adminNav = [
  { href: "/admin", label: "Bookings" },
  { href: "/customers", label: "Customers" },
  { href: "/members", label: "Members" },
  { href: "/services", label: "Services" },
  { href: "/team", label: "Team" },
  { href: "/buffers", label: "Buffers" },
  { href: "/day-close", label: "Day Close" },
  { href: "/settings", label: "Settings" },
] as const;

function isNavActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin" || pathname === "/dashboard";
  if (href === "/members") return pathname === "/members" || pathname.startsWith("/members/");
  return pathname === href;
}

function navLinkClass(active: boolean) {
  return active
    ? "rounded-xl bg-salon-gold/10 px-3 py-2.5 text-sm font-medium text-salon-gold transition"
    : "rounded-xl px-3 py-2.5 text-sm font-medium text-salon-muted transition hover:bg-salon-surface hover:text-salon-ink";
}

function AdminNavPanel({
  pathname,
  profileLabel,
  onNavigate,
}: {
  pathname: string;
  profileLabel: string | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-salon-gold">
          Salon Owner Admin
        </p>
        <div className="mt-2">
          <LogoMark />
        </div>
        {profileLabel ? (
          <p className="mt-1 text-xs text-salon-muted">{profileLabel}</p>
        ) : null}
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {adminNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={navLinkClass(isNavActive(pathname, item.href))}
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
          onClick={onNavigate}
          className="block rounded-xl border border-salon-beige/35 px-3 py-2 text-center text-xs text-salon-muted transition hover:border-salon-gold/40 hover:text-salon-ink"
        >
          ← Client booking app
        </Link>
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { profile, role } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    closeDrawer();
  }, [pathname, closeDrawer]);

  useEffect(() => {
    if (!drawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerOpen, closeDrawer]);

  const profileLabel = profile ? `${profile.firstName} · ${role}` : null;

  return (
    <AdminGuard>
      <div className="flex h-dvh overflow-hidden bg-salon-bg text-salon-ink">
        <aside className="hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-salon-beige/30 bg-salon-white/95 p-5 shadow-sm shadow-black/5 md:flex">
          <AdminNavPanel pathname={pathname} profileLabel={profileLabel} />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/50"
              onClick={closeDrawer}
            />
            <aside
              className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col overflow-y-auto border-r border-salon-beige/30 bg-salon-white p-5 shadow-xl shadow-black/30"
              role="dialog"
              aria-modal="true"
              aria-label="Admin navigation"
            >
              <div className="mb-2 flex justify-end">
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-lg p-2 text-salon-muted transition hover:bg-salon-surface hover:text-salon-ink"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AdminNavPanel
                pathname={pathname}
                profileLabel={profileLabel}
                onNavigate={closeDrawer}
              />
            </aside>
          </div>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 shrink-0 border-b border-salon-beige/30 bg-salon-white/95 px-4 py-3 shadow-sm shadow-black/5 backdrop-blur md:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg p-2 text-salon-ink transition hover:bg-salon-surface md:hidden"
                  aria-label="Open menu"
                  aria-expanded={drawerOpen}
                  onClick={() => setDrawerOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 md:hidden">
                  <LogoMark />
                </div>
                <p className="hidden text-sm font-semibold text-salon-ink md:block">
                  Salon Dashboard
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 md:hidden">
                <ThemeToggle size="compact" />
                <LogoutButton compact tone="light" />
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
