// RFQ-B1: exact BigInt money, quantity/price precision (P2, P6) and the Policy A
// totals (proposal §3–§4), including the proposal's worked example.
import { describe, it, expect } from "vitest";
import {
  parseBoqQuantity, parsePrice, lineTotal, sumLines, vatAmount, divRoundHalfUp, money, groupMoney,
  MAX_LINE, MAX_SUBTOTAL, TotalOutOfRangeError, moneyErrorMessage,
} from "../shared/boq-money";
import { priceOffer, serializeTotals, type RfqItemSpec, type ItemResponseInput } from "../shared/rfq-pricing";
import { PROCUREMENT_VAT_RATE_BP } from "../shared/procurement-tax";

const VAT = { applyVat: true, mixedTreatment: false };
const NO_VAT = { applyVat: false, mixedTreatment: false };

describe("parsing (API form is strict; never rounds)", () => {
  it.each([
    ["1", "1"], ["0.0001", "0.0001"], ["2.5000", "2.5"], ["1000000000", "1000000000"], ["007.10", "7.1"],
  ])("quantity %s → %s", (raw, text) => expect(parseBoqQuantity(raw)).toMatchObject({ ok: true, text }));
  it.each([
    ["", "empty"], ["0", "nonPositive"], ["0.0000", "nonPositive"], ["1.23456", "precision"], ["1000000000.0001", "range"],
    ["1e3", "invalid"], ["-1", "nonPositive"], ["1,000", "invalid"], ["١٢", "invalid"], [" 1", "invalid"], ["12345678901", "range"],
  ])("quantity %s → %s", (raw, error) => expect(parseBoqQuantity(raw)).toEqual({ ok: false, error }));
  it("lenient (typed) input accepts Arabic-Indic digits and the Arabic decimal mark", () => {
    expect(parseBoqQuantity("٢٫٥", true)).toMatchObject({ ok: true, text: "2.5" });
    expect(parsePrice(" ١٨٫٥٠ ", true)).toMatchObject({ ok: true, text: "18.50" });
  });
  it.each([["0", "0.00"], ["0.00", "0.00"], ["18.5", "18.50"], ["1000000000.00", "1000000000.00"]])("price %s → %s (0.00 is a price)", (raw, text) =>
    expect(parsePrice(raw)).toMatchObject({ ok: true, text }));
  it.each([["", "empty"], ["1.001", "precision"], ["1000000000.01", "range"], ["-0.01", "nonPositive"], ["1E2", "invalid"]])("price %s → %s", (raw, error) =>
    expect(parsePrice(raw)).toEqual({ ok: false, error }));
  it("non-strings are rejected (numbers would lose exactness)", () => {
    expect(parsePrice(18.5 as unknown)).toEqual({ ok: false, error: "invalid" });
    expect(parseBoqQuantity(null)).toEqual({ ok: false, error: "empty" });
  });
  it("error copy", () => {
    expect(moneyErrorMessage("quantity", "precision").key).toBe("validation.quantityPrecision");
    expect(moneyErrorMessage("price", "precision").key).toBe("validation.pricePrecision");
    expect(moneyErrorMessage("quantity", "nonPositive").key).toBe("boq.quantityInvalid");
    expect(moneyErrorMessage("price", "range")).toEqual({ key: "validation.valueOutOfRange", vars: { min: "0.00", max: "1,000,000,000.00" } });
  });
});

describe("arithmetic", () => {
  const q = (s: string) => (parseBoqQuantity(s) as { scaled: bigint }).scaled;
  const p = (s: string) => (parsePrice(s) as { scaled: bigint }).scaled;
  it("half-up at every boundary", () => {
    expect(divRoundHalfUp(5n, 10n)).toBe(1n);
    expect(divRoundHalfUp(4n, 10n)).toBe(0n);
    expect(money(lineTotal(q("0.0001"), p("50.00")))).toBe("0.01"); // 0.005 → 0.01
    expect(money(lineTotal(q("0.0001"), p("49.99")))).toBe("0.00"); // 0.004999 → 0.00
    expect(money(lineTotal(q("2.5"), p("0.01")))).toBe("0.03"); // 0.025 → 0.03
    expect(money(lineTotal(q("1.0005"), p("10.00")))).toBe("10.01"); // 10.005 → 10.01
  });
  it("caps: line at 100,000,000,000.00 and one halala over throws", () => {
    expect(lineTotal(q("100"), p("1000000000.00"))).toBe(MAX_LINE);
    expect(() => lineTotal(q("100.0001"), p("1000000000.00"))).toThrow(TotalOutOfRangeError);
    expect(() => lineTotal(q("1000000000"), p("1000000000.00"))).toThrow(TotalOutOfRangeError);
  });
  it("2,000 lines at the max line exceed the subtotal cap; exactly the cap is fine", () => {
    expect(sumLines([MAX_SUBTOTAL - 1n, 1n])).toBe(MAX_SUBTOTAL);
    expect(() => sumLines(Array(2000).fill(MAX_LINE))).toThrow(TotalOutOfRangeError);
  });
  it("VAT 15% rounds half-up; exceeds Number precision safely", () => {
    expect(money(vatAmount(p("0.10"), 1500))).toBe("0.02"); // 0.015
    expect(money(vatAmount(MAX_SUBTOTAL, 1500))).toBe("15000000000.00");
    expect(groupMoney(MAX_SUBTOTAL + vatAmount(MAX_SUBTOTAL, 1500))).toBe("115,000,000,000.00");
    expect(PROCUREMENT_VAT_RATE_BP).toBe(1500);
  });
});

const ITEMS: RfqItemSpec[] = [
  { id: "i1", name: "Cement", unit: "bag", quantity: "100" },
  { id: "i2", name: "Rebar", unit: "ton", quantity: "2.5" },
  { id: "i3", name: "Paint", unit: "L", quantity: "40" },
];
const alt = (over: Record<string, string> = {}) => ({ name: "Rebar grade 60", unit: "ton", quantity: "2.5", unitPrice: "2150.00", reason: "Faster delivery", ...over });
const WORKED: ItemResponseInput[] = [
  { itemId: "i1", state: "priced", unitPrice: "18.50" },
  { itemId: "i2", state: "priced", unitPrice: "2400.00", alternative: alt() },
  { itemId: "i3", state: "unavailable", alternative: { name: "Paint brand Y", unit: "L", quantity: "40", unitPrice: "32.25", reason: "Brand X discontinued" } },
];

describe("Policy A totals — the proposal's worked example", () => {
  const r = priceOffer(ITEMS, WORKED, VAT, { final: true });
  it("submitted total uses originals, and the replacement for the unavailable item", () => {
    expect(r.issues).toEqual([]);
    expect(r.complete).toBe(true);
    expect([money(r.subtotal!), money(r.vat!), money(r.total!)]).toEqual(["9140.00", "1371.00", "10511.00"]);
    expect(r.lines.map((l) => [l.itemId, money(l.countedLine), l.alternativeRole])).toEqual([["i1", "1850.00", null], ["i2", "6000.00", "optional"], ["i3", "1290.00", "replacement"]]);
  });
  it("the optional alternative is a separate scenario, never added to the original", () => {
    expect(serializeTotals(r).scenarios).toEqual([{ itemId: "i2", subtotal: "8515.00", vat: "1277.25", total: "9792.25", difference: "-718.75" }]);
  });
  it("an original-only total is not available when any original is unpriced", () => {
    expect(r.originalTotalComplete).toBe(false);
    expect(priceOffer(ITEMS.slice(0, 2), WORKED.slice(0, 2), VAT, { final: true }).originalTotalComplete).toBe(true);
  });
  it("without VAT the total equals the subtotal", () => {
    const n = priceOffer(ITEMS, WORKED, NO_VAT, { final: true });
    expect([money(n.vat!), money(n.total!)]).toEqual(["0.00", "9140.00"]);
  });
  it("0.00 is a priced original ('no charge')", () => {
    const z = priceOffer([ITEMS[0]], [{ itemId: "i1", state: "priced", unitPrice: "0.00" }], VAT, { final: true });
    expect([z.complete, money(z.total!)]).toEqual([true, "0.00"]);
  });
});

describe("membership and completeness (AC6, AC7)", () => {
  const codes = (responses: ItemResponseInput[], final = true, tax = VAT) => priceOffer(ITEMS, responses, tax, { final }).issues.map((i) => i.code + ("itemId" in i ? `:${i.itemId}` : ""));
  it("missing, duplicate and unknown/foreign item ids are rejected", () => {
    expect(codes(WORKED.slice(0, 2))).toEqual(["MISSING_RESPONSE:i3"]);
    expect(codes([...WORKED, WORKED[0]])).toEqual(["DUPLICATE_RESPONSE:i1"]);
    expect(codes([...WORKED, { itemId: "other-tender-item", state: "priced", unitPrice: "1.00" }])).toEqual(["UNKNOWN_ITEM:other-tender-item"]);
  });
  it("unavailable needs a complete replacement with a reason", () => {
    expect(codes([WORKED[0], WORKED[1], { itemId: "i3", state: "unavailable" }])).toEqual(["REPLACEMENT_REQUIRED:i3"]);
    expect(codes([WORKED[0], WORKED[1], { itemId: "i3", state: "unavailable", alternative: { name: "Y", unit: "L", quantity: "40", unitPrice: "1.00", reason: " " } }])).toEqual(["ALT_REASON_REQUIRED:i3"]);
    expect(codes([WORKED[0], WORKED[1], { itemId: "i3", state: "unavailable", alternative: { name: "", unit: "L", quantity: "40", unitPrice: "" , reason: "r" } }])).toEqual(["ALT_FIELD_REQUIRED:i3", "ALT_FIELD_REQUIRED:i3"]);
  });
  it("manipulated values: too many decimals, exponent, negative", () => {
    expect(codes([{ ...WORKED[0], unitPrice: "18.505" }, WORKED[1], WORKED[2]])).toEqual(["PRICE_INVALID:i1"]);
    expect(codes([{ ...WORKED[0], unitPrice: "1e2" }, WORKED[1], WORKED[2]])).toEqual(["PRICE_INVALID:i1"]);
    expect(codes([WORKED[0], { ...WORKED[1], alternative: alt({ quantity: "-1" }) }, WORKED[2]])).toEqual(["ALT_QUANTITY_INVALID:i2"]);
  });
  it("a draft may be incomplete; final submission may not", () => {
    const draft = priceOffer(ITEMS, [WORKED[0], { itemId: "i2", state: "priced", unitPrice: "" }], VAT, { final: false });
    expect([draft.issues, draft.complete, draft.completedCount, draft.total]).toEqual([[], false, 1, null]);
  });
  it("mixed tax treatment: draft OK, final blocked, no total presented (A3)", () => {
    expect(priceOffer(ITEMS, WORKED, { applyVat: true, mixedTreatment: true }, { final: false }).issues).toEqual([]);
    const f = priceOffer(ITEMS, WORKED, { applyVat: true, mixedTreatment: true }, { final: true });
    expect([f.issues.map((i) => i.code), f.complete, f.total]).toEqual([["TAX_TREATMENT_UNSUPPORTED"], false, null]);
  });
  it("a total over the cap is an issue, not a crash", () => {
    const big = Array.from({ length: 2 }, (_, i) => ({ id: `b${i}`, name: "x", unit: "u", quantity: "100" }));
    const r = priceOffer(big, big.map((b) => ({ itemId: b.id, state: "priced" as const, unitPrice: "1000000000.00" })), VAT, { final: true });
    expect(r.issues.map((i) => i.code)).toEqual(["TOTAL_OUT_OF_RANGE"]);
    expect(r.total).toBeNull();
  });
});
