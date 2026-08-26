/** Shared brand accents (used by SVG logo palettes). */
export const clientTheme = {
  gold: "#C6A664",
  champagne: "#E8D9A8",
  ivory: "#F8F5F0",
  brandRed: "#D32F2F",
  /** Optional remote branding image; default UI uses inline SVG logo. */
  defaultLogoSrc: "/logo.png",
} as const;

export const clientGoldGradient =
  "linear-gradient(135deg, #E8D9A8 0%, #C6A664 45%, #a8893f 100%)";
