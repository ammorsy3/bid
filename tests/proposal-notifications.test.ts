// PB-5 / PB-5-R1: the requester "new proposal" email policy shared by both
// submission paths, and its failure handling (never throws).
import { describe, it, expect, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({ offers: 1, sent: [] as any[], fail: new Set<string>() }));
vi.mock("../server/db", () => ({ db: {}, pool: { on: () => undefined } }));
vi.mock("../server/email", () => ({
  sendNewOfferNotification: async (n: any) => { if (m.fail.has("email")) throw new Error("smtp down"); m.sent.push(n); },
}));
vi.mock("../server/storage", () => ({
  storage: {
    getOffersByTender: async () => { if (m.fail.has("offers")) throw new Error("db down"); return Array(m.offers).fill({}); },
    getCompanyMembers: async () => [
      { roleInCompany: "owner", user: { id: "u1", email: "o@x.test", name: "Owner", language: "ar" } },
      { roleInCompany: "admin", user: { id: "u2", email: "a@x.test", name: "Admin", language: "en" } },
      { roleInCompany: "member", user: { id: "u3", email: "m@x.test", name: "Member", language: "en" } },
      { roleInCompany: "owner", user: { id: "u4", email: null, name: "No email", language: "en" } },
    ],
    filterRecipientsByPreference: async (r: any[], _c: string, kind: string, channel: string) => (kind === "new_proposal" && channel === "email" ? r.filter((x) => x.userId !== "u2") : []),
    getCompanyProfile: async () => { if (m.fail.has("profile")) throw new Error("profiles down"); return { displayName: "Vendor Display" }; },
  },
}));

import { notifyRequesterOfProposal } from "../server/lib/proposal-notifications";

const notice = () => ({ tender: { id: "t1", title: "Steel", companyId: "buyer" }, vendorCompanyId: "v1", vendorCompanyName: "Vendor Co", submittedAt: new Date("2026-10-25T10:00:00Z") });
beforeEach(() => { m.offers = 1; m.sent = []; m.fail = new Set(); });

describe("notifyRequesterOfProposal", () => {
  it("1st proposal: owners/admins with an email, filtered by the new_proposal email preference", async () => {
    expect(await notifyRequesterOfProposal(notice())).toBe("sent");
    expect(m.sent[0]).toMatchObject({ tenderId: "t1", tenderTitle: "Steel", vendorCompanyName: "Vendor Display", proposalCount: 1 });
    expect(m.sent[0].recipients.map((r: any) => r.userId)).toEqual(["u1"]);
  });
  it.each([[2, "skipped"], [4, "skipped"], [5, "sent"], [10, "sent"], [11, "skipped"]])("proposal #%i → %s", async (n, out) => {
    m.offers = n;
    expect(await notifyRequesterOfProposal(notice())).toBe(out);
  });
  it("a failing vendor-profile lookup still sends, with the company name", async () => {
    m.fail.add("profile");
    expect(await notifyRequesterOfProposal(notice())).toBe("sent");
    expect(m.sent[0].vendorCompanyName).toBe("Vendor Co");
  });
  it.each([["email"], ["offers"]])("a failing %s is reported, never thrown", async (f) => {
    m.fail.add(f);
    await expect(notifyRequesterOfProposal(notice())).resolves.toBe("failed");
  });
  it("a request without an owning company sends nothing", async () => {
    expect(await notifyRequesterOfProposal({ ...notice(), tender: { id: "t1", title: "x", companyId: null } })).toBe("skipped");
  });
});
