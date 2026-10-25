// Feature flag for structured RFQ pricing (rollback plan, proposal §10).
// Off by default. When off, NEW itemized requests, drafts and submissions are
// refused; reads of existing itemized data and the published-item lock stay on.
export function isStructuredPricingEnabled(): boolean {
  return process.env.STRUCTURED_PRICING_ENABLED === "true";
}
