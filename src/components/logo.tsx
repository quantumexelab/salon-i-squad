"use client";

import { useEffect, useState } from "react";
import {
  brandingFallbackName,
  subscribeToBranding,
} from "@/lib/branding";
import { clientTheme } from "@/lib/client-theme";
import {
  SalonLogoMark,
} from "@/components/salon-logo-mark";

type CustomerLogoProps = {
  className?: string;
  /** compact = header, hero = login / landing hero */
  size?: "compact" | "hero";
};

/** Customer-facing logo — uses uploaded branding or `/logo.png`. */
export function CustomerLogo({
  className,
  size = "compact",
}: CustomerLogoProps) {
  const [logoUrl, setLogoUrl] = useState("");
  const [failed, setFailed] = useState(false);
  const fallback = brandingFallbackName();
  const src = logoUrl && !failed ? logoUrl : clientTheme.defaultLogoSrc;

  useEffect(() => {
    return subscribeToBranding((branding) => {
      setLogoUrl(branding.logoUrl);
      setFailed(false);
    });
  }, []);

  const sizeClass =
    size === "hero"
      ? "h-auto w-[min(100%,220px)] max-h-36 object-contain object-left"
      : "h-auto max-h-11 w-[min(100%,130px)] object-contain object-left";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={fallback}
      className={`object-contain ${sizeClass} ${className ?? ""}`}
      onError={() => setFailed(true)}
    />
  );
}

export function CustomerLogoHero({ className }: { className?: string }) {
  return <CustomerLogo size="hero" className={className} />;
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
  const [logoUrl, setLogoUrl] = useState("");
  const [remoteFailed, setRemoteFailed] = useState(false);
  const fallback = brandingFallbackName();

  useEffect(() => {
    return subscribeToBranding((branding) => {
      setLogoUrl(branding.logoUrl);
      setRemoteFailed(false);
    });
  }, []);

  if (logoUrl && !remoteFailed) {
    return (
      <span className={className}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={fallback}
          className="h-8 w-auto max-w-[160px] object-contain"
          onError={() => setRemoteFailed(true)}
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
