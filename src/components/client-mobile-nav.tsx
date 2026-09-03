"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  CalendarDays,
  Home,
  Phone,
  Scissors,
  User,
} from "lucide-react";

type Tab = {
  id: string;
  href: string;
  label: string;
  icon: typeof Home;
  /** Optional landing-page section id for in-page scroll. */
  sectionId?: string;
};

const tabs: Tab[] = [
  { id: "home", href: "/", label: "Home", icon: Home, sectionId: "home" },
  {
    id: "services",
    href: "/#services",
    label: "Services",
    icon: Scissors,
    sectionId: "services",
  },
  {
    id: "booking",
    href: "/booking",
    label: "Booking",
    icon: CalendarDays,
  },
  {
    id: "contact",
    href: "/#contact",
    label: "Contact",
    icon: Phone,
    sectionId: "contact",
  },
  {
    id: "profile",
    href: "/profile",
    label: "Profile",
    icon: User,
  },
];

function readHash(): string {
  if (typeof window === "undefined") return "";
  return window.location.hash.replace(/^#/, "");
}

function scrollToSection(sectionId: string) {
  const el = document.getElementById(sectionId);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  window.history.replaceState(null, "", sectionId === "home" ? "/" : `/#${sectionId}`);
  return true;
}

export function ClientMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hash, setHash] = useState("");

  const syncHash = useCallback(() => {
    setHash(readHash());
  }, []);

  useEffect(() => {
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [syncHash, pathname]);

  // After navigating to home with a hash, scroll to the section.
  useEffect(() => {
    if (pathname !== "/") return;
    const id = readHash();
    if (!id) {
      syncHash();
      return;
    }
    const timer = window.setTimeout(() => {
      scrollToSection(id);
      syncHash();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [pathname, syncHash]);

  function isActive(tab: Tab): boolean {
    if (tab.id === "booking") {
      return (
        pathname.startsWith("/booking") || pathname.startsWith("/reschedule")
      );
    }
    if (tab.id === "profile") {
      return pathname.startsWith("/profile");
    }
    if (pathname !== "/") return false;
    if (tab.id === "home") {
      return !hash || hash === "home";
    }
    return hash === tab.sectionId;
  }

  function handleClick(tab: Tab, e: MouseEvent<HTMLAnchorElement>) {
    // Real app routes — let Next.js handle.
    if (!tab.sectionId) return;

    e.preventDefault();

    if (pathname === "/") {
      scrollToSection(tab.sectionId);
      setHash(tab.sectionId === "home" ? "" : tab.sectionId);
      return;
    }

    // From booking / my-bookings → go home then scroll.
    router.push(tab.sectionId === "home" ? "/" : `/#${tab.sectionId}`);
  }

  if (pathname === "/login") return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-salon-beige/30 bg-salon-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-between px-1">
        {tabs.map((tab) => {
          const active = isActive(tab);
          const Icon = tab.icon;
          const isBooking = tab.id === "booking";
          return (
            <Link
              key={tab.id}
              href={tab.href}
              onClick={(e) => handleClick(tab, e)}
              className={`flex flex-1 flex-col items-center gap-1 px-0.5 py-1 transition ${
                active ? "text-salon-gold" : "text-salon-muted"
              }`}
            >
              {isBooking ? (
                <span
                  className={`-mt-5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-salon-gold bg-salon-gold text-black shadow-lg shadow-salon-gold/25"
                      : "border-salon-gold/50 bg-salon-white text-salon-gold"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              ) : (
                <Icon
                  className="h-5 w-5 shrink-0"
                  strokeWidth={active ? 2.25 : 1.75}
                />
              )}
              <span className="h-3.5 max-w-full truncate text-center text-[11px] font-medium leading-none tracking-normal">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
