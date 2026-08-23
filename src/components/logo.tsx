"use client";

import { useEffect, useState } from "react";
import {
  brandingFallbackName,
  subscribeToBranding,
} from "@/lib/branding";
import { clientTheme } from "@/lib/client-theme";
import {
  SalonLogoFull,
  SalonLogoMark,
} from "@/components/salon-logo-mark";

const LOGO_SESSION_KEY = "sis-logo-animated";

type CustomerLogoProps = {
  className?: string;
  /** compact = header, hero = login / landing hero */
  size?: "compact" | "hero";
  /** Play SVG draw / rise animation (default branding only). */
  animated?: boolean;
};

function useRemoteBranding() {
  const [logoUrl, setLogoUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    return subscribeToBranding((branding) => {
      setLogoUrl(branding.logoUrl);
      setFailed(false);
    });
  }, []);

  const hasRemote = Boolean(logoUrl && !failed);
  return { logoUrl, failed, hasRemote, setFailed };
}

/** First app visit in session — animate header logo once. */
export function useLogoSessionAnimation() {
  const [shouldAnimate, setShouldAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(LOGO_SESSION_KEY)) {
      setShouldAnimate(false);
      return;
    }
    sessionStorage.setItem(LOGO_SESSION_KEY, "1");
    setShouldAnimate(true);
  }, []);

  return shouldAnimate;
}

function CustomerLogoStatic({
  src,
  alt,
  size,
  className,
  animated,
  onError,
}: {
  src: string;
  alt: string;
  size: "compact" | "hero";
  className?: string;
  animated?: boolean;
  onError?: () => void;
}) {
  const sizeClass =
    size === "hero"
      ? "h-auto w-[min(100%,220px)] max-h-36 object-contain object-left"
      : "h-auto max-h-11 w-[min(100%,130px)] object-contain object-left";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={`object-contain ${sizeClass} ${animated ? "logo-png-enter" : ""} ${className ?? ""}`}
      onError={onError}
    />
  );
}

function CustomerLogoSvg({
  size,
  className,
  animated,
}: {
  size: "compact" | "hero";
  className?: string;
  animated?: boolean;
}) {
  if (size === "compact") {
    return (
      <span
        className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
        aria-label="Salon I Squad"
      >
        <SalonLogoMark
          variant="light"
          animated={animated}
          className="h-9 w-9 shrink-0"
        />
        <span
          className={`truncate font-serif text-[10px] font-medium uppercase tracking-[0.22em] text-salon-ink sm:text-[11px] ${animated ? "logo-rise-wordmark" : ""}`}
        >
          Salon{" "}
          <span className="text-salon-gold">I</span> Squad
        </span>
      </span>
    );
  }

  return (
    <SalonLogoFull
      variant="light"
      animated={animated}
      markClassName="h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20"
      wordmarkClassName="text-xs sm:text-sm"
      className={className}
    />
  );
}

/** Customer-facing logo — remote branding, animated SVG, or `/logo.png`. */
export function CustomerLogo({
  className,
  size = "compact",
  animated = false,
}: CustomerLogoProps) {
  const { logoUrl, hasRemote, setFailed } = useRemoteBranding();
  const fallback = brandingFallbackName();

  if (hasRemote) {
    return (
      <CustomerLogoStatic
        src={logoUrl}
        alt={fallback}
        size={size}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  if (animated) {
    return (
      <CustomerLogoSvg size={size} className={className} animated />
    );
  }

  return (
    <CustomerLogoStatic
      src={clientTheme.defaultLogoSrc}
      alt={fallback}
      size={size}
      className={className}
    />
  );
}

export function CustomerLogoHero({
  className,
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <CustomerLogo size="hero" className={className} animated={animated} />
  );
}

/* ── Staff / admin logo (dark UI) ── */

type LogoProps = {
  className?: string;
  imageClassName?: string;
  textClassName?: string;
};

export function Logo({
  className,
  imageClassName = "h-8 w-8",
  textClassName = "text-sm font-semibold tracking-wide text-zinc-50",
}: LogoProps) {
  const { logoUrl, hasRemote, setFailed } = useRemoteBranding();
  const fallback = brandingFallbackName();

  if (hasRemote) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={fallback}
          className="h-8 w-auto max-w-[160px] object-contain"
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <SalonLogoMark variant="dark" className={imageClassName} />
      <span className={textClassName}>{fallback}</span>
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <Logo
      className={className}
      imageClassName="h-7 w-7"
      textClassName="text-sm font-medium text-zinc-300"
    />
  );
}

/** @deprecated Use CustomerLogoHero on customer pages. */
export function LogoHero({ className }: { className?: string }) {
  return <CustomerLogoHero className={className} />;
}
