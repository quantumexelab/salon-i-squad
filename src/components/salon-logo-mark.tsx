import { clientTheme } from "@/lib/client-theme";

export type SalonLogoVariant = "dark" | "light";

type SalonLogoMarkProps = {
  /** dark = gold on transparent (black UI). light = black/gold on transparent (ivory UI). */
  variant?: SalonLogoVariant;
  className?: string;
  animated?: boolean;
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
  animated = false,
}: SalonLogoMarkProps) {
  const colors = palettes[variant];
  const drawClass = animated ? "logo-draw" : undefined;
  const drawDelay1 = animated ? "logo-draw logo-draw-delay-1" : undefined;
  const drawDelay2 = animated ? "logo-draw logo-draw-delay-2" : undefined;
  const fillClass = animated ? "logo-fill-in" : undefined;
  const fillDelay1 = animated ? "logo-fill-in logo-fill-in-delay-1" : undefined;
  const shimmerClass = animated ? "logo-shimmer" : undefined;

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
        pathLength={100}
        className={drawClass}
      />
      <rect
        x="48"
        y="48"
        width="104"
        height="104"
        stroke={colors.primary}
        strokeWidth="1.75"
        opacity={animated ? 1 : 0.7}
        pathLength={100}
        className={drawDelay1}
      />
      <rect
        x="64"
        y="64"
        width="72"
        height="72"
        stroke={colors.primary}
        strokeWidth="1.25"
        opacity={animated ? 1 : 0.4}
        pathLength={100}
        className={drawDelay2}
      />
      <rect
        x="82"
        y="54"
        width="36"
        height="10"
        fill={colors.accent}
        className={fillClass}
      />
      <rect
        x="82"
        y="136"
        width="36"
        height="10"
        fill={colors.accent}
        className={fillClass}
      />
      <rect
        x="92"
        y="64"
        width="16"
        height="72"
        fill={colors.accent}
        className={fillDelay1}
      />
      <path
        d="M92 96 L108 110 V96 H92 Z"
        fill={colors.cutout}
        className={fillDelay1}
      />
      {animated ? (
        <rect
          x="48"
          y="48"
          width="104"
          height="104"
          fill="none"
          stroke={colors.accent}
          strokeWidth="0.5"
          opacity="0.35"
          className={shimmerClass}
        />
      ) : null}
    </svg>
  );
}

type SalonWordmarkProps = {
  variant?: SalonLogoVariant;
  className?: string;
  animated?: boolean;
};

/** “Salon I Squad” text — HTML so letters never clip inside SVG. */
export function SalonWordmark({
  variant = "dark",
  className,
  animated = false,
}: SalonWordmarkProps) {
  const colors = palettes[variant];

  return (
    <p
      className={`text-center font-serif text-[13px] font-medium uppercase tracking-[0.28em] sm:text-sm ${animated ? "logo-rise-wordmark" : ""} ${className ?? ""}`}
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
  animated?: boolean;
};

/** Mark + wordmark stack for login hero and about section. */
export function SalonLogoFull({
  variant = "dark",
  markClassName = "h-20 w-20",
  wordmarkClassName,
  className,
  animated = false,
}: SalonLogoFullProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <SalonLogoMark
        variant={variant}
        className={markClassName}
        animated={animated}
      />
      <SalonWordmark
        variant={variant}
        className={wordmarkClassName}
        animated={animated}
      />
    </div>
  );
}
