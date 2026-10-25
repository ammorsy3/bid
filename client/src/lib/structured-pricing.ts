// Whether structured RFQ pricing is switched on for this deployment
// (STRUCTURED_PRICING_ENABLED, read by GET /api/features). Off: the RFQ
// template and itemized pricing are not offered; existing itemized requests and
// offers still render read-only (rollback plan R0).
import { useQuery } from "@tanstack/react-query";

export interface PublicFeatures {
  structuredPricing: boolean;
}

export function useStructuredPricing(): boolean {
  const { data } = useQuery<PublicFeatures>({
    queryKey: ["/api/features"],
    queryFn: async () => {
      const res = await fetch("/api/features");
      if (!res.ok) return { structuredPricing: false };
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
  return data?.structuredPricing === true;
}
