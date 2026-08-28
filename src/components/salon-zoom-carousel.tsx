"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

/** Salon atmosphere images for the landing hero. */
export const SALON_HERO_SLIDES = [
  {
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1920&q=80",
    alt: "Haircut",
  },
  {
    src: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1920&q=80",
    alt: "Salon interior",
  },
  {
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1920&q=80",
    alt: "Classic shave",
  },
  {
    src: "https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=1920&q=80",
    alt: "Grooming tools",
  },
  {
    src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1920&q=80",
    alt: "Hair styling",
  },
  {
    src: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&q=80",
    alt: "Studio",
  },
] as const;

const INTERVAL_MS = 5000;
const HERO_TITLE = "Salon I Squad";
const HERO_TAGLINE = "Premium grooming & styling in Colombo";
const TITLE_CHAR_MS = 90;
const TAGLINE_CHAR_MS = 35;
const TYPING_START_DELAY_MS = 450;

function heroTitleCharClass(index: number): string {
  if (index === 6) return "text-salon-script";
  if (index >= 8) {
    return "text-transparent [-webkit-text-stroke:1.5px_white] sm:[-webkit-text-stroke:2px_white]";
  }
  return "text-white";
}

function HeroTypewriterHeadline() {
  const [titleCount, setTitleCount] = useState(0);
  const [taglineCount, setTaglineCount] = useState(0);
  const [titleDone, setTitleDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setTitleCount(HERO_TITLE.length);
      setTaglineCount(HERO_TAGLINE.length);
      setTitleDone(true);
      return;
    }

    if (!titleDone) {
      if (titleCount >= HERO_TITLE.length) {
        setTitleDone(true);
        return;
      }
      const delay =
        titleCount === 0 ? TYPING_START_DELAY_MS : TITLE_CHAR_MS;
      const id = window.setTimeout(
        () => setTitleCount((count) => count + 1),
        delay,
      );
      return () => window.clearTimeout(id);
    }

    if (taglineCount >= HERO_TAGLINE.length) return;
    const delay = taglineCount === 0 ? 280 : TAGLINE_CHAR_MS;
    const id = window.setTimeout(
      () => setTaglineCount((count) => count + 1),
      delay,
    );
    return () => window.clearTimeout(id);
  }, [titleCount, taglineCount, titleDone]);

  const showTitleCaret = titleCount < HERO_TITLE.length;
  const showTaglineCaret =
    titleDone && taglineCount < HERO_TAGLINE.length;
  const typingComplete =
    titleDone && taglineCount >= HERO_TAGLINE.length;

  return (
    <>
      <h1
        className="text-4xl font-bold uppercase tracking-[0.08em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
        style={{ fontFamily: "var(--font-landing-sans), sans-serif" }}
      >
        <span aria-hidden className="inline-flex flex-wrap justify-center">
          {HERO_TITLE.slice(0, titleCount).split("").map((char, index) => (
            <span key={`${index}-${char}`} className={heroTitleCharClass(index)}>
              {char}
            </span>
          ))}
          {showTitleCaret ? (
            <span
              aria-hidden
              className="salon-typewriter-caret ml-0.5 inline-block h-[0.85em] w-[3px] translate-y-[0.06em] bg-salon-gold"
            />
          ) : null}
        </span>
        <span className="sr-only">Salon I Squad</span>
      </h1>
      <p className="mt-4 min-h-[1.5rem] max-w-md text-sm font-medium text-white/90 md:text-base">
        <span aria-hidden>
          {HERO_TAGLINE.slice(0, taglineCount)}
          {showTaglineCaret ? (
            <span
              aria-hidden
              className="salon-typewriter-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.12em] bg-white/80"
            />
          ) : null}
        </span>
        <span className="sr-only">{HERO_TAGLINE}</span>
      </p>
      <Link
        href="/booking"
        className={`salon-gold-btn mt-8 inline-flex h-12 items-center gap-2 rounded-md px-8 text-sm font-bold uppercase tracking-wide text-black transition-all duration-700 ${
          typingComplete
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        }`}
      >
        <CalendarDays className="h-4 w-4" />
        Book Appointment
      </Link>
    </>
  );
}

/**
 * Full-bleed hero like BuddyBerlin — zooming salon photos + centered brand CTA.
 */
export function SalonHeroSection() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const img = new Image();
    img.src = SALON_HERO_SLIDES[0].src;
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SALON_HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section
      id="gallery"
      className="relative flex min-h-[min(100svh,900px)] flex-col overflow-hidden bg-black"
      aria-label="Salon hero"
    >
      {/* Background slides */}
      <div className="absolute inset-0" aria-hidden>
        {SALON_HERO_SLIDES.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.src}
              className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${
                active ? "opacity-100" : "opacity-0"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt=""
                decoding={i === 0 ? "sync" : "async"}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                className={`h-full w-full object-cover ${
                  active ? "salon-zoom-kenburns-hero" : ""
                }`}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 bg-black/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/45" />
      </div>

      {/* Centered brand + CTA */}
      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center md:px-8">
        <HeroTypewriterHeadline />
      </div>

      {/* Slide dots */}
      <div className="relative z-10 flex justify-center gap-1.5 pb-6">
        {SALON_HERO_SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-salon-gold" : "w-1.5 bg-white/45 hover:bg-white/70"
            }`}
            aria-label={`Show image ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </div>

      {/* Soft handoff into the next section */}
      <div
        aria-hidden
        className="salon-hero-bottom-blur pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-20 md:h-28"
      />
    </section>
  );
}
