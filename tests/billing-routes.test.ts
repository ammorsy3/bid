// Subscription management routes: cancel, resume, invoices, and the checkout
// return-page allowlist. StreamPay and the database are faked; the real route
// code and its permission checks run.

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const m = vi.hoisted(() => ({
  sub: null as any,
  company: { id: "c1", streampayConsumerId: "cons1" } as any,
  invoices: [] as any[],
  checkout: { id: "k1", status: "draft", plan: "pro", term: "monthly" } as any,
  calls: [] as string[],
  startPayment: vi.fn(async (..._a: unknown[]) => ({ url: "https://streampay.sa/s/X" })),
}));

vi.mock("../server/db", () => ({ db: {} }));
vi.mock("../server/storage", () => ({ storage: { getCompany: vi.fn(async () => m.company) } }));
vi.mock("../server/lib/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/billing")>();
  return {
    ...actual,
    getCompanySubscription: vi.fn(async () => m.sub),
    syncCompanySubscription: vi.fn(async () => { m.calls.push("sync"); return m.sub; }),
    getBillingSummary: vi.fn(async () => ({ subscription: m.sub, details: {}, openCheckout: null })),
    getCheckout: vi.fn(async () => m.checkout),
    startPayment: m.startPayment,
  };
});
vi.mock("../server/lib/streampay", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../server/lib/streampay")>();
  return {
    ...actual,
    cancelSubscription: vi.fn(async (id: string) => { m.calls.push(`cancel:${id}`); return {}; }),
    uncancelSubscription: vi.fn(async (id: string) => { m.calls.push(`uncancel:${id}`); return {}; }),
    listConsumerInvoices: vi.fn(async () => ({ data: m.invoices })),
    createPortalSession: vi.fn(async () => ({ id: "p", url: "https://billing.streampay.sa/x" })),
  };
});

import { registerBillingRoutes } from "../server/routes/billing";
import { RETURN_PAGES } from "../server/lib/billing";

const authenticate: express.RequestHandler = (req, _res, next) => {
  (req as any).auth = { userId: "u1", activeCompanyId: "c1", roleInCompany: req.header("x-role") ?? "owner", isAdmin: false };
  next();
};
const passThrough: express.RequestHandler = (_q, _s, n) => n();
const requireRole = (min: string): express.RequestHandler => (req, res, next) => {
  const rank: Record<string, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };
  return rank[(req as any).auth.roleInCompany] >= rank[min] ? next() : res.status(403).json({ message: "requires role" });
};

const app = express();
app.use(express.json());
registerBillingRoutes(app, {
  authenticateToken: authenticate,
  requireCompanyContext: passThrough,
  requireCompanyRole: requireRole as any,
  requireAdmin: passThrough,
});

const liveSub = (over: Record<string, unknown> = {}) => ({
  plan: "pro", term: "monthly", status: "active", streampaySubscriptionId: "sub1", cancelAtPeriodEnd: false, ...over,
});

beforeEach(() => {
  m.sub = liveSub();
  m.company = { id: "c1", streampayConsumerId: "cons1" };
  m.invoices = [];
  m.calls.length = 0;
  m.startPayment.mockClear();
});

describe("POST /api/billing/subscription/cancel", () => {
  it("schedules cancellation at StreamPay, then re-reads the truth", async () => {
    const res = await request(app).post("/api/billing/subscription/cancel");
    expect(res.status).toBe(200);
    expect(m.calls).toEqual(["cancel:sub1", "sync"]);
  });

  it("refuses when there is no live plan, without calling StreamPay", async () => {
    m.sub = liveSub({ status: "canceled" });
    const res = await request(app).post("/api/billing/subscription/cancel");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NO_ACTIVE_PLAN");
    expect(m.calls).toEqual([]);
    m.sub = null;
    expect((await request(app).post("/api/billing/subscription/cancel")).status).toBe(409);
  });

  it("is for owners and admins only", async () => {
    const res = await request(app).post("/api/billing/subscription/cancel").set("x-role", "member");
    expect(res.status).toBe(403);
    expect(m.calls).toEqual([]);
  });
});

describe("POST /api/billing/subscription/resume", () => {
  it("withdraws a scheduled cancellation at StreamPay, then re-reads", async () => {
    m.sub = liveSub({ cancelAtPeriodEnd: true });
    const res = await request(app).post("/api/billing/subscription/resume");
    expect(res.status).toBe(200);
    expect(m.calls).toEqual(["uncancel:sub1", "sync"]);
  });

  it("members can't, and a plan that already ended can't be resumed", async () => {
    expect((await request(app).post("/api/billing/subscription/resume").set("x-role", "member")).status).toBe(403);
    m.sub = liveSub({ status: "expired" });
    expect((await request(app).post("/api/billing/subscription/resume")).status).toBe(409);
  });
});

describe("GET /api/billing/invoices", () => {
  it("shows what was owed, mapped, and hides drafts and cancelled invoices", async () => {
    m.invoices = [
      { id: "i1", invoice_number: 7, status: "COMPLETED", total_amount: "90.850", total_vat_amount: "11.850", currency: "SAR", period_start: "2026-09-28", period_end: "2026-10-28", created_at: "2026-09-28T20:34:09", url: "https://pay/i1" },
      { id: "i2", status: "DRAFT" },
      { id: "i3", status: "CANCELED" },
      { id: "i4", status: "SENT", total_amount: "90.850" },
    ];
    const res = await request(app).get("/api/billing/invoices");
    expect(res.status).toBe(200);
    expect(res.body.map((i: any) => [i.id, i.status])).toEqual([["i1", "paid"], ["i4", "open"]]);
    expect(res.body[0]).toMatchObject({ number: 7, total: "90.850", vat: "11.850", currency: "SAR", url: "https://pay/i1" });
  });

  it("is empty for a workspace that never started paying", async () => {
    m.company = { id: "c1", streampayConsumerId: null };
    const res = await request(app).get("/api/billing/invoices");
    expect(res.body).toEqual([]);
  });

  it("is for owners and admins only", async () => {
    expect((await request(app).get("/api/billing/invoices").set("x-role", "member")).status).toBe(403);
  });
});

describe("POST /api/billing/checkouts/:id/pay — where the payer returns to", () => {
  it("defaults to Settings and accepts only the known pages", async () => {
    expect((await request(app).post("/api/billing/checkouts/k1/pay").send({})).status).toBe(200);
    expect(m.startPayment.mock.calls[0][3]).toBe("settings");

    expect((await request(app).post("/api/billing/checkouts/k1/pay").send({ returnTo: "upgrade" })).status).toBe(200);
    expect(m.startPayment.mock.calls[1][3]).toBe("upgrade");
  });

  it("rejects any other value, so the return URL can't be pointed elsewhere", async () => {
    for (const evil of ["https://evil.example/", "//evil.example", "/admin", "../x", "settings?x=1"]) {
      const res = await request(app).post("/api/billing/checkouts/k1/pay").send({ returnTo: evil });
      expect(res.status, evil).toBe(400);
    }
    expect(m.startPayment).not.toHaveBeenCalled();
  });

  it("the allowlist is fixed same-origin paths", () => {
    expect(RETURN_PAGES).toEqual({ settings: "/settings?tab=billing", upgrade: "/upgrade" });
    for (const p of Object.values(RETURN_PAGES)) expect(p.startsWith("/") && !p.startsWith("//")).toBe(true);
  });
});
