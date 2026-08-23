"use client";

import { useEffect, useState } from "react";
import {
  brandingFallbackName,
  subscribeToBranding,
} from "@/lib/branding";
import { clientTheme } from "@/lib/client-theme";

const LOGO_SESSION_KEY = "sis-logo-animated";

type CustomerLogoProps = {
  className?: string;
  /** compact = header, hero = login / landing hero, mark = icon only */
  size?: "compact" | "hero" | "mark";
  /** Soft entrance animation on the official PNG logo. */
  animated?: boolean;
  /** White pad behind logo for crisp contrast on ivory headers. */
  padded?: boolean;
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

const sizeStyles = {
  compact: {
    wrap: "max-w-[148px]",
    img: "h-auto max-h-12 w-full object-contain object-left",
  },
  hero: {
    wrap: "max-w-[min(100%,280px)]",
    img: "h-auto max-h-44 w-full object-contain object-center sm:max-h-40",
  },
  mark: {
    wrap: "max-w-[2.75rem]",
    img: "h-10 w-10 object-contain",
  },
} as const;

function CustomerLogoImage({
  src,
  alt,
  size,
  className,
  animated,
  padded,
  onError,
}: {
  src: string;
  alt: string;
  size: "compact" | "hero" | "mark";
  className?: string;
  animated?: boolean;
  padded?: boolean;
  onError?: () => void;
}) {
  const styles = sizeStyles[size];

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size === "hero" ? 280 : 148}
      height={size === "hero" ? 160 : 48}
      decoding="async"
      className={`customer-logo-img ${styles.img} ${animated ? "logo-png-enter" : ""}`}
      onError={onError}
    />
  );

  return (
    <span
      className={`inline-flex min-w-0 shrink-0 ${styles.wrap} ${className ?? ""}`}
    >
      {padded ? (
        <span className="inline-block rounded-lg bg-white px-1.5 py-1 shadow-sm shadow-black/[0.04] ring-1 ring-black/[0.04]">
          {image}
        </span>
      ) : (
        image
      )}
    </span>
  );
}

/** Customer-facing logo — remote branding or official `/logo.png`. */
export function CustomerLogo({
  className,
  size = "compact",
  animated = false,
  padded = false,
}: CustomerLogoProps) {
  const { logoUrl, hasRemote, setFailed } = useRemoteBranding();
  const fallback = brandingFallbackName();
  const imageSrc = hasRemote
    ? logoUrl
    : size === "mark"
      ? "/logo-mark.png"
      : clientTheme.defaultLogoSrc;

  return (
    <CustomerLogoImage
      src={imageSrc}
      alt={fallback}
      size={size}
      className={className}
      animated={animated && !hasRemote}
      padded={padded}
      onError={() => setFailed(true)}
    />
  );
}

export function CustomerLogoHero({
  className,
  animated = true,
  padded = false,
}: {
  className?: string;
  animated?: boolean;
  padded?: boolean;
}) {
  return (
    <CustomerLogo
      size="hero"
      className={className}
      animated={animated}
      padded={padded}
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden
        className={`object-contain ${imageClassName}`}
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
