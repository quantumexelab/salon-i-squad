import Link from "next/link";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { formatLkr } from "@/lib/booking/dummy-services";
import { siteConfig } from "@/lib/site";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-display",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-landing-sans",
});

/** Moody salon interior — rendered in grayscale for the editorial hero. */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=2400&q=80";

const FEATURED_SERVICES = [
  {
    name: "Hair Styling",
    blurb: "Cut, blow-dry, and finish tailored to you.",
    price: 3500,
  },
  {
    name: "Facial",
    blurb: "Deep cleanse and glow-restoring treatments.",
    price: 4500,
  },
  {
    name: "Color",
    blurb: "Highlights, balayage, and full-color refresh.",
    price: 8500,
  },
  {
    name: "Bridal",
    blurb: "Complete bridal hair and makeup packages.",
    price: 25000,
  },
] as const;

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80",
    alt: "Hair styling detail",
  },
  {
    src: "https://images.unsplash.com/photo-1633681926022-84c123e390c3?auto=format&fit=crop&w=1200&q=80",
    alt: "Salon interior seating",
  },
  {
    src: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80",
    alt: "Beauty treatment setup",
  },
  {
    src: "https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?auto=format&fit=crop&w=1200&q=80",
    alt: "Salon mirrors and chairs",
  },
  {
    src: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=1200&q=80",
    alt: "Makeup and finishing",
  },
  {
    src: "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=1200&q=80",
    alt: "Hair color work",
  },
] as const;

const GOLD = "#c9a962";

export function LandingPage() {
  return (
    <div
      className={`${display.variable} ${sans.variable} min-h-dvh bg-black text-white`}
      style={{ fontFamily: "var(--font-landing-sans), sans-serif" }}
    >
      <style>{`
        @keyframes landing-rise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes landing-rule {
          from { opacity: 0; transform: scaleX(0); }
          to { opacity: 1; transform: scaleX(1); }
        }
        @keyframes landing-ken {
          from { transform: scale(1.12); }
          to { transform: scale(1); }
        }
        @keyframes landing-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-rise,
          .landing-rise-2,
          .landing-rise-3,
          .landing-rise-4,
          .landing-rule,
          .landing-ken,
          .landing-fade-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        .landing-rise { animation: landing-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .landing-rise-2 { animation: landing-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.16s both; }
        .landing-rise-3 { animation: landing-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both; }
        .landing-rise-4 { animation: landing-rise 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.44s both; }
        .landing-rule {
          transform-origin: left center;
          animation: landing-rule 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both;
        }
        .landing-ken { animation: landing-ken 14s ease-out both; }
        .landing-fade-in { animation: landing-fade-in 1s ease-out both; }
        .landing-cta {
          background: linear-gradient(135deg, #e0c27a 0%, #c9a962 45%, #a8873f 100%);
          transition: transform 0.35s ease, filter 0.35s ease, box-shadow 0.35s ease;
        }
        .landing-cta:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
          box-shadow: 0 10px 28px rgba(201, 169, 98, 0.28);
        }
        .landing-nav-link {
          position: relative;
          transition: color 0.25s ease;
        }
        .landing-nav-link::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 1px;
          background: ${GOLD};
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }
        .landing-nav-link:hover { color: ${GOLD}; }
        .landing-nav-link:hover::after { transform: scaleX(1); }
      `}</style>

      {/* Editorial noir hero */}
      <section className="relative min-h-dvh overflow-hidden bg-black">
        {/* Full-bleed photo (desktop: right-weighted via object-position) */}
        <div className="absolute inset-0 landing-fade-in">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt=""
            className="landing-ken h-full w-full object-cover object-[70%_center] grayscale contrast-110 brightness-90 md:object-right"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/25 md:via-black/70 md:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 md:hidden" />
        </div>

        <header className="relative z-20">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6 md:px-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-white/90">
              Salon <span style={{ color: GOLD }}>|</span> Squad
            </p>
            <nav className="hidden items-center gap-7 text-[11px] font-medium uppercase tracking-[0.22em] text-white/70 md:flex">
              <a href="#about" className="landing-nav-link">
                About
              </a>
              <a href="#services" className="landing-nav-link">
                Services
              </a>
              <a href="#gallery" className="landing-nav-link">
                Gallery
              </a>
              <a href="#contact" className="landing-nav-link">
                Contact
              </a>
              <Link
                href="/login"
                className="landing-nav-link text-white/45"
              >
                Staff
              </Link>
            </nav>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col justify-center px-5 pb-16 pt-8 md:px-8 md:pb-24">
          <div className="max-w-xl">
            <h1
              className="landing-rise text-5xl font-semibold leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              SALON <span style={{ color: GOLD }}>|</span> SQUAD
            </h1>

            <div
              className="landing-rule mt-6 h-px w-24"
              style={{ backgroundColor: GOLD }}
            />

            <p className="landing-rise-2 mt-6 text-[11px] font-medium uppercase tracking-[0.28em] text-white/85 sm:text-xs">
              Precision in style. Obsession in every detail.
            </p>
            <p
              className="landing-rise-3 mt-3 text-sm italic"
              style={{
                fontFamily: "var(--font-landing-display), serif",
                color: GOLD,
              }}
            >
              Where artistry meets experience.
            </p>

            <div className="landing-rise-4 mt-10">
              <Link
                href="/booking"
                className="landing-cta inline-flex h-12 items-center justify-center px-8 text-[11px] font-semibold uppercase tracking-[0.2em] text-black"
              >
                Book your experience
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About + contact */}
      <section
        id="about"
        className="border-t border-white/10 scroll-mt-16"
      >
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:gap-16 md:px-8 md:py-24">
          <div>
            <h2
              className="text-3xl font-semibold tracking-tight text-white md:text-4xl"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              About us
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-white/70 md:text-base">
              Salon I Squad is a calm, detail-led studio for cuts, color,
              facials, and bridal styling. We keep the room unhurried, the
              finish precise, and every visit focused on how you want to look
              and feel when you walk out.
            </p>
          </div>

          <div id="contact" className="space-y-8 scroll-mt-16">
            <div>
              <h3
                className="text-lg font-medium"
                style={{
                  fontFamily: "var(--font-landing-display), serif",
                  color: GOLD,
                }}
              >
                Contact info
              </h3>
              <ul className="mt-4 space-y-3 text-sm font-light text-white/70">
                <li>
                  <a
                    href="tel:+94723238400"
                    className="transition hover:text-[color:var(--g)]"
                    style={{ ["--g" as string]: GOLD }}
                  >
                    +94 72 323 8400
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:sargunamkarthic@gmail.com"
                    className="transition hover:text-[color:var(--g)]"
                    style={{ ["--g" as string]: GOLD }}
                  >
                    sargunamkarthic@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/94723238400"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-[color:var(--g)]"
                    style={{ ["--g" as string]: GOLD }}
                  >
                    WhatsApp · +94 72 323 8400
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3
                className="text-lg font-medium"
                style={{
                  fontFamily: "var(--font-landing-display), serif",
                  color: GOLD,
                }}
              >
                Visit
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-white/70">
                42 Galle Road, Colombo 03
                <br />
                Sri Lanka
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-medium"
                style={{
                  fontFamily: "var(--font-landing-display), serif",
                  color: GOLD,
                }}
              >
                Hours
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-white/70">
                Tuesday – Sunday
                <br />
                9:00 AM – 7:00 PM
                <br />
                Closed Mondays
              </p>
            </div>

            <div
              className="flex min-h-48 items-end border border-white/15 bg-[linear-gradient(145deg,#1a1917_0%,#000_55%,#1f1a12_100%)] p-5"
              aria-label="Map placeholder"
            >
              <p className="text-xs font-light tracking-wide text-white/40">
                Map placeholder — Google Maps embed coming soon
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="services"
        className="scroll-mt-16 border-t border-white/10 bg-[#0a0a0a]"
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2
            className="text-3xl font-semibold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            Services
          </h2>
          <p className="mt-3 max-w-lg text-sm font-light text-white/60">
            A selection of our most requested treatments. Full menu available
            when you book.
          </p>

          <ul className="mt-10 grid gap-x-10 gap-y-0 sm:grid-cols-2">
            {FEATURED_SERVICES.map((service) => (
              <li key={service.name} className="border-t border-white/12 py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    className="text-xl font-medium text-white"
                    style={{
                      fontFamily: "var(--font-landing-display), serif",
                    }}
                  >
                    {service.name}
                  </h3>
                  <span
                    className="shrink-0 text-sm font-medium"
                    style={{ color: GOLD }}
                  >
                    from {formatLkr(service.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-light text-white/55">
                  {service.blurb}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link
              href="/booking"
              className="inline-flex text-sm font-medium tracking-wide underline-offset-4 transition hover:underline"
              style={{ color: GOLD }}
            >
              Book a service →
            </Link>
          </div>
        </div>
      </section>

      <section
        id="gallery"
        className="scroll-mt-16 border-t border-white/10"
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2
            className="text-3xl font-semibold tracking-tight text-white md:text-4xl"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            Gallery
          </h2>
          <p className="mt-3 max-w-lg text-sm font-light text-white/60">
            Interior atmosphere and recent work — replace with your own photos
            anytime.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
            {GALLERY.map((item, index) => (
              <div
                key={item.src}
                className={`relative overflow-hidden bg-[#1a1917] ${
                  index === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className={`w-full object-cover transition duration-700 ease-out hover:scale-[1.03] ${
                    index === 0
                      ? "aspect-[4/3] md:aspect-auto md:h-full md:min-h-[28rem]"
                      : "aspect-square"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p
            className="text-lg font-medium text-white"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            Salon <span style={{ color: GOLD }}>|</span> Squad
          </p>
          <div className="flex flex-wrap gap-5 text-xs font-medium tracking-wide text-white/50">
            <Link href="/booking" className="transition hover:text-white">
              Book
            </Link>
            <Link href="/login" className="transition hover:text-white">
              Sign in
            </Link>
            <span>© {new Date().getFullYear()} {siteConfig.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
