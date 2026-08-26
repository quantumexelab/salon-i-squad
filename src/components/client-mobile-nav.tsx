"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Home,
  Phone,
  Scissors,
} from "lucide-react";

const tabs = [
  {
    href: "/",
    label: "Home",
    icon: Home,
    match: (p: string) => p === "/",
  },
  {
    href: "/#services",
    label: "Services",
    icon: Scissors,
    match: () => false,
  },
  {
    href: "/booking",
    label: "Booking",
    icon: CalendarDays,
    match: (p: string) =>
      p.startsWith("/booking") || p.startsWith("/reschedule"),
  },
  {
    href: "/my-bookings",
    label: "My bookings",
    icon: ClipboardList,
    match: (p: string) =>
      p.startsWith("/my-bookings") || p.startsWith("/bookings"),
  },
  {
    href: "/#contact",
    label: "Contact",
    icon: Phone,
    match: () => false,
  },
] as const;

export function ClientMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-salon-beige/30 bg-salon-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-1">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const isBooking = tab.href === "/booking";
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-[3.75rem] flex-col items-center gap-1 px-1.5 py-1 transition ${
                active ? "text-salon-gold" : "text-salon-muted"
              }`}
            >
              {isBooking ? (
                <span
                  className={`-mt-5 flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                    active
                      ? "border-salon-gold bg-salon-gold text-black shadow-lg shadow-salon-gold/25"
                      : "border-salon-gold/50 bg-salon-white text-salon-gold"
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.25} />
                </span>
              ) : (
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
              )}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
