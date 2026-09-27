// StreamPay (https://docs.streampay.sa) — the payment gateway behind paid plans.
//
// Plain fetch, like server/email.ts: no SDK, so every request and error is in
// one readable place. Server-only — the key is a merchant credential.
//
// Flow, in StreamPay's own terms:
//   consumer (their customer record, one per Bid company)
//     → payment link for a RECURRING product, tied to that consumer
//       → hosted checkout → subscription + invoice + payment
// Everything that matters afterwards is read back from the API
// (syncCompanySubscription in server/lib/billing.ts); redirect query strings and
// webhook bodies are only ever hints about *what* to re-read.

import crypto from "crypto";
import {
  PAID_PLANS,
  BILLING_TERMS,
  parseProductExternalId,
  productExternalId,
  type BillingTerm,
  type PaidPlan,
} from "@shared/billing-plans";

const STREAMPAY_BASE_URL = "https://stream-app-service.streampay.sa";
const REQUEST_TIMEOUT_MS = 20_000;

/** base64("api-key:api-secret"), exactly what StreamPay calls the x-api-key. */
export function getStreamPayKey(): string | null {
  return process.env.STREAMPAY_API_KEY?.trim() || null;
}

export function getStreamPayWebhookSecret(): string | null {
  return process.env.STREAMPAY_WEBHOOK_SECRET?.trim() || null;
}

export class StreamPayError extends Error {
  constructor(
    message: string,
    /** StreamPay's stable error code, e.g. DUPLICATE_CONSUMER, or ours (NOT_CONFIGURED, NETWORK). */
    public code: string,
    /** HTTP status from StreamPay; 0 when the request never got an answer. */
    public status: number,
  ) {
    super(message);
    this.name = "StreamPayError";
  }
}

async function streamPayRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = getStreamPayKey();
  if (!key) {
    throw new StreamPayError("STREAMPAY_API_KEY is not set", "NOT_CONFIGURED", 0);
  }

  let response: Response;
  try {
    response = await fetch(`${STREAMPAY_BASE_URL}${path}`, {
      method,
      headers: {
        "x-api-key": key,
        "Accept": "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    console.error(`[StreamPay] ${method} ${path} → no response:`, err);
    throw new StreamPayError("Could not reach StreamPay", "NETWORK", 0);
  }

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body (gateway error page); reported below with the status.
  }

  if (!response.ok) {
    // Two shapes: the documented envelope {error:{code,message,additional_info}}
    // and FastAPI's validation 422 {detail:[{loc,msg,type}]}.
    const code: string = json?.error?.code
      ?? (Array.isArray(json?.detail) ? "INVALID_PARAMETERS" : `HTTP_${response.status}`);
    const detail = json?.error?.additional_info
      ?? json?.error?.message
      ?? (Array.isArray(json?.detail)
        ? json.detail.map((d: any) => `${(d.loc || []).join(".")}: ${d.msg}`).join("; ")
        : text.slice(0, 300));
    console.error(`[StreamPay] ${method} ${path} → ${response.status} ${code}: ${detail}`);
    throw new StreamPayError(String(detail || code), code, response.status);
  }

  return json as T;
}

// ---------------------------------------------------------------------------
// Types — only the fields Bid reads. See the openapi.json for the rest.
// ---------------------------------------------------------------------------

export interface StreamPayList<T> {
  data: T[];
  pagination?: { total_count: number; has_next_page: boolean };
}

export interface ConsumerInput {
  name: string;
  email?: string;
  phone_number?: string;
  /** Only accepted once an accounting integration is connected; Bid uses external_metadata. */
  external_id?: string;
  external_metadata?: Record<string, string>;
  preferred_language?: "AR" | "EN";
  communication_methods?: ("WHATSAPP" | "EMAIL" | "SMS")[];
  consumer_type?: "INDIVIDUAL" | "BUSINESS";
  vat_number?: string;
  commercial_registration?: string;
  /** Required by StreamPay when consumer_type is BUSINESS. */
  address?: { address_line_1: string; address_line_2?: string; city: string; postal_code?: string; country: string };
}

export interface StreamPayConsumer {
  id: string;
  name: string;
  email?: string | null;
  phone_number?: string | null;
  external_id?: string | null;
  external_metadata?: Record<string, string> | null;
  is_deleted?: boolean;
}

export interface StreamPayProduct {
  id: string;
  name: string;
  type: "RECURRING" | "ONE_OFF" | "METERED";
  recurring_interval?: "WEEK" | "MONTH" | "SEMESTER" | "YEAR" | null;
  /** What the customer pays, VAT included (90.85 for a 79 + VAT product). */
  price?: string | null;
  price_excluding_vat?: string | null;
  vat_amount?: string | null;
  currency?: string | null;
  is_price_inclusive_of_vat?: boolean;
  is_active?: boolean;
  external_id?: string | null;
  external_metadata?: Record<string, string> | null;
}

/**
 * Which Bid plan product this is. Tagged in external_metadata.bid_plan_key —
 * StreamPay only accepts external_id once an accounting integration is
 * connected, so external_id is read as a fallback only.
 */
export const PLAN_KEY_METADATA = "bid_plan_key";
export function productPlanKey(p: Pick<StreamPayProduct, "external_id" | "external_metadata"> | null | undefined): string | null {
  return p?.external_metadata?.[PLAN_KEY_METADATA] ?? p?.external_id ?? null;
}

export type StreamPaySubscriptionStatus =
  | "INACTIVE" | "ACTIVE" | "EXPIRED" | "CANCELED" | "FROZEN" | "TRIALING" | "TRIAL_PENDING";

export interface StreamPaySubscription {
  id: string;
  status: StreamPaySubscriptionStatus;
  created_at?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean | null;
  organization_consumer_id?: string | null;
  items?: { product_id: string; product?: StreamPayProduct | null }[];
}

export interface StreamPayPaymentLink {
  id: string;
  url: string;
  status: "INACTIVE" | "ACTIVE" | "COMPLETED";
  amount?: string;
  organization_consumer_id?: string | null;
  custom_metadata?: Record<string, unknown> | null;
}

export interface StreamPayInvoice {
  id: string;
  status: string;
  organization_consumer_id?: string | null;
  subscription_id?: string | null;
  payment_link_id?: string | null;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export function createConsumer(input: ConsumerInput) {
  return streamPayRequest<StreamPayConsumer>("POST", "/api/v2/consumers", input);
}

export function updateConsumer(id: string, input: Partial<ConsumerInput>) {
  return streamPayRequest<StreamPayConsumer>("PUT", `/api/v2/consumers/${encodeURIComponent(id)}`, input);
}

export function getConsumer(id: string) {
  return streamPayRequest<StreamPayConsumer>("GET", `/api/v2/consumers/${encodeURIComponent(id)}`);
}

export function searchConsumers(term: string) {
  const q = new URLSearchParams({ search_term: term, limit: "50" });
  return streamPayRequest<StreamPayList<StreamPayConsumer>>("GET", `/api/v2/consumers?${q}`);
}

export function listProducts(page = 1) {
  const q = new URLSearchParams({ page: String(page), limit: "100" });
  return streamPayRequest<StreamPayList<StreamPayProduct>>("GET", `/api/v2/products?${q}`);
}

export function createProduct(input: {
  name: string;
  description?: string;
  type: "RECURRING";
  recurring_interval: "MONTH" | "YEAR";
  recurring_interval_count: number;
  prices: { currency: string; amount: number; is_price_inclusive_of_vat: boolean }[];
  external_metadata: Record<string, string>;
}) {
  return streamPayRequest<StreamPayProduct>("POST", "/api/v2/products", input);
}

export function createPaymentLink(input: {
  name: string;
  description?: string;
  items: { product_id: string; quantity: number }[];
  currency: string;
  max_number_of_payments: number;
  valid_until: string;
  organization_consumer_id: string;
  contact_information_type: "PHONE" | "EMAIL";
  success_redirect_url: string;
  failure_redirect_url: string;
  custom_metadata: Record<string, string>;
}) {
  return streamPayRequest<StreamPayPaymentLink>("POST", "/api/v2/payment_links", input);
}

export function getPaymentLink(id: string) {
  return streamPayRequest<StreamPayPaymentLink>("GET", `/api/v2/payment_links/${encodeURIComponent(id)}`);
}

export function setPaymentLinkStatus(id: string, status: "INACTIVE" | "ACTIVE", deactivateMessage?: string) {
  return streamPayRequest<StreamPayPaymentLink>(
    "PATCH",
    `/api/v2/payment_links/${encodeURIComponent(id)}/status`,
    { status, ...(deactivateMessage ? { deactivate_message: deactivateMessage } : {}) },
  );
}

export function listConsumerSubscriptions(consumerId: string) {
  const q = new URLSearchParams({ organization_consumer_id: consumerId, limit: "50", sort_direction: "desc" });
  return streamPayRequest<StreamPayList<StreamPaySubscription>>("GET", `/api/v2/subscriptions?${q}`);
}

export function getSubscription(id: string) {
  return streamPayRequest<StreamPaySubscription>("GET", `/api/v2/subscriptions/${encodeURIComponent(id)}`);
}

export function getInvoice(id: string) {
  return streamPayRequest<StreamPayInvoice>("GET", `/api/v2/invoices/${encodeURIComponent(id)}`);
}

export function getPayment(id: string) {
  return streamPayRequest<{ id: string; current_status?: string }>("GET", `/api/v2/payments/${encodeURIComponent(id)}`);
}

export function createPortalSession(consumerId: string, subscriptionId?: string | null) {
  return streamPayRequest<{ id: string; url: string; expires_at?: string }>(
    "POST",
    "/api/v2/consumer_portal/sessions",
    { organization_consumer_id: consumerId, ...(subscriptionId ? { subscription_id: subscriptionId } : {}) },
  );
}

// ---------------------------------------------------------------------------
// Bid's four plan products
// ---------------------------------------------------------------------------

export type PlanProductMap = Record<`${PaidPlan}:${BillingTerm}`, StreamPayProduct>;

let planProductsCache: { at: number; map: PlanProductMap } | null = null;
const PLAN_PRODUCTS_TTL_MS = 10 * 60 * 1000;

export async function listAllProducts(): Promise<StreamPayProduct[]> {
  const all: StreamPayProduct[] = [];
  for (let page = 1; page <= 20; page++) {
    const res = await listProducts(page);
    all.push(...(res.data ?? []));
    if (!res.pagination?.has_next_page) break;
  }
  return all;
}

/**
 * The StreamPay product for every plan × term, found by its plan key. Cached for
 * a few minutes — products change only when scripts/streampay-setup-products.ts
 * runs. A missing product is a setup error, not something to paper over.
 */
export async function resolvePlanProducts(): Promise<PlanProductMap> {
  if (planProductsCache && Date.now() - planProductsCache.at < PLAN_PRODUCTS_TTL_MS) {
    return planProductsCache.map;
  }
  const products = await listAllProducts();
  const map = {} as PlanProductMap;
  const missing: string[] = [];
  for (const plan of PAID_PLANS) {
    for (const term of BILLING_TERMS) {
      const extId = productExternalId(plan, term);
      const product = products.find((p) => productPlanKey(p) === extId && p.is_active !== false);
      if (product) map[`${plan}:${term}`] = product;
      else missing.push(extId);
    }
  }
  if (missing.length > 0) {
    throw new StreamPayError(
      `StreamPay products missing: ${missing.join(", ")}. Run: npx tsx scripts/streampay-setup-products.ts`,
      "PRODUCTS_MISSING",
      0,
    );
  }
  planProductsCache = { at: Date.now(), map };
  return map;
}

/** Plan + term for a subscription, from its product's plan key (or product id, as a fallback). */
export function planForSubscription(
  sub: StreamPaySubscription,
  products?: PlanProductMap,
): { plan: PaidPlan; term: BillingTerm } | null {
  for (const item of sub.items ?? []) {
    const byExt = parseProductExternalId(productPlanKey(item.product));
    if (byExt) return byExt;
    if (products) {
      for (const [key, p] of Object.entries(products)) {
        if (p.id === item.product_id) {
          const [plan, term] = key.split(":") as [PaidPlan, BillingTerm];
          return { plan, term };
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Webhook signatures
// ---------------------------------------------------------------------------

/**
 * X-Webhook-Signature is "t=<unix>,v1=<hex>", where v1 is
 * HMAC-SHA256(secret, `${t}.${rawBody}`). Compared in constant time.
 * Returns the timestamp on success (used to de-duplicate retries), else null.
 */
export function verifyWebhookSignature(
  rawBody: Buffer | string,
  header: string | undefined | null,
  secret: string,
): { timestamp: string } | null {
  if (!header || !secret) return null;
  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts.set(piece.slice(0, idx).trim(), piece.slice(idx + 1).trim());
  }
  const t = parts.get("t");
  const v1 = parts.get("v1");
  if (!t || !v1 || !/^[0-9a-f]+$/i.test(v1)) return null;

  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { timestamp: t };
}

/** Test helper and documentation in one: how StreamPay builds the header. */
export function signWebhookBody(rawBody: string, secret: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const sig = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}
