import { siteConfig, siteSocialLinks, type SiteSocialId } from "@/lib/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type SocialLinksProps = {
  className?: string;
  iconClassName?: string;
  /** Include WhatsApp from the salon phone number. */
  includeWhatsApp?: boolean;
};

function SocialIcon({ id }: { id: SiteSocialId | "whatsapp" }) {
  const common = "h-[1.15em] w-[1.15em]";

  switch (id) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle
            cx="12"
            cy="12"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <circle cx="17.25" cy="6.75" r="1" fill="currentColor" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            d="M14 8.5h2.5V5.5H14c-2.2 0-3.5 1.35-3.5 3.65V11H8v3h2.5v8H14v-8h2.7l.5-3H14V9.1c0-.85.2-1.4 1.3-1.4Z"
            fill="currentColor"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            d="M16.5 5.2c.9.8 2 1.3 3.2 1.4V9.8a5.9 5.9 0 0 1-3.2-.9v6.4a4.7 4.7 0 1 1-4.7-4.7c.2 0 .5 0 .7.1v2.9a1.9 1.9 0 1 0 1.3 1.8V5.2h2.7Z"
            fill="currentColor"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            d="M10 9.2v5.6l4.8-2.8L10 9.2Zm11.2-3.2a2.4 2.4 0 0 0-1.7-.7C17.2 5 12 5 12 5s-5.2 0-7.5.3a2.4 2.4 0 0 0-1.7.7A25 25 0 0 0 2 12a25 25 0 0 0 .8 6 2.4 2.4 0 0 0 1.7.7C6.8 19 12 19 12 19s5.2 0 7.5-.3a2.4 2.4 0 0 0 1.7-.7 25 25 0 0 0 .8-6 25 25 0 0 0-.8-6Z"
            fill="currentColor"
          />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            d="M12 2a10 10 0 0 0-8.7 15l-.8 3 3.1-.8A10 10 0 1 0 12 2Zm0 1.8a8.2 8.2 0 0 1 6.5 13.2l.2.2-.2 1.2 1.2-.3-.2.2A8.2 8.2 0 1 1 12 3.8Zm-2.9 4.1c.2 0 .4 0 .5.3.2.5.6 1.5.6 1.6 0 .2 0 .4-.2.6l-.4.4c-.2.2-.2.4 0 .7.5.9 1.4 1.8 2.4 2.3.2.1.4.1.6-.1l.4-.5c.2-.2.4-.2.6-.1.5.2 1.5.7 1.6.7.2.1.3.3.3.5 0 .6-.8 1.5-1.2 1.7-.4.2-1 .3-1.7.1a7.4 7.4 0 0 1-3.6-2.1 7.7 7.7 0 0 1-2.1-3.6c-.1-.7 0-1.3.2-1.7.2-.4 1.1-1.2 1.7-1.2Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

export function SocialLinks({
  className,
  iconClassName = "h-10 w-10 text-sm",
  includeWhatsApp = true,
}: SocialLinksProps) {
  const whatsappUrl = includeWhatsApp
    ? buildWhatsAppUrl(
        siteConfig.phoneTel,
        `Hi ${siteConfig.name}, I found you online and wanted to get in touch.`,
      )
    : null;

  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className ?? ""}`}>
      {siteSocialLinks.map((social) => (
        <a
          key={social.id}
          href={social.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.label}
          title={social.label}
          className={`inline-flex items-center justify-center rounded-full border border-salon-beige/40 bg-salon-white text-salon-ink transition hover:border-salon-gold/50 hover:bg-salon-gold/10 hover:text-salon-gold ${iconClassName}`}
        >
          <SocialIcon id={social.id} />
        </a>
      ))}
      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="WhatsApp"
          title="WhatsApp"
          className={`inline-flex items-center justify-center rounded-full border border-salon-beige/40 bg-salon-white text-salon-ink transition hover:border-[#25D366]/50 hover:bg-[#25D366]/10 hover:text-[#25D366] ${iconClassName}`}
        >
          <SocialIcon id="whatsapp" />
        </a>
      ) : null}
    </div>
  );
}
