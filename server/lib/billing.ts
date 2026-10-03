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
  users,
  type BillingCheckout,
  type Company,
  type CompanySubscription,
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
  listConsumerSubscriptions,
  planForSubscription,
  resolvePlanProducts,
  searchConsumers,
  updateConsumer,
  type StreamPaySubscription,
} from "./streampay";

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

export async function syncCompanySubscription(companyId: string): Promise<CompanySubscription | null> {
  const company = await storage.getCompany(companyId);
  if (!company?.streampayConsumerId) return getCompanySubscription(companyId);

  const [{ data: subs }, products] = await Promise.all([
    listConsumerSubscriptions(company.streampayConsumerId),
    resolvePlanProducts(),
  ]);
  // Only subscriptions to Bid plan products count; the merchant account sells other things too.
  const ours = (subs ?? []).filter((s) => planForSubscription(s, products));
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

async function companyIdForConsumer(consumerId: string | null | undefined): Promise<string | null> {
  if (!consumerId) return null;
  const [row] = await db.select({ id: companies.id }).from(companies).where(eq(companies.streampayConsumerId, consumerId)).limit(1);
  return row?.id ?? null;
}

/**
 * Which Bid company a webhook is about. Asked of StreamPay rather than read
 * from the body, so a replayed or tampered body can at most trigger a
 * harmless re-sync.
 */
async function resolveWebhookCompany(event: StreamPayWebhook): Promise<{ companyId: string | null; checkoutId: string | null }> {
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

  let companyId = await companyIdForConsumer(consumerId);
  if (!companyId && typeof meta.companyId === "string") {
    // Metadata is only trusted if StreamPay confirms that company's own consumer.
    const company = await storage.getCompany(meta.companyId);
    if (company?.streampayConsumerId && company.streampayConsumerId === consumerId) companyId = company.id;
  }
  return { companyId, checkoutId };
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

  const { companyId, checkoutId } = await resolveWebhookCompany(event);

  if (companyId) {
    await syncCompanySubscription(companyId);
    if (checkoutId && event.event_type === "PAYMENT_LINK_PAY_ATTEMPT_FAILED") {
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

  return companyId ? "processed" : "ignored";
}

// ---------------------------------------------------------------------------
// Summary for the settings tab
// ---------------------------------------------------------------------------

export async function getBillingSummary(companyId: string, userId: string) {
  const [subscription, details, [openCheckoutRow]] = await Promise.all([
    getCompanySubscription(companyId),
    getBillingDetails(companyId, userId),
    db
      .select()
      .from(billingCheckouts)
      .where(and(eq(billingCheckouts.companyId, companyId), eq(billingCheckouts.userId, userId), ne(billingCheckouts.status, "paid")))
      .orderBy(desc(billingCheckouts.createdAt))
      .limit(1),
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
