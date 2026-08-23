/** Placeholder images for mobile booking service cards. */
const SERVICE_IMAGES: Record<string, string> = {
  "hair styling":
    "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
  facial:
    "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=600&q=80",
  color:
    "https://images.unsplash.com/photo-1600948836101-f9ffda59d250?auto=format&fit=crop&w=600&q=80",
  bridal:
    "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&fit=crop&w=600&q=80",
};

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80";

export function serviceImageFor(
  name: string,
  imageUrl?: string,
): string {
  const custom = imageUrl?.trim();
  if (custom) return custom;

  const key = name.trim().toLowerCase();
  for (const [pattern, url] of Object.entries(SERVICE_IMAGES)) {
    if (key.includes(pattern)) return url;
  }
  return DEFAULT_IMAGE;
}
