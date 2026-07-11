"use client";

import { useEffect, useState } from "react";
import {
  brandingFallbackName,
  subscribeToBranding,
} from "@/lib/branding";

type LogoProps = {
  className?: string;
  /** Size class for the image */
  imageClassName?: string;
  /** Size class for fallback text */
  textClassName?: string;
};

export function Logo({
  className,
  imageClassName = "h-8 w-auto max-w-[160px] object-contain",
  textClassName = "text-sm font-semibold tracking-wide text-zinc-50",
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState("");
  const [imgFailed, setImgFailed] = useState(false);
  const fallback = brandingFallbackName();

  useEffect(() => {
    return subscribeToBranding((branding) => {
      setLogoUrl(branding.logoUrl);
      setImgFailed(false);
    });
  }, []);

  if (logoUrl && !imgFailed) {
    return (
      <span className={className}>
        {/* Remote master-configured URLs may be any host */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={fallback}
          className={imageClassName}
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  }

  return (
    <span className={className}>
      <span className={textClassName}>{fallback}</span>
    </span>
  );
}

/** Compact logo for sidebars / denser headers. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <Logo
      className={className}
      imageClassName="h-7 w-auto max-w-[140px] object-contain"
      textClassName="text-sm font-medium text-zinc-300"
    />
  );
}
