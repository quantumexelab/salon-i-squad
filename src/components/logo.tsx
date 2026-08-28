"use client";

import { useEffect, useState } from "react";
import {
  brandingFallbackName,
  subscribeToBranding,
} from "@/lib/branding";
import {
  SalonLogoFull,
  SalonLogoMark,
  SalonWordmark,
} from "@/components/salon-logo-mark";
import { useThemeMode } from "@/contexts/theme-mode-context";

const LOGO_SESSION_KEY = "sis-logo-animated";

type CustomerLogoProps = {
  className?: string;
  /** compact = header, hero = login / landing hero, mark = icon only */
  size?: "compact" | "hero" | "mark";
  /** Soft entrance animation on the logo mark. */
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

const remoteSizeStyles = {
  compact: "h-auto max-h-12 w-auto max-w-[148px] object-contain object-left",
  hero: "h-auto max-h-44 w-auto max-w-[min(100%,280px)] object-contain object-center sm:max-h-40",
  mark: "h-10 w-10 object-contain",
} as const;

function RemoteLogoImage({
  src,
  alt,
  size,
  className,
  onError,
}: {
  src: string;
  alt: string;
  size: "compact" | "hero" | "mark";
  className?: string;
  onError?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      className={`${remoteSizeStyles[size]} ${className ?? ""}`}
      onError={onError}
    />
  );
}

/** Customer-facing logo — remote branding upload or official mark artwork. */
export function CustomerLogo({
  className,
  size = "compact",
  animated = false,
}: CustomerLogoProps) {
  const { logoUrl, hasRemote, setFailed } = useRemoteBranding();
  const { mode } = useThemeMode();
  const fallback = brandingFallbackName();
  /** SVG “dark” palette = gold marks for dark UI; “light” = black marks for ivory UI. */
  const markVariant = mode === "dark" ? "dark" : "light";

  if (hasRemote) {
    return (
      <RemoteLogoImage
        src={logoUrl}
        alt={fallback}
        size={size}
        className={className}
        onError={() => setFailed(true)}
      />
    );
  }

  if (size === "mark") {
    return (
      <SalonLogoMark
        variant={markVariant}
        animated={animated}
        className={`aspect-[160/188] h-10 w-auto shrink-0 ${className ?? ""}`}
      />
    );
  }

  if (size === "hero") {
    return (
      <SalonLogoFull
        variant={markVariant}
        animated={animated}
        markClassName="aspect-[160/188] h-[4.5rem] w-auto sm:h-20"
        wordmarkClassName="text-xs sm:text-sm"
        className={className}
      />
    );
  }

  return (
    <span
      className={`inline-flex min-w-0 items-center gap-2 ${className ?? ""}`}
      aria-label={fallback}
    >
      <SalonLogoMark
        variant={markVariant}
        animated={animated}
        className="aspect-[160/188] h-9 w-auto shrink-0"
      />
      <SalonWordmark
        variant={markVariant}
        animated={animated}
        className="truncate text-left text-[10px] tracking-[0.22em] sm:text-[11px]"
      />
    </span>
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
    <CustomerLogo
      size="hero"
      className={className}
      animated={animated}
    />
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
      <SalonLogoMark
        variant="dark"
        className={`shrink-0 ${imageClassName}`}
      />
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
