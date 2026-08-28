export const siteConfig = {
  name: "Salon I Squad",
  description:
    "Premium hair, beauty, and bridal styling in Colombo. Book your appointment online at Salon I Squad.",
  /** Public contact number shown on the landing page. */
  phoneDisplay: "+94 77 123 4567",
  phoneTel: "+94771234567",
  email: "hello@salonisquad.lk",
  address: "Colombo, Sri Lanka",
  /** Browser chrome / PWA theme (metallic gold). */
  themeColor: "#D4AF37",
  /** Splash / install background. */
  backgroundColor: "#F8F5F0",
} as const;

/** Public social profiles — update URLs when accounts go live. */
export const siteSocialLinks = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/salonisquad",
  },
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/share/1dZvqWEsU8/",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@salon.i7",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@salonisquad",
  },
] as const;

export type SiteSocialId = (typeof siteSocialLinks)[number]["id"];
