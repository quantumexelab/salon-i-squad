/** Catalog card images — match by service name keywords (specific first). */
const SERVICE_IMAGES: { pattern: string; url: string }[] = [
  {
    pattern: "beard",
    // Beard trim / grooming on a client
    url: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "shave",
    // Classic barber shave
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "colour",
    // Hair colour / dye session
    url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "color",
    url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "styling",
    // Blow-dry / style finish
    url: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "haircut",
    // Precision haircut
    url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "hair cut",
    url: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "facial",
    // Facial treatment
    url: "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "spa",
    url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "bridal",
    url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "makeup",
    url: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "kids",
    url: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
  },
  {
    pattern: "hair",
    // Generic hair service — after more specific matches
    url: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80",
  },
];

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1585747860715-2ba37e789b2b?auto=format&fit=crop&w=800&q=80";

/** Curated catalog used when seeding / sample services. */
export const CATALOG_SERVICE_IMAGES = {
  haircut:
    "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80",
  beard:
    "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80",
  shave:
    "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80",
  styling:
    "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800&q=80",
  color:
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80",
  facial:
    "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&w=800&q=80",
  spa: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
  bridal:
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=800&q=80",
} as const;

export function serviceImageFor(name: string, imageUrl?: string): string {
  const custom = imageUrl?.trim();
  // Keep real uploads (Storage / remote CDN); refresh old Unsplash sample URLs via name match.
  const isUnsplashSample =
    !custom || custom.includes("images.unsplash.com");

  if (custom && !isUnsplashSample) return custom;

  const key = name.trim().toLowerCase();
  for (const { pattern, url } of SERVICE_IMAGES) {
    if (key.includes(pattern)) return url;
  }
  return custom || DEFAULT_IMAGE;
}
