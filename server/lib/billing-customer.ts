// Who is paying, assembled from what Bid already knows — so the payer is only
// asked for what is genuinely missing, and StreamPay's checkout (which skips its
// own details form when handed a consumer id) never asks at all.
//
// Pure functions: no database, no network. server/lib/billing.ts feeds them.

import type { BillingProfile, Company, CompanyProfile, User } from "@shared/schema";
import {
  isValidCr,
  isValidSaudiVat,
  normalizeSaudiPhone,
  REQUIRED_BILLING_FIELDS,
  type BillingDetailField,
  type ResolvedBillingDetails,
} from "@shared/billing-details";
import type { ConsumerInput } from "./streampay";

type UserLike = Pick<User, "name" | "email" | "phoneNumber" | "language">;
type CompanyLike = Pick<Company, "id" | "name" | "legalName" | "accountType" | "crNumber" | "vatNumber" | "city">;
type CompanyProfileLike = Pick<CompanyProfile, "whatsappNumber"> | null | undefined;
type BillingProfileLike = Pick<BillingProfile, "billingName" | "billingEmail" | "billingPhone" | "vatNumber" | "crNumber" | "address" | "city"> | null | undefined;

/** Fields worth asking about for this kind of workspace. Tax ids only mean something for a registered company. */
export function applicableBillingFields(accountType: string | null | undefined): BillingDetailField[] {
  return accountType === "company"
    ? ["billingName", "billingEmail", "billingPhone", "vatNumber", "crNumber", "address", "city"]
    : ["billingName", "billingEmail", "billingPhone"];
}

const clean = (v: string | null | undefined): string | null => {
  const t = (v ?? "").trim();
  return t ? t : null;
};

/**
 * For each field: what the payer typed at checkout wins, otherwise the best
 * value already in the app. App values that would fail validation (an old
 * free-text VAT, a landline) are not offered — the field counts as missing and
 * the form asks for it, rather than the invoice carrying something wrong.
 */
export function resolveBillingDetails(
  user: UserLike,
  company: CompanyLike,
  companyProfile?: CompanyProfileLike,
  billing?: BillingProfileLike,
): ResolvedBillingDetails & { applicable: BillingDetailField[] } {
  const isCompany = company.accountType === "company";
  const applicable = applicableBillingFields(company.accountType);

  type Source = "billing" | "account" | "company";
  const candidates: Record<BillingDetailField, [string | null, Source][]> = {
    // A company is invoiced under its legal name; a person or team under the person's name.
    billingName: isCompany
      ? [[clean(billing?.billingName), "billing"], [clean(company.legalName), "company"], [clean(company.name), "company"]]
      : [[clean(billing?.billingName), "billing"], [clean(user.name), "account"]],
    billingEmail: [
      [clean(billing?.billingEmail), "billing"],
      [clean(user.email), "account"],
    ],
    billingPhone: [
      [normalizeSaudiPhone(billing?.billingPhone), "billing"],
      [normalizeSaudiPhone(user.phoneNumber), "account"],
      [normalizeSaudiPhone(companyProfile?.whatsappNumber), "company"],
    ],
    vatNumber: [
      [isValidSaudiVat(billing?.vatNumber) ? clean(billing?.vatNumber) : null, "billing"],
      [isValidSaudiVat(company.vatNumber) ? clean(company.vatNumber) : null, "company"],
    ],
    crNumber: [
      [isValidCr(billing?.crNumber) ? clean(billing?.crNumber) : null, "billing"],
      [isValidCr(company.crNumber) ? clean(company.crNumber) : null, "company"],
    ],
    address: [
      [clean(billing?.address), "billing"],
    ],
    city: [
      [clean(billing?.city), "billing"],
      [clean(company.city), "company"],
    ],
  };

  const values = {} as Record<BillingDetailField, string | null>;
  const sources: ResolvedBillingDetails["sources"] = {};
  const missing: BillingDetailField[] = [];

  for (const field of Object.keys(candidates) as BillingDetailField[]) {
    const hit = applicable.includes(field) ? candidates[field].find(([v]) => v !== null) : undefined;
    values[field] = hit ? hit[0] : null;
    if (hit) sources[field] = hit[1];
    else if (applicable.includes(field)) missing.push(field);
  }

  return { values, sources, missing, applicable };
}

export function missingRequiredFields(details: ResolvedBillingDetails): BillingDetailField[] {
  return REQUIRED_BILLING_FIELDS.filter((f) => !details.values[f]);
}

/**
 * The StreamPay consumer body for a company, from resolved details.
 *
 * StreamPay only accepts a BUSINESS consumer with an address (building/street
 * + city), and only a business carries VAT/CR onto the invoice. So a company
 * that gave its address is billed as a business; one that didn't is billed
 * under its name as an individual rather than being blocked from paying.
 */
export function buildConsumerPayload(
  details: ResolvedBillingDetails,
  company: Pick<Company, "id" | "accountType">,
  language: string | null | undefined,
): ConsumerInput {
  const v = details.values;
  const payload: ConsumerInput = {
    name: v.billingName ?? "Bid customer",
    external_metadata: { bid_company_id: company.id },
    preferred_language: language === "ar" ? "AR" : "EN",
    consumer_type: "INDIVIDUAL",
    communication_methods: ["EMAIL"],
  };
  if (v.billingEmail) payload.email = v.billingEmail;
  if (v.billingPhone) payload.phone_number = v.billingPhone;
  if (company.accountType === "company" && v.address && v.city) {
    payload.consumer_type = "BUSINESS";
    payload.address = { address_line_1: v.address, city: v.city, country: "SA" };
    if (v.vatNumber) payload.vat_number = v.vatNumber;
    if (v.crNumber) payload.commercial_registration = v.crNumber;
  }
  return payload;
}
