// Paid plans: checkout, plan state and follow-ups, on top of StreamPay.
//
// The one rule: StreamPay is the source of truth for whether a company has
// paid. company_subscriptions is only a cache of it, and the only thing that
// writes that cache is syncCompanySubscription(), which re-reads StreamPay.
// The return page, the webhook and the follow-up job all go through it, so
// nothing a browser puts in a query string (or a forged webhook) can grant a
// plan, and local dev works without webhooks.

import { and, desc, eq, gte, inArray, isNull, lt, ne } from "drizzle-orm";
import { db } from "../db";
import {
  billingCheckouts,
  billingEvents,
  billingProfiles,
  companies,
  companySubscriptions,
  companyTrials,
  users,
  type BillingCheckout,
  type Company,
  type CompanySubscription,
  type CompanyTrial,
  type User,
} from "@shared/schema";
import {
  priceWithVat,
  type BillingTerm,
  type PaidPlan,
} from "@shared/billing-plans";
import type { BillingDetailsPatch } from "@shared/billing-details";
import { storage } from "../storage";
import {
  buildConsumerPayload,
  missingRequiredFields,
  resolveBillingDetails,
} from "./billing-customer";
import {
  StreamPayError,
  createConsumer,
  createPaymentLink,
  getInvoice,
  getPaymentLink,
  getSubscription,
  listConsumerInvoices,
  listConsumerSubscriptions,
  planForSubscription,
  resolvePlanProducts,
  searchConsumers,
  setSubscriptionCoupons,
  updateConsumer,
  type StreamPaySubscription,
} from "./streampay";
import { getCompanyTrial, isTrialActive, trialDaysLeft } from "./trials";

/** Statuses under which the company has the paid plan right now. */
const LIVE_STATUSES = new Set(["active", "trialing"]);

export function isLiveSubscription(sub: Pick<CompanySubscription, "status"> | null | undefined): boolean {
  return !!sub && LIVE_STATUSES.has(sub.status);
}

/** Thrown for problems the payer can act on; the route turns it into a 4xx. */
export class BillingError extends Error {
  constructor(message: string, public status: number, public code: string, public extra?: Record<string, unknown>) {
    super(message);
    this.name = "BillingError";
  }
}

// ---------------------------------------------------------------------------
// Details (prefill + auto-save)
// ---------------------------------------------------------------------------

async function loadContext(companyId: string, userId: string) {
  const [user, company, companyProfile, [billing]] = await Promise.all([
    storage.getUser(userId),
    storage.getCompany(companyId),
    storage.getCompanyProfile(companyId),
    db.select().from(billingProfiles).where(eq(billingProfiles.companyId, companyId)).limit(1),
  ]);
  if (!user || !company) throw new BillingError("Company not found", 404, "NOT_FOUND");
  return { user, company, companyProfile, billing };
}

export async function getBillingDetails(companyId: string, userId: string) {
  const { user, company, companyProfile, billing } = await loadContext(companyId, userId);
  return resolveBillingDetails(user, company, companyProfile, billing);
}

/**
 * One auto-save from the checkout form. Only the keys present in the patch
 * are written. The typed phone is also copied to the user's own profile when
 * that is empty — it's their number, and they'd otherwise be asked again
 * elsewhere. Company CR/VAT are deliberately not touched (see 0014).
 */
export async function saveBillingDetails(companyId: string, userId: string, patch: BillingDetailsPatch) {
  const { checkoutId, ...fields } = patch;
  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) set[k] = v;
  }

  if (Object.keys(set).length > 0) {
    await db
      .insert(billingProfiles)
      .values({ companyId, updatedByUserId: userId, ...set })
      .onConflictDoUpdate({
        target: billingProfiles.companyId,
        set: { ...set, updatedByUserId: userId, updatedAt: new Date() },
      });
  }

  if (fields.billingPhone) {
    const user = await storage.getUser(userId);
    if (user && !user.phoneNumber) {
      await storage.updateUser(userId, { phoneNumber: fields.billingPhone });
    }
  }

  if (checkoutId) {
    await db
      .update(billingCheckouts)
      .set({ lastActivityAt: new Date() })
      .where(and(eq(billingCheckouts.id, checkoutId), eq(billingCheckouts.companyId, companyId)));
  }

  return getBillingDetails(companyId, userId);
}

// ---------------------------------------------------------------------------
// StreamPay customer
// ---------------------------------------------------------------------------

/**
 * The company's StreamPay consumer id, creating the consumer on first use and
 * refreshing it on every later checkout (so a VAT number typed today reaches
 * today's invoice). A consumer that already exists for this email/phone —
 * e.g. created by hand in the dashboard — is adopted instead of failing.
 */
export async function ensureStreamPayConsumer(company: Company, user: User, details: ReturnType<typeof resolveBillingDetails>): Promise<string> {
  const payload = buildConsumerPayload(details, company, user.language);

  if (company.streampayConsumerId) {
    try {
      await updateConsumer(company.streampayConsumerId, payload);
      return company.streampayConsumerId;
    } catch (err) {
      // Deleted in the dashboard → fall through and create a fresh one.
      if (!(err instanceof StreamPayError && err.status === 404)) {
        // A refresh failing (e.g. the new phone belongs to another consumer)
        // shouldn't block paying with the record we already have.
        console.warn(`[Billing] consumer refresh failed for company ${company.id}; using existing record`, err);
        return company.streampayConsumerId;
      }
    }
  }

  let consumerId: string;
  try {
    consumerId = (await createConsumer(payload)).id;
  } catch (err) {
    if (!(err instanceof StreamPayError && err.code === "DUPLICATE_CONSUMER")) throw err;
    const term = payload.email || payload.phone_number || payload.name;
    const found = (await searchConsumers(term)).data.filter((c) => !c.is_deleted);
    const match = found.find((c) => c.external_metadata?.bid_company_id === company.id || c.external_id === company.id)
      ?? (found.length === 1 ? found[0] : undefined)
      ?? found.find((c) => c.email && payload.email && c.email.toLowerCase() === payload.email.toLowerCase());
    if (!match) throw err;
    console.log(`[Billing] adopting existing StreamPay consumer ${match.id} for company ${company.id}`);
    consumerId = match.id;
  }

  await db.update(companies).set({ streampayConsumerId: consumerId }).where(eq(companies.id, company.id));
  return consumerId;
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export async function getCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const [row] = await db.select().from(companySubscriptions).where(eq(companySubscriptions.companyId, companyId)).limit(1);
  return row ?? null;
}

export async function getCheckout(checkoutId: string, companyId: string): Promise<BillingCheckout | null> {
  const [row] = await db
    .select()
    .from(billingCheckouts)
    .where(and(eq(billingCheckouts.id, checkoutId), eq(billingCheckouts.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

/**
 * The checkout the payer is on. Their most recent unfinished attempt from the
 * last 30 days is reused — including one the follow-up email already went out
 * for, which keeps followup_sent_at and so never earns a second email.
 */
export async function openCheckout(companyId: string, userId: string, plan: PaidPlan, term: BillingTerm): Promise<BillingCheckout> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [existing] = await db
    .select()
    .from(billingCheckouts)
    .where(and(
      eq(billingCheckouts.companyId, companyId),
      eq(billingCheckouts.userId, userId),
      ne(billingCheckouts.status, "paid"),
      gte(billingCheckouts.createdAt, since),
    ))
    .orderBy(desc(billingCheckouts.createdAt))
    .limit(1);

  if (existing) {
    const [row] = await db
      .update(billingCheckouts)
      .set({ plan, term, status: "draft", lastActivityAt: new Date() })
      .where(eq(billingCheckouts.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db.insert(billingCheckouts).values({ companyId, userId, plan, term }).returning();
  return row;
}

/**
 * Where StreamPay sends the payer back to. A fixed allowlist of Bid pages, never
 * a path from the request, so this can't be turned into an open redirect.
 */
export const RETURN_PAGES = { settings: "/settings?tab=billing", upgrade: "/upgrade" } as const;
export type ReturnPage = keyof typeof RETURN_PAGES;

/**
 * Turns a checkout into a StreamPay payment link and returns its URL.
 * `returnBase` is the origin the payer comes back to (bidapp.sa in production).
 */
// Promo codes. "Tested" gives 30 days of the plan free. The trial runs inside Bid
// (company_trials, server/lib/trials.ts): no card, no StreamPay page, nothing
// charged. StreamPay's own checkout always shows the full recurring price, which
// read as a charge even with its "trial period" note, so a trial never goes there.
// Near the end Bid asks for payment; paying during the trial keeps the days left.
const PROMO_CODES: Record<string, { trialDays: number }> = {
  tested: { trialDays: 30 },
};

// Earlier versions started the trial at StreamPay (trial_period_days on the
// payment link), one of them with a 100% coupon on the link as well.
// Subscriptions created then may still carry that coupon, which must NEVER stay on
// (StreamPay coupons have no duration, so it would discount every renewal):
// stripTrialCoupon removes it on every sync and the daily cron sweeps for stragglers.
export const TRIAL_COUPON_NAME = "Bid trial: first period free";

/**
 * Takes the trial coupon off a subscription. StreamPay applies the change at the
 * end of the current period, which for a trial is exactly when the first real
 * charge happens. Verified from StreamPay's own answer: throws unless the
 * pending change really leaves the trial coupon out.
 */
export async function stripTrialCoupon(s: StreamPaySubscription): Promise<boolean> {
  const applied = s.coupon_calculation_metadata?.coupons ?? [];
  const trial = applied.find((c) => c.name === TRIAL_COUPON_NAME);
  if (!trial) return false;
  const target = s.pending_change?.target_subscription_coupon_ids;
  if (target && !target.includes(trial.coupon_id)) return false; // removal already scheduled

  const items = (s.items ?? []).map((i) => ({ product_id: i.product_id, quantity: i.quantity ?? 1 }));
  const keep = applied.filter((c) => c.coupon_id !== trial.coupon_id).map((c) => c.coupon_id);
  const updated = await setSubscriptionCoupons(s.id, items, keep);
  const after = updated.pending_change?.target_subscription_coupon_ids;
  if (!after || after.includes(trial.coupon_id)) {
    throw new Error(`trial coupon removal on subscription ${s.id} was not scheduled (pending_change=${JSON.stringify(updated.pending_change ?? null)})`);
  }
  const effective = updated.pending_change?.effective_at;
  // The promo is one month. If StreamPay will keep discounting well past that, a free period is being given away.
  if (effective && s.created_at && Date.parse(effective) - Date.parse(s.created_at) > 35 * 24 * 60 * 60 * 1000) {
    console.error(`[Billing][ALERT] subscription ${s.id}: trial coupon stays until ${effective}, more than a month after signup`);
  }
  console.log(`[Billing] removed trial coupon from subscription ${s.id}; effective ${effective}`);
  return true;
}

export function normalizePromoCode(raw: string | undefined | null): string | null {
  const code = (raw ?? "").trim().toLowerCase();
  return code ? code : null;
}

/** Throws a BillingError unless this company may use the code (once, new customers only). */
export async function assertPromoUsable(companyId: string, code: string): Promise<{ trialDays: number }> {
  const promo = PROMO_CODES[code];
  if (!promo) throw new BillingError("That code isn't valid.", 422, "PROMO_INVALID");
  const [used] = await db
    .select({ id: billingCheckouts.id })
    .from(billingCheckouts)
    .where(and(eq(billingCheckouts.companyId, companyId), eq(billingCheckouts.status, "paid")))
    .limit(1);
  if (used) throw new BillingError("This code can only be used once, on a first plan.", 422, "PROMO_USED");
  if (await getCompanyTrial(companyId)) {
    throw new BillingError("This code can only be used once, on a first plan.", 422, "PROMO_USED");
  }
  return promo;
}

/**
 * Starts a free trial from a promo code: the company gets the checkout's plan
 * for the promo's days. Nothing is created at StreamPay and no card is asked for.
 * The checkout is closed as "trial" so the unfinished-checkout email skips it.
 */
export async function startTrial(checkout: BillingCheckout, userId: string, promoCode: string, now = new Date()): Promise<CompanyTrial> {
  const current = await getCompanySubscription(checkout.companyId);
  if (isLiveSubscription(current)) {
    throw new BillingError("This workspace already has an active plan.", 409, "ALREADY_SUBSCRIBED");
  }
  const promo = await assertPromoUsable(checkout.companyId, promoCode);
  let trial: CompanyTrial | undefined;
  try {
    // The trial and the closed checkout land together or not at all.
    trial = await db.transaction(async (tx) => {
      const [row] = await tx.insert(companyTrials).values({
        companyId: checkout.companyId,
        plan: checkout.plan,
        promoCode,
        startedBy: userId,
        startsAt: now,
        endsAt: new Date(now.getTime() + promo.trialDays * 24 * 60 * 60 * 1000),
        createdAt: now,
      }).returning();
      await tx
        .update(billingCheckouts)
        .set({ status: "trial", promoCode, completedAt: now, lastActivityAt: now, failureReason: null })
        .where(eq(billingCheckouts.id, checkout.id));
      return row;
    });
  } catch (err) {
    // Two clicks at once: the unique index lets only one trial in.
    if ((err as { code?: string })?.code === "23505") {
      throw new BillingError("This code can only be used once, on a first plan.", 422, "PROMO_USED");
    }
    throw err;
  }
  console.log(`[Billing] company ${checkout.companyId} started a ${promo.trialDays}-day ${checkout.plan} trial (code ${promoCode})`);
  return trial!;
}

export async function startPayment(
  checkout: BillingCheckout,
  userId: string,
  returnBase: string,
  returnTo: ReturnPage = "settings",
): Promise<{ url: string }> {
  const current = await getCompanySubscription(checkout.companyId);
  if (isLiveSubscription(current)) {
    throw new BillingError("This workspace already has an active plan.", 409, "ALREADY_SUBSCRIBED");
  }

  const { user, company, companyProfile, billing } = await loadContext(checkout.companyId, userId);
  const details = resolveBillingDetails(user, company, companyProfile, billing);
  const missing = missingRequiredFields(details);
  if (missing.length > 0) {
    throw new BillingError("Some billing details are missing.", 422, "DETAILS_MISSING", { missing });
  }

  // Paying during a free trial: the subscription starts with the days still left,
  // so the first charge lands when the trial would have ended.
  const trial = await getCompanyTrial(checkout.companyId);
  const trialDays = isTrialActive(trial) ? trialDaysLeft(trial!) : 0;

  const plan = checkout.plan as PaidPlan;
  const term = checkout.term as BillingTerm;
  const [consumerId, products] = await Promise.all([
    ensureStreamPayConsumer(company, user, details),
    resolvePlanProducts(),
  ]);
  const product = products[`${plan}:${term}`];

  const page = RETURN_PAGES[returnTo];
  const back = `${returnBase}${page}${page.includes("?") ? "&" : "?"}checkout=${encodeURIComponent(checkout.id)}`;
  const planName = plan === "pro" ? "Pro" : "Business";
  const link = await createPaymentLink({
    name: `Bid ${planName} (${term === "yearly" ? "yearly" : "monthly"})`,
    description: company.name,
    items: [{ product_id: product.id, quantity: 1 }],
    currency: "SAR",
    max_number_of_payments: 1,
    valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    organization_consumer_id: consumerId,
    contact_information_type: "EMAIL",
    success_redirect_url: back,
    failure_redirect_url: back,
    custom_metadata: { companyId: company.id, checkoutId: checkout.id, plan, term },
    ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
  });

  await db
    .update(billingCheckouts)
    .set({ status: "redirected", paymentLinkId: link.id, lastActivityAt: new Date(), failureReason: null })
    .where(eq(billingCheckouts.id, checkout.id));

  // StreamPay picks the checkout language from a query param on the link.
  const url = new URL(link.url);
  url.searchParams.set("language", user.language === "ar" ? "ar" : "en");
  return { url: url.toString() };
}

// ---------------------------------------------------------------------------
// Sync — the only writer of company_subscriptions
// ---------------------------------------------------------------------------

function pickCurrentSubscription(subs: StreamPaySubscription[]): StreamPaySubscription | null {
  if (subs.length === 0) return null;
  const byNewest = [...subs].sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
  return (
    byNewest.find((s) => s.status === "ACTIVE" || s.status === "TRIALING")
    ?? byNewest.find((s) => s.status === "FROZEN")
    ?? byNewest[0]
  );
}

/**
 * StreamPay allows one customer per email/phone, so a person who runs several
 * workspaces has one StreamPay customer behind all of them. These helpers keep
 * each workspace's plan, invoices and webhooks separate in that case.
 */
async function consumerIsShared(company: Pick<Company, "id" | "streampayConsumerId">): Promise<boolean> {
  if (!company.streampayConsumerId) return false;
  const [other] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.streampayConsumerId, company.streampayConsumerId), ne(companies.id, company.id)))
    .limit(1);
  return !!other;
}

async function paymentLinkIdsOf(companyId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: billingCheckouts.paymentLinkId })
    .from(billingCheckouts)
    .where(eq(billingCheckouts.companyId, companyId));
  return new Set(rows.flatMap((r) => (r.id ? [r.id] : [])));
}

/**
 * Which of a shared customer's subscriptions belong to this workspace: the one
 * already recorded for it, or an unclaimed one that was bought through one of
 * its own payment links. Anything another workspace has claimed is never ours.
 */
async function subscriptionsOwnedBy(company: Company, subs: StreamPaySubscription[]): Promise<StreamPaySubscription[]> {
  if (subs.length === 0) return subs;
  const ids = subs.map((s) => s.id);
  const claimed = await db
    .select({ companyId: companySubscriptions.companyId, subId: companySubscriptions.streampaySubscriptionId })
    .from(companySubscriptions)
    .where(inArray(companySubscriptions.streampaySubscriptionId, ids));
  const mine = new Set(claimed.filter((c) => c.companyId === company.id).map((c) => c.subId));
  const taken = new Set(claimed.filter((c) => c.companyId !== company.id).map((c) => c.subId));

  const unclaimed = subs.filter((s) => !mine.has(s.id) && !taken.has(s.id));
  let viaLink = new Set<string>();
  if (unclaimed.length > 0 && company.streampayConsumerId) {
    const [links, { data: invoices }] = await Promise.all([
      paymentLinkIdsOf(company.id),
      listConsumerInvoices(company.streampayConsumerId),
    ]);
    const mineInvoices = (invoices ?? []).filter((i) => i.payment_link_id && links.has(i.payment_link_id));
    // StreamPay does not always put subscription_id on the invoice row (a trial's
    // first invoice comes without it), so also match the subscription's own latest invoice.
    const mineInvoiceIds = new Set(mineInvoices.map((i) => i.id));
    viaLink = new Set([
      ...mineInvoices.flatMap((i) => (i.subscription_id ? [i.subscription_id] : [])),
      ...unclaimed.filter((s) => s.latest_invoice_id && mineInvoiceIds.has(s.latest_invoice_id)).map((s) => s.id),
    ]);
  }
  return subs.filter((s) => mine.has(s.id) || viaLink.has(s.id));
}

/** Invoices of a shared customer that belong to this workspace (all of them when not shared). */
export async function invoicesOwnedBy<T extends { id: string; subscription_id?: string | null; payment_link_id?: string | null }>(
  company: Company,
  invoices: T[],
): Promise<T[]> {
  if (!(await consumerIsShared(company))) return invoices;
  const [links, sub] = await Promise.all([paymentLinkIdsOf(company.id), getCompanySubscription(company.id)]);
  return invoices.filter((i) =>
    (i.payment_link_id && links.has(i.payment_link_id))
    || (i.subscription_id && sub?.streampaySubscriptionId === i.subscription_id));
}

export async function syncCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.streampayConsumerId) return getCompanySubscription(companyId);

  const [{ data: subs }, products] = await Promise.all([
    listConsumerSubscriptions(company.streampayConsumerId),
    resolvePlanProducts(),
  ]);
  // Only subscriptions to Bid plan products count; the merchant account sells other things too.
  let ours = (subs ?? []).filter((s) => planForSubscription(s, products));
  // Safety: the trial coupon must never outlive the signup. A failure is loud
  // but not fatal here; the next webhook, return visit or the daily sweep retries.
  for (const s of ours) {
    try {
      await stripTrialCoupon(s);
    } catch (err) {
      console.error(`[Billing][ALERT] could not remove trial coupon from subscription ${s.id}; retrying on next sync`, err);
    }
  }
  // One StreamPay customer can serve several workspaces (same payer email/phone);
  // then each workspace only counts the subscriptions that are its own.
  if (await consumerIsShared(company)) ours = await subscriptionsOwnedBy(company, ours);
  const current = pickCurrentSubscription(ours);

  if (!current) {
    // Nothing in StreamPay. Keep an existing row only if StreamPay says nothing
    // at all — never invent or delete a plan on an empty/partial answer.
    return getCompanySubscription(companyId);
  }

  const mapped = planForSubscription(current, products)!;
  const values = {
    plan: mapped.plan,
    term: mapped.term,
    status: current.status.toLowerCase(),
    streampaySubscriptionId: current.id,
    currentPeriodEnd: current.current_period_end ? new Date(current.current_period_end) : null,
    cancelAtPeriodEnd: !!current.cancel_at_period_end,
    updatedAt: new Date(),
  };
  const [row] = await db
    .insert(companySubscriptions)
    .values({ companyId, ...values })
    .onConflictDoUpdate({ target: companySubscriptions.companyId, set: values })
    .returning();

  if (isLiveSubscription(row)) {
    // Every open attempt for this company is now settled.
    await db
      .update(billingCheckouts)
      .set({ status: "paid", completedAt: new Date() })
      .where(and(
        eq(billingCheckouts.companyId, companyId),
        eq(billingCheckouts.plan, row.plan),
        eq(billingCheckouts.term, row.term),
        // A declined card can be retried on StreamPay's page and then succeed,
        // so a 'failed' (or already-chased) attempt can still end up paid.
        inArray(billingCheckouts.status, ["redirected", "failed", "abandoned"]),
      ));
  }
  return row;
}

/**
 * Called when the payer lands back on Bid. `hint` is StreamPay's redirect
 * query — used only to record a decline reason, never to grant anything.
 */
export async function confirmCheckout(
  checkout: BillingCheckout,
  hint: { status?: string; message?: string },
): Promise<{ checkout: BillingCheckout; subscription: CompanySubscription | null }> {
  const subscription = await syncCompanySubscription(checkout.companyId);

  if (checkout.status !== "paid" && !isLiveSubscription(subscription)) {
    const declined = hint.status === "failed" || hint.status === "failed_internal_error";
    if (declined) {
      // Double-check with StreamPay: a link that completed was not a decline.
      let completed = false;
      if (checkout.paymentLinkId) {
        try {
          completed = (await getPaymentLink(checkout.paymentLinkId)).status === "COMPLETED";
        } catch (err) {
          console.warn("[Billing] could not read payment link on failed return", err);
        }
      }
      if (!completed) {
        await db
          .update(billingCheckouts)
          .set({ status: "failed", failureReason: (hint.message || "FAILED").slice(0, 200), lastActivityAt: new Date() })
          .where(eq(billingCheckouts.id, checkout.id));
      }
    } else {
      await db.update(billingCheckouts).set({ lastActivityAt: new Date() }).where(eq(billingCheckouts.id, checkout.id));
    }
  }

  const fresh = (await getCheckout(checkout.id, checkout.companyId))!;
  return { checkout: fresh, subscription };
}

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------

export interface StreamPayWebhook {
  event_type: string;
  entity_type?: string;
  entity_id: string;
  status?: string;
  data?: {
    invoice?: { id?: string };
    payment?: { id?: string };
    payment_link?: { id?: string };
    subscription?: { id?: string };
    metadata?: Record<string, unknown>;
  } & Record<string, unknown>;
}

async function companyIdsForConsumer(consumerId: string | null | undefined): Promise<string[]> {
  if (!consumerId) return [];
  const rows = await db.select({ id: companies.id }).from(companies).where(eq(companies.streampayConsumerId, consumerId));
  return rows.map((r) => r.id);
}

/**
 * Which Bid company a webhook is about. Asked of StreamPay rather than read
 * from the body, so a replayed or tampered body can at most trigger a
 * harmless re-sync.
 */
async function resolveWebhookCompany(event: StreamPayWebhook): Promise<{ companyIds: string[]; checkoutId: string | null }> {
  const meta = event.data?.metadata ?? {};
  const checkoutId = typeof meta.checkoutId === "string" ? meta.checkoutId : null;
  const entity = (event.entity_type ?? "").toUpperCase();

  let consumerId: string | null | undefined;
  try {
    if (entity === "SUBSCRIPTION") {
      consumerId = (await getSubscription(event.entity_id)).organization_consumer_id;
    } else if (entity === "INVOICE") {
      consumerId = (await getInvoice(event.entity_id)).organization_consumer_id;
    } else if (entity === "PAYMENT" && event.data?.invoice?.id) {
      consumerId = (await getInvoice(event.data.invoice.id)).organization_consumer_id;
    } else if (entity === "PAYMENT_LINK" || event.data?.payment_link?.id) {
      const link = await getPaymentLink(event.data?.payment_link?.id ?? event.entity_id);
      consumerId = link.organization_consumer_id;
    }
  } catch (err) {
    console.warn(`[Billing] webhook ${event.event_type}: could not look up ${entity} ${event.entity_id}`, err);
  }

  let companyIds = await companyIdsForConsumer(consumerId);
  if (companyIds.length > 1 && typeof meta.companyId === "string" && companyIds.includes(meta.companyId)) {
    // A shared customer: the payment link's own metadata says which workspace this is.
    companyIds = [meta.companyId];
  } else if (companyIds.length === 0 && typeof meta.companyId === "string") {
    // Metadata is only trusted if StreamPay confirms that company's own consumer.
    const company = await storage.getCompany(meta.companyId);
    if (company?.streampayConsumerId && company.streampayConsumerId === consumerId) companyIds = [company.id];
  }
  // Still several (e.g. a renewal, which carries no metadata): sync them all.
  // Sync only keeps the subscriptions each workspace owns, so this is safe.
  return { companyIds, checkoutId };
}

export async function handleWebhookEvent(event: StreamPayWebhook, signatureTs: string): Promise<"duplicate" | "processed" | "ignored"> {
  const [seen] = await db
    .select({ id: billingEvents.id })
    .from(billingEvents)
    .where(and(
      eq(billingEvents.eventType, event.event_type),
      eq(billingEvents.entityId, event.entity_id),
      eq(billingEvents.signatureTs, signatureTs),
    ))
    .limit(1);
  if (seen) return "duplicate";

  const { companyIds, checkoutId } = await resolveWebhookCompany(event);
  const companyId = companyIds.length === 1 ? companyIds[0] : null;

  for (const id of companyIds) await syncCompanySubscription(id);
  if (companyIds.length > 0) {
    if (companyId && checkoutId && event.event_type === "PAYMENT_LINK_PAY_ATTEMPT_FAILED") {
      await db
        .update(billingCheckouts)
        .set({ status: "failed", failureReason: String(event.status ?? "PAY_ATTEMPT_FAILED").slice(0, 200), lastActivityAt: new Date() })
        .where(and(
          eq(billingCheckouts.id, checkoutId),
          eq(billingCheckouts.companyId, companyId),
          inArray(billingCheckouts.status, ["draft", "redirected"]),
        ));
    }
  } else {
    console.warn(`[Billing] webhook ${event.event_type} ${event.entity_type} ${event.entity_id}: no matching Bid company`);
  }

  // Recorded after processing: if processing throws, StreamPay retries and the
  // retry is not mistaken for a duplicate. Sync is idempotent, so a rare
  // double-process is harmless.
  await db
    .insert(billingEvents)
    .values({
      eventType: event.event_type,
      entityType: event.entity_type ?? null,
      entityId: event.entity_id,
      signatureTs,
      companyId,
      payload: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing();

  return companyIds.length > 0 ? "processed" : "ignored";
}

// ---------------------------------------------------------------------------
// Summary for the settings tab
// ---------------------------------------------------------------------------

export async function getBillingSummary(companyId: string, userId: string) {
  const [subscription, details, [openCheckoutRow], trial] = await Promise.all([
    getCompanySubscription(companyId),
    getBillingDetails(companyId, userId),
    db
      .select()
      .from(billingCheckouts)
      .where(and(eq(billingCheckouts.companyId, companyId), eq(billingCheckouts.userId, userId), ne(billingCheckouts.status, "paid")))
      .orderBy(desc(billingCheckouts.createdAt))
      .limit(1),
    // Fails soft (e.g. before migration 0020): the page just shows no trial.
    getCompanyTrial(companyId).catch((err) => {
      console.error("[Billing] trial lookup failed:", (err as Error)?.message);
      return null;
    }),
  ]);
  return {
    subscription: subscription && {
      plan: subscription.plan as PaidPlan,
      term: subscription.term as BillingTerm,
      status: subscription.status,
      live: isLiveSubscription(subscription),
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    trial: trial && {
      plan: trial.plan as PaidPlan,
      startsAt: trial.startsAt,
      endsAt: trial.endsAt,
      active: isTrialActive(trial),
      daysLeft: trialDaysLeft(trial),
    },
    details,
    openCheckout: openCheckoutRow
      ? { id: openCheckoutRow.id, plan: openCheckoutRow.plan, term: openCheckoutRow.term, status: openCheckoutRow.status }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Follow-up on unfinished checkouts
// ---------------------------------------------------------------------------

export const FOLLOWUP_AFTER_MS = 3 * 60 * 60 * 1000;        // quiet for 3 hours
const FOLLOWUP_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;       // never chase a 2-week-old attempt
const FOLLOWUP_COMPANY_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // at most one per company per 2 weeks

export interface FollowupCandidate {
  checkout: BillingCheckout;
  user: Pick<User, "id" | "email" | "name" | "language">;
  companyName: string;
}

/**
 * Sends at most one "you didn't finish upgrading" email per stale checkout.
 * Each row is claimed with a conditional UPDATE before sending, so two runs
 * overlapping can never both email the same person.
 */
/**
 * Daily safety net for the trial coupon: re-checks every trialing workspace and
 * removes the coupon if an earlier attempt failed. `failed` > 0 means money is at
 * risk (a renewal could be discounted) and the cron reports an error.
 */
export async function sweepTrialCoupons(): Promise<{ checked: number; removed: number; failed: number }> {
  const rows = await db
    .select({ companyId: companySubscriptions.companyId })
    .from(companySubscriptions)
    .where(inArray(companySubscriptions.status, ["trialing", "trial_pending"]));
  let removed = 0;
  let failed = 0;
  for (const { companyId } of rows) {
    const company = await storage.getCompany(companyId);
    if (!company?.streampayConsumerId) continue;
    try {
      const { data } = await listConsumerSubscriptions(company.streampayConsumerId);
      for (const s of data ?? []) if (await stripTrialCoupon(s)) removed++;
    } catch (err) {
      failed++;
      console.error(`[Billing][ALERT] trial coupon sweep failed for company ${companyId}`, err);
    }
  }
  return { checked: rows.length, removed, failed };
}

export async function runCheckoutFollowups(
  send: (c: FollowupCandidate) => Promise<boolean>,
  now = new Date(),
): Promise<{ considered: number; sent: number; skipped: number }> {
  const rows = await db
    .select({ checkout: billingCheckouts, user: users, companyName: companies.name })
    .from(billingCheckouts)
    .innerJoin(users, eq(users.id, billingCheckouts.userId))
    .innerJoin(companies, eq(companies.id, billingCheckouts.companyId))
    .where(and(
      inArray(billingCheckouts.status, ["draft", "redirected", "failed"]),
      isNull(billingCheckouts.followupSentAt),
      lt(billingCheckouts.lastActivityAt, new Date(now.getTime() - FOLLOWUP_AFTER_MS)),
      gte(billingCheckouts.createdAt, new Date(now.getTime() - FOLLOWUP_MAX_AGE_MS)),
      isNull(companies.deletedAt),
    ))
    .orderBy(billingCheckouts.lastActivityAt)
    .limit(50);

  let sent = 0;
  let skipped = 0;
  for (const { checkout, user, companyName } of rows) {
    const markAbandonedQuietly = () =>
      db.update(billingCheckouts)
        .set({ status: "abandoned" })
        .where(and(eq(billingCheckouts.id, checkout.id), isNull(billingCheckouts.followupSentAt)));

    // Paid since (maybe by a teammate), or no longer in the company → nothing to chase.
    const [sub, role] = await Promise.all([
      getCompanySubscription(checkout.companyId),
      storage.getUserRoleInCompany(user.id, checkout.companyId),
    ]);
    if (isLiveSubscription(sub) || !role) {
      await markAbandonedQuietly();
      skipped++;
      continue;
    }

    const [recent] = await db
      .select({ id: billingCheckouts.id })
      .from(billingCheckouts)
      .where(and(
        eq(billingCheckouts.companyId, checkout.companyId),
        gte(billingCheckouts.followupSentAt, new Date(now.getTime() - FOLLOWUP_COMPANY_COOLDOWN_MS)),
      ))
      .limit(1);
    const allowed = await storage.filterRecipientsByPreference([{ userId: user.id }], checkout.companyId, "billing", "email");
    if (recent || allowed.length === 0) {
      await markAbandonedQuietly();
      skipped++;
      continue;
    }

    const [claimed] = await db
      .update(billingCheckouts)
      .set({ status: "abandoned", followupSentAt: now })
      .where(and(eq(billingCheckouts.id, checkout.id), isNull(billingCheckouts.followupSentAt)))
      .returning();
    if (!claimed) continue;

    const ok = await send({ checkout, user, companyName }).catch((err) => {
      console.error(`[Billing] follow-up email failed for checkout ${checkout.id}`, err);
      return false;
    });
    if (ok) {
      sent++;
    } else {
      // Not sent (e.g. no Postmark token): release the claim so a later run can try.
      await db
        .update(billingCheckouts)
        .set({ status: checkout.status, followupSentAt: null })
        .where(eq(billingCheckouts.id, checkout.id));
      skipped++;
    }
  }
  return { considered: rows.length, sent, skipped };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function listCheckoutsForAdmin(limit = 200) {
  const rows = await db
    .select({
      id: billingCheckouts.id,
      plan: billingCheckouts.plan,
      term: billingCheckouts.term,
      status: billingCheckouts.status,
      failureReason: billingCheckouts.failureReason,
      lastActivityAt: billingCheckouts.lastActivityAt,
      followupSentAt: billingCheckouts.followupSentAt,
      createdAt: billingCheckouts.createdAt,
      companyId: companies.id,
      companyName: companies.name,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phoneNumber,
      billingPhone: billingProfiles.billingPhone,
      billingEmail: billingProfiles.billingEmail,
    })
    .from(billingCheckouts)
    .innerJoin(companies, eq(companies.id, billingCheckouts.companyId))
    .innerJoin(users, eq(users.id, billingCheckouts.userId))
    .leftJoin(billingProfiles, eq(billingProfiles.companyId, billingCheckouts.companyId))
    .orderBy(desc(billingCheckouts.lastActivityAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r,
    phone: r.billingPhone ?? r.userPhone,
    email: r.billingEmail ?? r.userEmail,
    total: priceWithVat(r.plan as PaidPlan, r.term as BillingTerm).total,
  }));
}
