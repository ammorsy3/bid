import { ApiError } from "@/lib/queryClient";
import { quantityErrorMessage, type QuantityError } from "@shared/quantity";

type Translate = (key: string, vars?: Record<string, string | number>) => string;

/**
 * A localized explanation for a refused request create/edit (server codes
 * INVALID_QUANTITY, INVALID_CONTACT and SPEC_LOCKED), or the error's own message otherwise.
 */
export function tenderErrorMessage(error: unknown, t: Translate, fallback: string): string {
  if (error instanceof ApiError) {
    const reason = error.details?.reason as string | undefined;
    if (error.code === "INVALID_QUANTITY" && reason) {
      const m = quantityErrorMessage(reason as QuantityError);
      return t(m.key, m.vars);
    }
    if (error.code === "INVALID_CONTACT") {
      if (reason === "whatsapp") return t("tenderFlow.whatsappInvalid");
      if (reason === "email") return t("tenderFlow.contactEmailInvalid");
      return t("tenderFlow.contactMissing");
    }
    if (error.code === "SPEC_LOCKED") return t("tenderFlow.specLockedError");
    if (error.code === "ITEMS_LOCKED") return t("items.publishedLock");
    if (error.code === "ITEMS_INVALID") return t("import.fixErrors");
    if (error.code === "STRUCTURED_PRICING_DISABLED") return t("pricingPage.err_STRUCTURED_PRICING_DISABLED");
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
