"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import {
  CalendarDays,
  Headphones,
  Menu,
  Play,
  Scissors,
  Share2,
  Sparkles,
  Star,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { formatLkr } from "@/lib/booking/dummy-services";
import { ClientMobileNav } from "@/components/client-mobile-nav";
import { CustomerLogo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { serviceImageFor, CATALOG_SERVICE_IMAGES } from "@/lib/service-images";
import {
  isDummyCatalogService,
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

const HERO_PORTRAIT =
  "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=1200&q=80";

const STATS = [
  { value: "1500+", label: "Happy Clients", icon: Users },
  { value: "4.9", label: "Client Rating", icon: Star },
  { value: "10+", label: "Expert Stylists", icon: Scissors },
  { value: "5+", label: "Years Experience", icon: Trophy },
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

const FALLBACK_POPULAR = [
  {
    id: "fallback-1",
    name: "Haircut",
    durationMinutes: 30,
    price: 1500,
    imageUrl: CATALOG_SERVICE_IMAGES.haircut,
  },
  {
    id: "fallback-2",
    name: "Beard Grooming",
    durationMinutes: 25,
    price: 1000,
    imageUrl: CATALOG_SERVICE_IMAGES.beard,
  },
  {
    id: "fallback-3",
    name: "Classic Shave",
    durationMinutes: 20,
    price: 1200,
    imageUrl: CATALOG_SERVICE_IMAGES.shave,
  },
  {
    id: "fallback-4",
    name: "Hair Styling",
    durationMinutes: 40,
    price: 2000,
    imageUrl: CATALOG_SERVICE_IMAGES.styling,
  },
  {
    id: "fallback-5",
    name: "Hair Colour",
    durationMinutes: 90,
    price: 5500,
    imageUrl: CATALOG_SERVICE_IMAGES.color,
  },
  {
    id: "fallback-6",
    name: "Facial Treatment",
    durationMinutes: 45,
    price: 3500,
    imageUrl: CATALOG_SERVICE_IMAGES.facial,
  },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    return subscribeToServices(
      (next) =>
        setServices(
          next.filter((s) => s.isActive && !isDummyCatalogService(s)),
        ),
      undefined,
      { activeOnly: true },
    );
  }, []);

  const popular =
    services.length > 0
      ? (() => {
          const live = services.slice(0, 6).map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            price: s.price,
            imageUrl: s.imageUrl,
          }));
          if (live.length >= 6) return live;
          const names = new Set(live.map((s) => s.name.toLowerCase()));
          const extras = FALLBACK_POPULAR.filter(
            (f) => !names.has(f.name.toLowerCase()),
          ).slice(0, 6 - live.length);
          return [...live, ...extras];
        })()
      : FALLBACK_POPULAR;

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

      {/* Hero */}
      <section className="relative overflow-hidden bg-salon-bg">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:gap-10 md:px-8 md:py-16 lg:py-20">
          <div className="relative z-10 order-2 md:order-1">
            <h1
              className="text-4xl font-semibold leading-[1.05] tracking-tight text-salon-ink sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              Where{" "}
              <span
                className="italic text-salon-script"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Style
              </span>
              <br />
              <span className="uppercase">Meets Confidence</span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-salon-muted md:text-base">
              Premium grooming & styling services crafted just for you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/booking"
                className="salon-gold-btn inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm font-bold text-black"
              >
                <CalendarDays className="h-4 w-4" />
                Book Appointment
              </Link>
              <a
                href="#gallery"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-salon-ink/20 bg-transparent px-6 text-sm font-semibold text-salon-ink transition hover:border-salon-gold hover:text-salon-gold"
              >
                <Play className="h-4 w-4" />
                Watch Video
              </a>
            </div>
          </div>

          <div className="relative order-1 mx-auto w-full max-w-md md:order-2 md:max-w-none">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-4 top-6 hidden h-[85%] w-[70%] rounded-[2rem] border border-salon-gold/35 md:block"
            />
            <div className="relative overflow-hidden rounded-[1.5rem] border border-salon-beige/30 bg-salon-surface shadow-[var(--salon-shadow)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_PORTRAIT}
                alt="Premium salon style"
                className="aspect-[4/5] w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-salon-bg/40 via-transparent to-transparent" />
            </div>
          </div>
        </div>

        {/* Social rail — desktop */}
        <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
          <span className="mb-1 rotate-90 text-[10px] uppercase tracking-[0.28em] text-salon-muted">
            Follow Us
          </span>
          <a
            href="#contact"
            className="rounded-full border border-salon-beige/40 p-2 text-salon-muted hover:text-salon-gold"
            aria-label="Social"
          >
            <Share2 className="h-4 w-4" />
          </a>
          <a
            href="#contact"
            className="rounded-full border border-salon-beige/40 p-2 text-salon-muted hover:text-salon-gold"
            aria-label="Contact"
          >
            <Users className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-salon-beige/30 bg-salon-white">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-3 px-4 py-6 sm:grid-cols-4 md:gap-4 md:px-8 md:py-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="flex items-center gap-3 rounded-2xl border border-salon-beige/30 bg-salon-surface/80 px-3 py-3 md:px-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p
                    className="text-lg font-semibold text-salon-ink md:text-xl"
                    style={{ fontFamily: "var(--font-landing-display), serif" }}
                  >
                    {stat.value}
                  </p>
                  <p className="truncate text-[11px] text-salon-muted">
                    {stat.label}
                  </p>
                </div>
              </div>
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

      {/* Mid CTA banner */}
      <section className="px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 rounded-2xl border border-salon-gold/25 bg-salon-surface px-5 py-6 shadow-[var(--salon-shadow)] sm:flex-row sm:items-center md:px-8">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-salon-gold/15 text-salon-gold">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p
                className="text-lg font-semibold text-salon-ink"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Book Your Appointment
              </p>
              <p className="text-xs text-salon-muted">
                Quick & easy booking in just a few steps.
              </p>
            </div>
          </div>
          <Link
            href="/booking"
            className="salon-gold-btn inline-flex h-11 shrink-0 items-center rounded-full px-5 text-sm font-bold text-black"
          >
            Book Now →
          </Link>
        </div>
      </section>

      {/* Popular / Most booked */}
      <section id="gallery" className="scroll-mt-20 bg-salon-bg">
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
                    href="tel:+94771234567"
                    className="mt-1 block text-sm text-salon-gold hover:underline"
                  >
                    +94 77 123 4567
                  </a>
                  <p className="mt-2 text-xs text-salon-muted">
                    Update this number in the contact section when ready.
                  </p>
                </div>
              </div>
            </div>
            <Link
              href="/login"
              className="inline-flex text-sm font-medium text-salon-muted underline-offset-4 hover:text-salon-gold hover:underline"
            >
              Staff / client sign-in →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-salon-beige/30 bg-salon-bg px-4 py-8 text-center text-xs text-salon-muted md:px-8">
        © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
      </footer>

      <ClientMobileNav />
    </div>
  );
}
