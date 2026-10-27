// Offering selection rules and the save decision (BID-OFFERING-CLASSIFICATION):
// validation against the catalogue, the registration-completion invariant,
// requester-only activation, optimistic concurrency and idempotent retries.
// planSave is the exact function the store runs inside its transaction.

import { describe, it, expect, vi } from "vitest";
import catalogueJson from "../shared/offering-catalogue/catalogue.json";
import {
  hasEffectiveOffering, indexCatalogue, rollup, saveOfferingsSchema, selectionKey, validateSelection, type OfferingSelection,
} from "../shared/offering-catalogue/selection";
import type { OfferingCatalogue } from "../shared/offering-catalogue/types";

vi.mock("../server/db", () => ({ db: {} }));
import { OfferingError, planSave } from "../server/lib/offering-store";

const idx = indexCatalogue(catalogueJson as unknown as OfferingCatalogue);
const G_ITEMS = "BID-D01-F01-G01"; // Business Strategy & Planning: I01, I02
const G_WHOLE = "BID-D01-F01-G03"; // Market entry advisory (no listed items)
const G_OTHER = "BID-D01-F02-G01"; // Market Research & Feasibility: I01, I02
const sel = (...groups: OfferingSelection["groups"]): OfferingSelection => ({ groups });
const codes = (s: OfferingSelection, held?: OfferingSelection, c = idx) => {
  const r = validateSelection(s, c, held);
  return r.ok ? [] : r.errors.map((e) => e.code);
};

describe("validateSelection", () => {
  it("accepts listed items inside their group and explicit group declarations", () => {
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I02`], declared: false }, { groupId: G_WHOLE, itemIds: [], declared: true }))).toEqual([]);
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`], declared: true }))).toEqual([]); // items + "not listed"
  });

  it("rejects invalid IDs and cross-group combinations", () => {
    expect(codes(sel({ groupId: "BID-D99-F01-G01", itemIds: [], declared: true }))).toEqual(["UNKNOWN_GROUP"]);
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I09`], declared: false }))).toEqual(["UNKNOWN_ITEM"]);
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [`${G_OTHER}-I01`], declared: false }))).toEqual(["ITEM_NOT_IN_GROUP"]);
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`, `${G_ITEMS}-I01`], declared: false }))).toEqual(["DUPLICATE_ITEM"]);
    expect(codes(sel({ groupId: G_WHOLE, itemIds: [], declared: true }, { groupId: G_WHOLE, itemIds: [], declared: true }))).toEqual(["DUPLICATE_GROUP"]);
  });

  it("a group entry with nothing ticked and no declaration is not an offering and is refused", () => {
    expect(codes(sel({ groupId: G_ITEMS, itemIds: [], declared: false }))).toEqual(["EMPTY_GROUP"]);
  });

  it("deprecated records can be kept by an organization that holds them, never newly chosen", () => {
    const c = structuredClone(catalogueJson) as unknown as OfferingCatalogue;
    c.items.find((i) => i.id === `${G_ITEMS}-I02`)!.status = "deprecated";
    c.groups.find((g) => g.id === G_WHOLE)!.status = "deprecated";
    const dIdx = indexCatalogue(c);
    const s = sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I02`], declared: false }, { groupId: G_WHOLE, itemIds: [], declared: true });
    expect(codes(s, undefined, dIdx).sort()).toEqual(["INACTIVE_GROUP", "INACTIVE_ITEM"]);
    expect(codes(s, s, dIdx)).toEqual([]);
  });

  it("selecting a sector or specialization is not representable as an offering", () => {
    const parse = (groupId: string) => saveOfferingsSchema.safeParse({ expectedRevision: 0, groups: [{ groupId, itemIds: [], declared: true }] }).success;
    expect(parse("BID-D01")).toBe(false);
    expect(parse("BID-D01-F01")).toBe(false);
    expect(parse(G_WHOLE)).toBe(true);
  });

  it("the request schema refuses unknown keys (status, company, role) and oversized payloads", () => {
    expect(saveOfferingsSchema.safeParse({ expectedRevision: 0, groups: [], status: "registered" }).success).toBe(false);
    expect(saveOfferingsSchema.safeParse({ expectedRevision: 0, groups: [], companyId: "x" }).success).toBe(false);
    expect(saveOfferingsSchema.safeParse({ expectedRevision: 0, groups: [{ groupId: G_WHOLE, itemIds: [], declared: true, all: true }] }).success).toBe(false);
    const many = Array.from({ length: 801 }, () => ({ groupId: G_WHOLE, itemIds: [], declared: true }));
    expect(saveOfferingsSchema.safeParse({ expectedRevision: 0, groups: many }).success).toBe(false);
    expect(saveOfferingsSchema.safeParse({ expectedRevision: -1, groups: [] }).success).toBe(false);
  });

  it("effective offering, roll-ups and canonical keys", () => {
    expect(hasEffectiveOffering(sel())).toBe(false);
    expect(hasEffectiveOffering(sel({ groupId: G_WHOLE, itemIds: [], declared: true }))).toBe(true);
    const s = sel({ groupId: G_OTHER, itemIds: [`${G_OTHER}-I01`], declared: false }, { groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I02`, `${G_ITEMS}-I01`], declared: true });
    const r = rollup(s, idx);
    expect([r.groups, r.items, r.declarations]).toEqual([2, 3, 1]);
    expect(r.bySector.get("BID-D01")).toBe(2);
    expect(r.bySpecialization.get("BID-D01-F01")).toBe(1);
    expect(selectionKey(s)).toBe(selectionKey({ groups: [...s.groups].reverse().map((g) => ({ ...g, itemIds: [...g.itemIds].reverse() })) }));
  });
});

describe("planSave — the completion invariant and concurrency", () => {
  const one = sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`], declared: false });
  const two = sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`, `${G_ITEMS}-I02`], declared: false });
  const plan = (status: any, revision: number, held: OfferingSelection, selection: OfferingSelection, extra: { expectedRevision?: number; activateVendor?: boolean } = {}) =>
    planSave({ status, revision }, held, { expectedRevision: extra.expectedRevision ?? revision, selection, activateVendor: extra.activateVendor }, idx);
  const fails = (fn: () => unknown) => {
    try { fn(); } catch (e) { if (e instanceof OfferingError) return [e.status, e.code, e.extra]; throw e; }
    return null;
  };

  it("an empty classification cannot complete registration (pending, legacy)", () => {
    expect(fails(() => plan("pending", 0, sel(), sel()))?.slice(0, 2)).toEqual([422, "OFFERINGS_REQUIRED"]);
    expect(fails(() => plan("legacy_unclassified", 0, sel(), sel()))?.slice(0, 2)).toEqual([422, "OFFERINGS_REQUIRED"]);
  });

  it("a pending or legacy organization becomes writable to 'registered' with one effective offering", () => {
    const p = plan("pending", 0, sel(), one);
    expect(p).toMatchObject({ kind: "write", addItems: [[`${G_ITEMS}-I01`, G_ITEMS]], removeItems: [], addDecl: [], removeDecl: [] });
    expect(plan("legacy_unclassified", 0, sel(), sel({ groupId: G_WHOLE, itemIds: [], declared: true }))).toMatchObject({ kind: "write", addDecl: [G_WHOLE] });
  });

  it("a registered vendor cannot remove its last effective offering (prior state kept)", () => {
    expect(fails(() => plan("registered", 3, one, sel()))?.slice(0, 2)).toEqual([422, "LAST_OFFERING_REQUIRED"]);
  });

  it("a requester-only company must explicitly activate vendor capabilities", () => {
    expect(fails(() => plan("requester_only", 1, sel(), one))?.slice(0, 2)).toEqual([409, "VENDOR_NOT_ACTIVE"]);
    expect(plan("requester_only", 1, sel(), one, { activateVendor: true })).toMatchObject({ kind: "write" });
  });

  it("a stale revision is a conflict and the response carries no selections", () => {
    const r = fails(() => plan("registered", 5, one, two, { expectedRevision: 4 }));
    expect(r).toEqual([409, "OFFERINGS_CONFLICT", { currentRevision: 5 }]);
  });

  it("a retried save that already committed is answered without writing (idempotent)", () => {
    expect(plan("registered", 5, two, two, { expectedRevision: 4 })).toEqual({ kind: "noop" });
    expect(plan("registered", 5, two, two)).toEqual({ kind: "noop" });
  });

  it("removing a group removes its effective offerings; kept rows are not rewritten", () => {
    const held = sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`], declared: true }, { groupId: G_WHOLE, itemIds: [], declared: true });
    const p = plan("registered", 2, held, sel({ groupId: G_ITEMS, itemIds: [`${G_ITEMS}-I01`, `${G_ITEMS}-I02`], declared: false }));
    expect(p).toMatchObject({ kind: "write", addItems: [[`${G_ITEMS}-I02`, G_ITEMS]], removeItems: [], removeDecl: [G_ITEMS, G_WHOLE].sort(), addDecl: [] });
  });

  it("invalid selections are refused with codes only (no IDs reach error reporting)", () => {
    const r = fails(() => plan("pending", 0, sel(), sel({ groupId: G_ITEMS, itemIds: [`${G_OTHER}-I01`], declared: false })));
    expect(r).toEqual([422, "INVALID_SELECTION", { errorCodes: ["ITEM_NOT_IN_GROUP"] }]);
    expect(JSON.stringify(r)).not.toContain("BID-");
  });
});
