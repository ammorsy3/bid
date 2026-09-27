// Unit tests for the StreamPay billing pieces. No database, no network:
// signature checks, phone/VAT/CR rules, prefill, prices, and the webhook route
// with the billing module mocked out.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

vi.mock("../server/lib/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/billing")>();
  return { ...actual, handleWebhookEvent: vi.fn(async () => "processed") };
});

import { handleWebhookEvent } from "../server/lib/billing";
import { registerBillingWebhook } from "../server/routes/billing";
import { planForSubscription, productPlanKey, signWebhookBody, verifyWebhookSignature } from "../server/lib/streampay";
import { buildConsumerPayload, resolveBillingDetails, missingRequiredFields } from "../server/lib/billing-customer";
import { billingDetailsPatchSchema, isValidCr, isValidSaudiVat, normalizeSaudiPhone } from "../shared/billing-details";
import { monthlyRate, parseProductExternalId, periodPrice, priceWithVat, productExternalId } from "../shared/billing-plans";

const SECRET = "whsec_test_123";

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ event_type: "PAYMENT_SUCCEEDED", entity_id: "p1" });

  it("accepts what StreamPay would send", () => {
    const header = signWebhookBody(body, SECRET, 1700000000);
    expect(verifyWebhookSignature(Buffer.from(body), header, SECRET)).toEqual({ timestamp: "1700000000" });
  });

  it("matches the documented algorithm: hex HMAC-SHA256 of `${t}.${body}`", async () => {
    const crypto = await import("crypto");
    const sig = crypto.createHmac("sha256", SECRET).update(`42.${body}`).digest("hex");
    expect(verifyWebhookSignature(body, `t=42,v1=${sig}`, SECRET)).not.toBeNull();
  });

  it("rejects a tampered body", () => {
    const header = signWebhookBody(body, SECRET);
    expect(verifyWebhookSignature(body.replace("p1", "p2"), header, SECRET)).toBeNull();
  });

  it("rejects the wrong secret", () => {
    expect(verifyWebhookSignature(body, signWebhookBody(body, "other"), SECRET)).toBeNull();
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyWebhookSignature(body, undefined, SECRET)).toBeNull();
    expect(verifyWebhookSignature(body, "", SECRET)).toBeNull();
    expect(verifyWebhookSignature(body, "v1=abc", SECRET)).toBeNull();
    expect(verifyWebhookSignature(body, "t=1", SECRET)).toBeNull();
    expect(verifyWebhookSignature(body, "t=1,v1=not-hex!", SECRET)).toBeNull();
    expect(verifyWebhookSignature(body, "t=1,v1=abcd", SECRET)).toBeNull(); // wrong length
  });
});

describe("normalizeSaudiPhone", () => {
  const ok: [string, string][] = [
    ["0501234567", "+966501234567"],
    ["501234567", "+966501234567"],
    ["966501234567", "+966501234567"],
    ["+966501234567", "+966501234567"],
    ["00966 50 123 4567", "+966501234567"],
    ["+966-50-123-4567", "+966501234567"],
    ["(050) 123 4567", "+966501234567"],
    ["٠٥٠١٢٣٤٥٦٧", "+966501234567"], // typed on an Arabic keyboard
    ["+971501234567", "+971501234567"], // non-Saudi, already international
  ];
  for (const [input, expected] of ok) {
    it(`${input} → ${expected}`, () => expect(normalizeSaudiPhone(input)).toBe(expected));
  }

  it("rejects landlines, short numbers and junk", () => {
    for (const bad of ["0112345678", "12345", "abc", "", null, undefined, "05012345678"]) {
      expect(normalizeSaudiPhone(bad as any)).toBeNull();
    }
  });
});

describe("VAT and CR rules", () => {
  it("Saudi VAT is 15 digits starting and ending with 3", () => {
    expect(isValidSaudiVat("300000000000003")).toBe(true);
    expect(isValidSaudiVat("310123456700003")).toBe(true);
    expect(isValidSaudiVat("300000000000001")).toBe(false);
    expect(isValidSaudiVat("30000000000003")).toBe(false);
    expect(isValidSaudiVat("")).toBe(false);
  });

  it("CR is 10 digits", () => {
    expect(isValidCr("1010123456")).toBe(true);
    expect(isValidCr("101012345")).toBe(false);
  });
});

describe("billingDetailsPatchSchema (auto-save)", () => {
  it("normalises a phone and strips spaces from VAT", () => {
    const r = billingDetailsPatchSchema.parse({ billingPhone: "050 123 4567", vatNumber: "300 000 000 000 003" });
    expect(r.billingPhone).toBe("+966501234567");
    expect(r.vatNumber).toBe("300000000000003");
  });

  it("treats an empty string as clearing the field", () => {
    expect(billingDetailsPatchSchema.parse({ city: "" }).city).toBeNull();
  });

  it("refuses invalid values with an i18n-able reason", () => {
    const r = billingDetailsPatchSchema.safeParse({ vatNumber: "123" });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].message).toBe("invalidVat");
    expect(billingDetailsPatchSchema.safeParse({ billingEmail: "nope" }).success).toBe(false);
    expect(billingDetailsPatchSchema.safeParse({ billingPhone: "12" }).success).toBe(false);
  });

  it("leaves absent keys absent, so a partial save never wipes other fields", () => {
    const r = billingDetailsPatchSchema.parse({ city: "Riyadh" });
    expect("vatNumber" in r && r.vatNumber !== undefined).toBe(false);
  });
});

describe("resolveBillingDetails — prefill", () => {
  const user = { name: "Sara Ali", email: "sara@acme.sa", phoneNumber: "0501234567", language: "ar" };
  const company = {
    id: "c1", name: "Acme", legalName: "Acme Trading Co.", accountType: "company",
    crNumber: "1010123456", vatNumber: "300000000000003", city: "Riyadh",
  };

  it("fills everything from the app for a complete company: nothing to ask", () => {
    const d = resolveBillingDetails(user as any, company as any);
    expect(d.values).toEqual({
      billingName: "Acme Trading Co.",
      billingEmail: "sara@acme.sa",
      billingPhone: "+966501234567",
      vatNumber: "300000000000003",
      crNumber: "1010123456",
      address: null,
      city: "Riyadh",
    });
    expect(d.missing).toEqual(["address"]); // the one thing Bid never stores
    expect(d.sources.billingName).toBe("company");
    expect(d.sources.billingEmail).toBe("account");
  });

  it("what the payer typed at checkout wins over app data", () => {
    const d = resolveBillingDetails(user as any, company as any, null, {
      billingName: "Acme Holding", billingEmail: null, billingPhone: null, vatNumber: null, crNumber: null, address: null, city: null,
    });
    expect(d.values.billingName).toBe("Acme Holding");
    expect(d.sources.billingName).toBe("billing");
  });

  it("asks only for what's missing, and never offers an invalid stored VAT", () => {
    const d = resolveBillingDetails(
      { ...user, phoneNumber: null } as any,
      { ...company, legalName: null, vatNumber: "N/A", city: null } as any,
      { whatsappNumber: null } as any,
    );
    expect(d.values.billingName).toBe("Acme"); // falls back to the workspace name
    expect(d.missing).toEqual(["billingPhone", "vatNumber", "address", "city"]);
    expect(missingRequiredFields(d)).toEqual([]);
  });

  it("uses the company WhatsApp when the user has no phone", () => {
    const d = resolveBillingDetails({ ...user, phoneNumber: null } as any, company as any, { whatsappNumber: "+966 55 000 1111" } as any);
    expect(d.values.billingPhone).toBe("+966550001111");
    expect(d.sources.billingPhone).toBe("company");
  });

  it("an individual is billed under their own name, and isn't asked for CR/VAT", () => {
    const d = resolveBillingDetails(user as any, { ...company, accountType: "individual", crNumber: null, vatNumber: null } as any);
    expect(d.values.billingName).toBe("Sara Ali");
    expect(d.applicable).toEqual(["billingName", "billingEmail", "billingPhone"]);
    expect(d.values.vatNumber).toBeNull();
    expect(d.missing).toEqual([]);
  });
});

describe("buildConsumerPayload", () => {
  it("company with an address → BUSINESS consumer carrying address, VAT and CR", () => {
    const d = resolveBillingDetails(
      { name: "Sara", email: "sara@acme.sa", phoneNumber: "0501234567", language: "ar" } as any,
      { id: "c1", name: "Acme", legalName: "Acme Co.", accountType: "company", crNumber: "1010123456", vatNumber: "300000000000003", city: "Riyadh" } as any,
      null,
      { billingName: null, billingEmail: null, billingPhone: null, vatNumber: null, crNumber: null, address: "1234 King Fahd Rd, Al Olaya", city: null },
    );
    expect(buildConsumerPayload(d, { id: "c1", accountType: "company" } as any, "ar")).toEqual({
      name: "Acme Co.",
      email: "sara@acme.sa",
      phone_number: "+966501234567",
      external_metadata: { bid_company_id: "c1" },
      preferred_language: "AR",
      consumer_type: "BUSINESS",
      communication_methods: ["EMAIL"],
      address: { address_line_1: "1234 King Fahd Rd, Al Olaya", city: "Riyadh", country: "SA" },
      vat_number: "300000000000003",
      commercial_registration: "1010123456",
    });
  });

  it("company without an address → billed under its name as INDIVIDUAL (StreamPay requires an address for BUSINESS)", () => {
    const d = resolveBillingDetails(
      { name: "Sara", email: "sara@acme.sa", phoneNumber: null, language: "en" } as any,
      { id: "c1", name: "Acme", legalName: "Acme Co.", accountType: "company", crNumber: "1010123456", vatNumber: "300000000000003", city: "Riyadh" } as any,
    );
    const p = buildConsumerPayload(d, { id: "c1", accountType: "company" } as any, "en");
    expect(p.consumer_type).toBe("INDIVIDUAL");
    expect(p.name).toBe("Acme Co.");
    expect(p.address).toBeUndefined();
    expect(p.vat_number).toBeUndefined();
  });

  it("team without phone or tax ids → INDIVIDUAL, no empty fields sent", () => {
    const d = resolveBillingDetails(
      { name: "Omar", email: "omar@x.com", phoneNumber: null, language: "en" } as any,
      { id: "t1", name: "Omar's team", legalName: null, accountType: "team", crNumber: null, vatNumber: null, city: null } as any,
    );
    const p = buildConsumerPayload(d, { id: "t1", accountType: "team" } as any, "en");
    expect(p).toEqual({
      name: "Omar",
      email: "omar@x.com",
      external_metadata: { bid_company_id: "t1" },
      preferred_language: "EN",
      consumer_type: "INDIVIDUAL",
      communication_methods: ["EMAIL"],
    });
  });
});

describe("plan prices", () => {
  it("match the pricing page: 79/179 monthly, 756/1716 yearly, before VAT", () => {
    expect(periodPrice("pro", "monthly")).toBe(79);
    expect(periodPrice("business", "monthly")).toBe(179);
    expect(monthlyRate("pro", "yearly")).toBe(63);
    expect(periodPrice("pro", "yearly")).toBe(756);
    expect(periodPrice("business", "yearly")).toBe(1716);
  });

  it("adds 15% VAT the same way StreamPay does", () => {
    expect(priceWithVat("pro", "monthly")).toEqual({ subtotal: 79, vat: 11.85, total: 90.85 });
    expect(priceWithVat("business", "yearly")).toEqual({ subtotal: 1716, vat: 257.4, total: 1973.4 });
  });
});

describe("plan ↔ StreamPay product mapping", () => {
  it("round-trips the plan key", () => {
    expect(parseProductExternalId(productExternalId("business", "yearly"))).toEqual({ plan: "business", term: "yearly" });
    expect(parseProductExternalId("website-dev")).toBeNull();
  });

  it("reads the key from external_metadata, falling back to external_id", () => {
    expect(productPlanKey({ external_metadata: { bid_plan_key: "bid-pro-monthly" }, external_id: null })).toBe("bid-pro-monthly");
    expect(productPlanKey({ external_metadata: null, external_id: "bid-pro-yearly" })).toBe("bid-pro-yearly");
  });

  it("maps a subscription to its plan, ignoring unrelated products", () => {
    expect(planForSubscription({
      id: "s1", status: "ACTIVE",
      items: [{ product_id: "x", product: { id: "x", name: "Pro", type: "RECURRING", external_metadata: { bid_plan_key: "bid-pro-monthly" } } }],
    })).toEqual({ plan: "pro", term: "monthly" });
    expect(planForSubscription({
      id: "s2", status: "ACTIVE",
      items: [{ product_id: "y", product: { id: "y", name: "Website", type: "ONE_OFF" } }],
    })).toBeNull();
  });

  it("falls back to the product id when the nested product isn't expanded", () => {
    const products: any = { "business:monthly": { id: "prod-b-m" } };
    expect(planForSubscription({ id: "s3", status: "ACTIVE", items: [{ product_id: "prod-b-m" }] }, products))
      .toEqual({ plan: "business", term: "monthly" });
  });
});

describe("POST /api/billing/streampay/webhook", () => {
  const app = express();
  registerBillingWebhook(app);
  app.use(express.json()); // mounted after, exactly like server/app.ts

  const event = { event_type: "SUBSCRIPTION_ACTIVATED", entity_type: "SUBSCRIPTION", entity_id: "sub_1", data: {} };
  const raw = JSON.stringify(event);

  beforeEach(() => {
    process.env.STREAMPAY_WEBHOOK_SECRET = SECRET;
    vi.mocked(handleWebhookEvent).mockClear();
  });
  afterEach(() => {
    delete process.env.STREAMPAY_WEBHOOK_SECRET;
  });

  it("processes a correctly signed event", async () => {
    const res = await request(app)
      .post("/api/billing/streampay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Webhook-Signature", signWebhookBody(raw, SECRET, 1700000001))
      .send(raw);
    expect(res.status).toBe(200);
    expect(handleWebhookEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(handleWebhookEvent).mock.calls[0]).toEqual([event, "1700000001"]);
  });

  it("rejects a bad signature without touching anything", async () => {
    const res = await request(app)
      .post("/api/billing/streampay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Webhook-Signature", signWebhookBody(raw, "wrong-secret"))
      .send(raw);
    expect(res.status).toBe(401);
    expect(handleWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects an unsigned request", async () => {
    const res = await request(app).post("/api/billing/streampay/webhook").set("Content-Type", "application/json").send(raw);
    expect(res.status).toBe(401);
  });

  it("verifies the exact bytes, even when JSON re-serialisation would differ", async () => {
    const spaced = '{ "event_type" : "SUBSCRIPTION_ACTIVATED", "entity_type": "SUBSCRIPTION", "entity_id": "sub_1" }';
    const res = await request(app)
      .post("/api/billing/streampay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Webhook-Signature", signWebhookBody(spaced, SECRET))
      .send(spaced);
    expect(res.status).toBe(200);
  });

  it("answers 503 (so StreamPay retries) when the secret isn't configured", async () => {
    delete process.env.STREAMPAY_WEBHOOK_SECRET;
    const res = await request(app)
      .post("/api/billing/streampay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Webhook-Signature", signWebhookBody(raw, SECRET))
      .send(raw);
    expect(res.status).toBe(503);
  });

  it("answers 500 when processing fails, so StreamPay retries later", async () => {
    vi.mocked(handleWebhookEvent).mockRejectedValueOnce(new Error("db down"));
    const res = await request(app)
      .post("/api/billing/streampay/webhook")
      .set("Content-Type", "application/json")
      .set("X-Webhook-Signature", signWebhookBody(raw, SECRET))
      .send(raw);
    expect(res.status).toBe(500);
  });
});
