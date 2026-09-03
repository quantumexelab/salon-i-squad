"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";

const HERO_VIDEO_SRC = "/videos/hero.mp4";
const HERO_POSTER_SRC = "/videos/hero-poster.jpg";
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
 * Full-bleed hero with looping salon video + centered brand CTA.
 * Place file at public/videos/hero.mp4 (optional poster: hero-poster.jpg).
 */
export function SalonHeroSection() {
  return (
    <section
      id="gallery"
      className="relative flex min-h-[min(100svh,900px)] flex-col overflow-hidden bg-black"
      aria-label="Salon hero"
    >
      <div className="absolute inset-0" aria-hidden>
        <video
          className="h-full w-full object-cover brightness-105 contrast-105"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={HERO_POSTER_SRC}
        >
          <source src={HERO_VIDEO_SRC} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/30" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-24 text-center md:px-8">
        <HeroTypewriterHeadline />
      </div>

      <div
        aria-hidden
        className="salon-hero-bottom-blur pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-20 md:h-28"
      />
    </section>
  );
}
