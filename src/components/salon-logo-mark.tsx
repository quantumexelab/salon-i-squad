import { clientTheme } from "@/lib/client-theme";

export type SalonLogoVariant = "dark" | "light";

type SalonLogoMarkProps = {
  /** dark = gold on transparent (black UI). light = black/gold on transparent (ivory UI). */
  variant?: SalonLogoVariant;
  className?: string;
};

const palettes = {
  dark: {
    primary: clientTheme.gold,
    accent: clientTheme.champagne,
    word: clientTheme.ivory,
    cutout: "#000000",
  },
  light: {
    primary: "#111111",
    accent: clientTheme.gold,
    word: "#111111",
    cutout: clientTheme.ivory,
  },
} as const;

/** Geometric mark only — always fits a square viewBox. */
export function SalonLogoMark({
  variant = "dark",
  className,
}: SalonLogoMarkProps) {
  const colors = palettes[variant];

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-hidden="true"
    >
      <path
        d="M24 40 V24 H40 M160 24 H176 V40 M176 160 V176 H160 M40 176 H24 V160"
        stroke={colors.primary}
        strokeWidth="3"
        strokeLinecap="square"
      />
      <rect
        x="48"
        y="48"
        width="104"
        height="104"
        stroke={colors.primary}
        strokeWidth="1.75"
        opacity="0.7"
      />
      <rect
        x="64"
        y="64"
        width="72"
        height="72"
        stroke={colors.primary}
        strokeWidth="1.25"
        opacity="0.4"
      />
      <rect x="82" y="54" width="36" height="10" fill={colors.primary} />
      <rect x="82" y="136" width="36" height="10" fill={colors.primary} />
      <rect x="92" y="64" width="16" height="72" fill={colors.primary} />
      <path d="M92 96 L108 110 V96 H92 Z" fill={colors.cutout} />
    </svg>
  );
}

type SalonWordmarkProps = {
  variant?: SalonLogoVariant;
  className?: string;
};

/** “Salon I Squad” text — HTML so letters never clip inside SVG. */
export function SalonWordmark({
  variant = "dark",
  className,
}: SalonWordmarkProps) {
  const colors = palettes[variant];

  return (
    <p
      className={`text-center font-serif text-[13px] font-medium uppercase tracking-[0.28em] sm:text-sm ${className ?? ""}`}
      style={{ color: colors.word }}
      aria-label="Salon I Squad"
    >
      Salon{" "}
      <span style={{ color: colors.accent }}>I</span>
      {" "}Squad
    </p>
  );
}

type SalonLogoFullProps = {
  variant?: SalonLogoVariant;
  markClassName?: string;
  wordmarkClassName?: string;
  className?: string;
};

/** Mark + wordmark stack for login hero and about section. */
export function SalonLogoFull({
  variant = "dark",
  markClassName = "h-20 w-20",
  wordmarkClassName,
  className,
}: SalonLogoFullProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <SalonLogoMark variant={variant} className={markClassName} />
      <SalonWordmark variant={variant} className={wordmarkClassName} />
    </div>
  );
}
