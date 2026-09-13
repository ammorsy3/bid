import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { translate, useI18n, type Language } from "@/lib/i18n";

/**
 * Single source of truth for Bid's support contact details. Anything that shows
 * a phone number or WhatsApp link must read these rather than inlining them, so
 * a change lands everywhere at once.
 */
export const SUPPORT_PHONE_DISPLAY = "+966 583868916";
export const SUPPORT_PHONE_HREF = "tel:+966583868916";
export const SUPPORT_WHATSAPP_URL = "https://wa.me/message/OPXCLPNEAXA4P1";
export const SUPPORT_INSTAGRAM_URL = "https://instagram.com/bidapp_sa";
export const SUPPORT_LINKEDIN_URL = "https://www.linkedin.com/company/bidappsa/";

/** WhatsApp's glyph isn't in lucide, so it's inlined as an icon-sized SVG. */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.198.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.174-.297-.019-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.116-.199.058-.372-.015-.52-.074-.15-.669-1.612-.916-2.207-.241-.579-.486-.5-.668-.51-.174-.008-.372-.01-.57-.01-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.746.456 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.004c5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm0 18.02h-.003a8.2 8.2 0 0 1-4.18-1.145l-.3-.178-3.114.818.83-3.037-.195-.312a8.19 8.19 0 0 1-1.256-4.256c0-4.54 3.7-8.235 8.24-8.235 2.2 0 4.27.858 5.824 2.414a8.18 8.18 0 0 1 2.41 5.828c0 4.54-3.695 8.24-8.235 8.24z" />
    </svg>
  );
}

/** Instagram's glyph isn't in lucide either, so it's inlined here too. */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

/** LinkedIn's glyph, inlined like the others. */
export function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  );
}

type SupportContactLinksProps = {
  /**
   * Overrides the provider language. The landing page keeps its own AR/EN
   * toggle outside I18nProvider, so it passes its language explicitly.
   */
  lang?: Language;
  className?: string;
  linkClassName?: string;
  iconClassName?: string;
  /** Show the localized label next to each value (defaults to value only). */
  showLabels?: boolean;
};

/**
 * The phone + WhatsApp pair. Presentation is driven by the caller's classes so
 * this works inside the landing footer's plain CSS and the dashboard's Tailwind
 * chrome without either one re-implementing the links.
 */
export function SupportContactLinks({
  lang,
  className,
  linkClassName,
  iconClassName,
  showLabels = false,
}: SupportContactLinksProps) {
  const ctx = useI18n();
  const activeLang = lang ?? ctx.language;
  const s = (key: string) => translate(activeLang, `support.${key}`);

  return (
    <div className={className}>
      <a
        href={SUPPORT_PHONE_HREF}
        className={linkClassName}
        aria-label={s("phoneAria")}
        data-testid="link-support-phone"
      >
        <Phone className={iconClassName} aria-hidden="true" />
        <span dir="ltr">{SUPPORT_PHONE_DISPLAY}</span>
        {showLabels && <span className="sr-only">{s("callUs")}</span>}
      </a>
      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        aria-label={s("whatsappAria")}
        data-testid="link-support-whatsapp"
      >
        <WhatsAppIcon className={cn(iconClassName)} />
        <span>{s("whatsapp")}</span>
      </a>
      <a
        href={SUPPORT_INSTAGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        aria-label={s("instagramAria")}
        data-testid="link-support-instagram"
      >
        <InstagramIcon className={cn(iconClassName)} />
        <span>{s("instagram")}</span>
      </a>
      <a
        href={SUPPORT_LINKEDIN_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        aria-label={s("linkedinAria")}
        data-testid="link-support-linkedin"
      >
        <LinkedInIcon className={cn(iconClassName)} />
        <span>{s("linkedin")}</span>
      </a>
    </div>
  );
}
