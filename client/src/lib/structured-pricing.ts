// Structured RFQ pricing (itemized requests and offers) is always on: there is
// no environment switch any more. The hook stays so callers keep one place to ask.
export function useStructuredPricing(): boolean {
  return true;
}
