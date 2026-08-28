"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import {
  CalendarDays,
  Headphones,
  Menu,
  Scissors,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { formatLkr } from "@/lib/booking/dummy-services";
import { AnimatedStatCard } from "@/components/animated-stat-card";
import { ClientMobileNav } from "@/components/client-mobile-nav";
import { CustomerLogo } from "@/components/logo";
import { SalonHeroSection } from "@/components/salon-zoom-carousel";
import { SocialLinks } from "@/components/social-links";
import { ThemeToggle } from "@/components/theme-toggle";
import { serviceImageFor } from "@/lib/service-images";
import {
  getSampleCatalogServices,
  resolveBookableServices,
  subscribeToServices,
} from "@/lib/services";
import { siteConfig } from "@/lib/site";
import type { Service } from "@/types/firestore";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-display",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-landing-sans",
});

const STATS = [
  { end: 1500, decimals: 0, suffix: "+", label: "Happy Clients", icon: Users },
  { end: 4.9, decimals: 1, suffix: "", label: "Client Rating", icon: Star },
  { end: 10, decimals: 0, suffix: "+", label: "Expert Stylists", icon: Scissors },
  { end: 5, decimals: 0, suffix: "+", label: "Years Experience", icon: Trophy },
] as const;

const SERVICE_CATEGORIES = [
  {
    name: "Haircuts",
    blurb: "Trendy cuts & perfect styling",
    icon: Scissors,
  },
  {
    name: "Beard Grooming",
    blurb: "Shape, trim & clean finish",
    icon: Sparkles,
  },
  {
    name: "Shaving",
    blurb: "Classic & hot towel shaves",
    icon: Sparkles,
  },
  {
    name: "Facial & Spa",
    blurb: "Glow-restoring treatments",
    icon: Sparkles,
  },
] as const;

const NAV = [
  { href: "#home", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#about", label: "About Us" },
  { href: "#gallery", label: "Gallery" },
  { href: "#contact", label: "Contact" },
] as const;

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>(() =>
    getSampleCatalogServices(),
  );

  useEffect(() => {
    return subscribeToServices(
      (next) => setServices(resolveBookableServices(next)),
      undefined,
      { activeOnly: true },
    );
  }, []);

  const popular = services.slice(0, 6).map((s) => ({
    id: s.id,
    name: s.name,
    durationMinutes: s.durationMinutes,
    price: s.price,
    imageUrl: s.imageUrl,
  }));

  return (
    <div
      id="home"
      className={`${display.variable} ${sans.variable} min-h-dvh bg-salon-bg pb-[calc(4.5rem+env(safe-area-inset-bottom))] text-salon-ink md:pb-0`}
      style={{ fontFamily: "var(--font-landing-sans), sans-serif" }}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-salon-beige/25 bg-salon-white/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <CustomerLogo size="mark" />
            <span
              className="truncate text-[11px] font-medium uppercase tracking-[0.22em] text-salon-ink"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              Salon <span className="text-salon-script">I</span> Squad
            </span>
          </Link>

          <nav className="hidden items-center gap-6 text-[11px] font-medium uppercase tracking-[0.18em] text-salon-muted lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="salon-nav-link hover:text-salon-ink"
              >
                {item.label}
              </a>
            ))}
            <Link
              href="/login"
              className="salon-nav-link hover:text-salon-ink"
            >
              Sign In
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle size="compact" />
            <Link
              href="/booking"
              className="salon-gold-btn hidden h-10 items-center gap-2 rounded-full px-4 text-[11px] font-bold uppercase tracking-wide text-black sm:inline-flex"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Book Appointment
            </Link>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-salon-ink lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="border-t border-salon-beige/25 bg-salon-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-3">
              {NAV.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium uppercase tracking-[0.16em] text-salon-ink"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="text-sm font-medium uppercase tracking-[0.16em] text-salon-ink"
              >
                Sign In
              </Link>
              <Link
                href="/booking"
                onClick={() => setMenuOpen(false)}
                className="salon-gold-btn mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold text-black"
              >
                <CalendarDays className="h-4 w-4" />
                Book Appointment
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      {/* Full-bleed hero — salon images zoom (BuddyBerlin layout, our photos) */}
      <SalonHeroSection />

      {/* Stats */}
      <section className="border-y border-salon-beige/30 bg-salon-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4 md:gap-4 md:px-8 md:py-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <AnimatedStatCard
                key={stat.label}
                end={stat.end}
                decimals={stat.decimals}
                suffix={stat.suffix}
                label={stat.label}
                icon={<Icon className="h-4 w-4" />}
              />
            );
          })}
        </div>
      </section>

      {/* Our Services */}
      <section id="services" className="scroll-mt-20 bg-salon-bg">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-salon-gold">
                Our Services
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-salon-ink md:text-4xl"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Premium Services For You
              </h2>
            </div>
            <Link
              href="/booking"
              className="hidden text-sm font-semibold text-salon-gold hover:underline sm:inline"
            >
              View All →
            </Link>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
            {SERVICE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="w-[min(70vw,220px)] shrink-0 rounded-2xl border border-salon-beige/35 bg-salon-white p-5 shadow-[var(--salon-shadow)] md:w-auto"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-salon-gold/30 text-salon-gold">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3
                    className="mt-4 text-lg font-semibold text-salon-ink"
                    style={{ fontFamily: "var(--font-landing-display), serif" }}
                  >
                    {cat.name}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-salon-muted">
                    {cat.blurb}
                  </p>
                  <Link
                    href="/booking"
                    className="mt-4 inline-flex text-xs font-semibold text-salon-gold hover:underline"
                  >
                    Book Now →
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular / Most booked */}
      <section className="scroll-mt-20 bg-salon-bg">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8 md:py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-salon-gold">
                Popular Services
              </p>
              <h2
                className="mt-2 text-3xl font-semibold text-salon-ink md:text-4xl"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Most Booked
              </h2>
            </div>
            <Link
              href="/booking"
              className="text-sm font-semibold text-salon-gold hover:underline"
            >
              View All →
            </Link>
          </div>

          <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 md:grid md:grid-cols-3 md:overflow-visible">
            {popular.map((item) => (
              <Link
                key={item.id}
                href="/booking"
                className="group w-[min(78vw,280px)] shrink-0 overflow-hidden rounded-2xl border border-salon-beige/35 bg-salon-white shadow-[var(--salon-shadow)] transition hover:border-salon-gold/40 md:w-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={serviceImageFor(item.name, item.imageUrl)}
                  alt={item.name}
                  className="aspect-[16/10] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div className="px-4 py-3">
                  <p
                    className="text-base font-semibold text-salon-ink"
                    style={{ fontFamily: "var(--font-landing-display), serif" }}
                  >
                    {item.name}
                  </p>
                  <p className="mt-1 text-xs text-salon-muted">
                    {item.durationMinutes} mins ·{" "}
                    <span className="font-semibold text-salon-gold">
                      {formatLkr(item.price)}
                    </span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About + Contact */}
      <section
        id="about"
        className="scroll-mt-20 border-t border-salon-beige/30 bg-salon-white"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:gap-16 md:px-8 md:py-20">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-salon-gold">
              About Us
            </p>
            <h2
              className="mt-2 text-3xl font-semibold text-salon-ink"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              Crafted for confidence
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-salon-muted md:text-base">
              Salon I Squad is a calm, detail-led studio for cuts, color,
              facials, and grooming. We keep the room unhurried, the finish
              precise, and every visit focused on how you want to look and feel
              when you walk out.
            </p>
          </div>
          <div id="contact" className="scroll-mt-20 space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-salon-gold">
              Contact
            </p>
            <div className="rounded-2xl border border-salon-beige/35 bg-salon-surface p-5">
              <div className="flex items-start gap-3">
                <Headphones className="mt-0.5 h-5 w-5 text-salon-gold" />
                <div>
                  <p className="text-sm font-semibold text-salon-ink">
                    Need help booking?
                  </p>
                  <a
                    href={`tel:${siteConfig.phoneTel}`}
                    className="mt-1 block text-sm font-medium text-salon-gold hover:underline"
                  >
                    {siteConfig.phoneDisplay}
                  </a>
                  <p className="mt-2 text-xs text-salon-muted">
                    Call us anytime — or book online in a few taps.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-salon-beige/35 bg-salon-surface p-5">
              <p className="text-sm font-semibold text-salon-ink">Follow us</p>
              <p className="mt-1 text-xs text-salon-muted">
                Stay updated with styles, offers, and salon news.
              </p>
              <SocialLinks className="mt-4" />
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-salon-beige/30 bg-salon-bg px-4 py-8 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4">
          <SocialLinks iconClassName="h-9 w-9 text-sm" />
          <p className="text-center text-xs text-salon-muted">
            © {new Date().getFullYear()} QuantumExe (Pvt) Ltd. All rights
            reserved.
          </p>
        </div>
      </footer>

      <ClientMobileNav />
    </div>
  );
}
