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

export function LandingPage() {
  return (
    <div
      className={`${display.variable} ${sans.variable} min-h-dvh bg-[#0c0b0a] text-[#f3efe6]`}
      style={{ fontFamily: "var(--font-landing-sans), sans-serif" }}
    >
      <style>{`
        @keyframes landing-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes landing-ken {
          from { transform: scale(1.08); }
          to { transform: scale(1); }
        }
        @keyframes landing-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .landing-rise { animation: landing-rise 0.9s ease-out both; }
        .landing-rise-delay { animation: landing-rise 0.9s ease-out 0.18s both; }
        .landing-rise-cta { animation: landing-rise 0.9s ease-out 0.32s both; }
        .landing-ken { animation: landing-ken 12s ease-out both; }
        .landing-section { animation: landing-fade 0.8s ease-out both; }
      `}</style>

      {/* Minimal top bar — not a dashboard; brand lives in the hero */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-end px-5 py-5 md:px-8">
          <Link
            href="/login"
            className="text-xs font-medium tracking-wide text-[#f3efe6]/70 transition hover:text-[#FFD700]"
          >
            Staff login
          </Link>
        </div>
      </header>

      {/* Hero — one composition: brand, line, CTA, full-bleed image */}
      <section className="relative flex min-h-dvh items-end overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={HERO_IMAGE}
            alt=""
            className="landing-ken h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b0a] via-[#0c0b0a]/55 to-[#0c0b0a]/25" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#0c0b0a_78%)] opacity-70" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-28 md:px-8 md:pb-24">
          <h1
            className="landing-rise text-5xl font-semibold leading-[0.95] tracking-tight text-[#FFD700] sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            {siteConfig.name}
          </h1>
          <p className="landing-rise-delay mt-5 max-w-md text-base font-light leading-relaxed text-[#f3efe6]/85 sm:text-lg">
            Where style meets care — hair, beauty, and bridal artistry in
            Colombo.
          </p>
          <div className="landing-rise-cta mt-8">
            <Link
              href="/booking"
              className="inline-flex h-12 items-center justify-center bg-[#FFD700] px-8 text-sm font-semibold tracking-wide text-[#0c0b0a] transition hover:bg-[#ffe566]"
            >
              Book Appointment
            </Link>
          </div>
        </div>
      </section>

      {/* About + location */}
      <section className="landing-section border-t border-[#f3efe6]/10">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-16 md:grid-cols-2 md:gap-16 md:px-8 md:py-24">
          <div>
            <h2
              className="text-3xl font-semibold tracking-tight text-[#FFD700] md:text-4xl"
              style={{ fontFamily: "var(--font-landing-display), serif" }}
            >
              About us
            </h2>
            <p className="mt-5 text-sm font-light leading-relaxed text-[#f3efe6]/75 md:text-base">
              Salon I Squad is a calm, detail-led studio for cuts, color,
              facials, and bridal styling. We keep the room unhurried, the
              finish precise, and every visit focused on how you want to look
              and feel when you walk out.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h3
                className="text-lg font-medium text-[#FFD700]"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Contact info
              </h3>
              <ul className="mt-4 space-y-3 text-sm font-light text-[#f3efe6]/75">
                <li>
                  <a
                    href="tel:+94723238400"
                    className="transition hover:text-[#FFD700]"
                  >
                    +94 72 323 8400
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:sargunamkarthic@gmail.com"
                    className="transition hover:text-[#FFD700]"
                  >
                    sargunamkarthic@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/94723238400"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-[#FFD700]"
                  >
                    WhatsApp · +94 72 323 8400
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3
                className="text-lg font-medium text-[#FFD700]"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Visit
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-[#f3efe6]/75">
                42 Galle Road, Colombo 03
                <br />
                Sri Lanka
              </p>
            </div>

            <div>
              <h3
                className="text-lg font-medium text-[#FFD700]"
                style={{ fontFamily: "var(--font-landing-display), serif" }}
              >
                Hours
              </h3>
              <p className="mt-2 text-sm font-light leading-relaxed text-[#f3efe6]/75">
                Tuesday – Sunday
                <br />
                9:00 AM – 7:00 PM
                <br />
                Closed Mondays
              </p>
            </div>

            <div
              className="flex min-h-48 items-end border border-[#f3efe6]/15 bg-[linear-gradient(145deg,#1a1917_0%,#0c0b0a_55%,#1f1a12_100%)] p-5"
              aria-label="Map placeholder"
            >
              <p className="text-xs font-light tracking-wide text-[#f3efe6]/45">
                Map placeholder — Google Maps embed coming soon
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="landing-section border-t border-[#f3efe6]/10 bg-[#11100e]">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2
            className="text-3xl font-semibold tracking-tight text-[#FFD700] md:text-4xl"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            Services
          </h2>
          <p className="mt-3 max-w-lg text-sm font-light text-[#f3efe6]/65">
            A selection of our most requested treatments. Full menu available
            when you book.
          </p>

          <ul className="mt-10 grid gap-x-10 gap-y-0 sm:grid-cols-2">
            {FEATURED_SERVICES.map((service) => (
              <li
                key={service.name}
                className="border-t border-[#f3efe6]/12 py-6"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    className="text-xl font-medium text-[#f3efe6]"
                    style={{
                      fontFamily: "var(--font-landing-display), serif",
                    }}
                  >
                    {service.name}
                  </h3>
                  <span className="shrink-0 text-sm font-medium text-[#FFD700]">
                    from {formatLkr(service.price)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-light text-[#f3efe6]/60">
                  {service.blurb}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <Link
              href="/booking"
              className="inline-flex text-sm font-medium tracking-wide text-[#FFD700] underline-offset-4 transition hover:underline"
            >
              Book a service →
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="landing-section border-t border-[#f3efe6]/10">
        <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <h2
            className="text-3xl font-semibold tracking-tight text-[#FFD700] md:text-4xl"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            Gallery
          </h2>
          <p className="mt-3 max-w-lg text-sm font-light text-[#f3efe6]/65">
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

      <footer className="border-t border-[#f3efe6]/10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-10 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p
            className="text-lg font-medium text-[#FFD700]"
            style={{ fontFamily: "var(--font-landing-display), serif" }}
          >
            {siteConfig.name}
          </p>
          <div className="flex flex-wrap gap-5 text-xs font-medium tracking-wide text-[#f3efe6]/55">
            <Link href="/booking" className="hover:text-[#FFD700]">
              Book
            </Link>
            <Link href="/login" className="hover:text-[#FFD700]">
              Sign in
            </Link>
            <span>© {new Date().getFullYear()} Salon I Squad</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
