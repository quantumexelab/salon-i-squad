/** Luxury White + Gold palette for customer-facing UI. */
export const clientTheme = {
  /** Page background — warm ivory white. */
  bg: "#F8F5F0",
  /** Pure white cards and header. */
  white: "#FFFFFF",
  /** Card / subtle panels. */
  surface: "#FAF8F5",
  /** Primary body text. */
  ink: "#1A1A1A",
  /** Muted secondary text. */
  muted: "#6B6560",
  gold: "#D4AF37",
  champagne: "#E8D9A8",
  ivory: "#F8F5F0",
  beige: "#D8C3A5",
  /** Customer brand logo (symbol + wordmark on white). */
  defaultLogoSrc: "/logo.png",
} as const;

export const clientGoldGradient =
  "linear-gradient(135deg, #E8D9A8 0%, #D4AF37 45%, #b8942e 100%)";
