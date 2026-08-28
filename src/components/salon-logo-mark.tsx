import { clientTheme } from "@/lib/client-theme";

export type SalonLogoVariant = "dark" | "light";

type SalonLogoMarkProps = {
  /** dark = gold on transparent (black UI). light = black on transparent (ivory UI). */
  variant?: SalonLogoVariant;
  className?: string;
  animated?: boolean;
};

const palettes = {
  dark: {
    markSrc: "/logo-mark-gold.png",
    word: clientTheme.ivory,
    wordAccent: clientTheme.champagne,
  },
  light: {
    markSrc: "/logo-mark.png",
    word: "#111111",
    wordAccent: clientTheme.brandRed,
  },
} as const;

/** Official Salon I Squad mark from brand artwork (PNG, transparent). */
export function SalonLogoMark({
  variant = "dark",
  className,
  animated = false,
}: SalonLogoMarkProps) {
  const colors = palettes[variant];

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={colors.markSrc}
      alt=""
      decoding="async"
      draggable={false}
      className={`select-none object-contain ${animated ? "logo-png-enter" : ""} ${className ?? ""}`}
      aria-hidden="true"
    />
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
      <span style={{ color: colors.wordAccent }}>I</span>
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
  markClassName = "h-20 w-auto",
  wordmarkClassName,
  className,
  animated = false,
}: SalonLogoFullProps) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className ?? ""}`}>
      <SalonLogoMark
        variant={variant}
        className={`aspect-[160/188] w-auto ${markClassName}`}
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
