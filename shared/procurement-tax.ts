// Procurement-offer VAT (proposal §8, decision P4 with Amendment A3). Separate
// from subscription billing on purpose: it does NOT import shared/billing-plans.ts.
// Phase 1: one uniform treatment per offer, declared by the vendor; prices are
// entered excluding VAT. A declaration is not tax verification.
export const PROCUREMENT_TAX_POLICY = "KSA_STANDARD_15" as const;
export const PROCUREMENT_VAT_RATE_BP = 1500; // 15%

export interface TaxDeclaration {
  /** tax.applyVat: standard VAT on every item. */
  applyVat: boolean;
  /** tax.hasMixedTreatment: some items differ — a draft may be saved, final submission is blocked. */
  mixedTreatment: boolean;
}

export const rateBpFor = (d: TaxDeclaration): number => (d.applyVat ? PROCUREMENT_VAT_RATE_BP : 0);
