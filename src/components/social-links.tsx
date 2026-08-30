import { siteConfig, siteSocialLinks, type SiteSocialId } from "@/lib/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type SocialLinksProps = {
  className?: string;
  iconClassName?: string;
  /** Include WhatsApp from the salon phone number. */
  includeWhatsApp?: boolean;
  /** Gold pill links for contact / follow sections. */
  variant?: "default" | "brand";
};

const pillLinkClass =
  "inline-flex items-center gap-2 rounded-full border border-salon-gold/30 bg-salon-bg/40 px-3.5 py-2 text-xs font-semibold text-salon-gold transition hover:border-salon-gold/55 hover:bg-salon-gold/10";

const pillHoverClass: Record<SiteSocialId | "whatsapp", string> = {
  facebook: "hover:text-[#6ea8ff]",
  tiktok: "hover:text-salon-ink",
  whatsapp: "hover:text-[#5fe09a]",
};

function SocialIcon({ id }: { id: SiteSocialId | "whatsapp" }) {
  const common = "h-4 w-4 shrink-0";

  switch (id) {
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
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path
            fill="currentColor"
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"
          />
        </svg>
      );
  }
}

export function SocialLinks({
  className,
  iconClassName = "",
  includeWhatsApp = true,
  variant = "default",
}: SocialLinksProps) {
  const whatsappUrl = includeWhatsApp
    ? buildWhatsAppUrl(
        siteConfig.phoneTel,
        `Hi ${siteConfig.name}, I found you online and wanted to get in touch.`,
      )
    : null;

  const defaultLinkClass =
    "inline-flex items-center justify-center rounded-full border border-salon-beige/40 bg-salon-white text-salon-ink transition hover:border-salon-gold/50 hover:bg-salon-gold/10 hover:text-salon-gold";

  const defaultIconSize = iconClassName || "h-10 w-10 text-sm";

  if (variant === "brand") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
        {siteSocialLinks.map((social) => (
          <a
            key={social.id}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            title={social.label}
            className={`${pillLinkClass} ${pillHoverClass[social.id]}`}
          >
            <SocialIcon id={social.id} />
            {social.label}
          </a>
        ))}
        {whatsappUrl ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            title="WhatsApp"
            className={`${pillLinkClass} ${pillHoverClass.whatsapp}`}
          >
            <SocialIcon id="whatsapp" />
            WhatsApp
          </a>
        ) : null}
      </div>
    );
  }

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
          className={`${defaultLinkClass} ${defaultIconSize}`}
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
          className={`${defaultLinkClass} hover:border-[#25D366]/50 hover:bg-[#25D366]/10 hover:text-[#25D366] ${defaultIconSize}`}
        >
          <SocialIcon id="whatsapp" />
        </a>
      ) : null}
    </div>
  );
}
