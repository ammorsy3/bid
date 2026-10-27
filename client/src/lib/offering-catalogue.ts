// The offering catalogue on the client: loaded once, on demand, as its own
// code-split chunk (content-hashed by the build, so the browser caches it until
// the catalogue changes). Non-sensitive — no organization data is in it.

import { useQuery } from "@tanstack/react-query";
import { indexCatalogue, type CatalogueIndex } from "@shared/offering-catalogue/selection";
import { createCatalogueSearch, type CatalogueSearch } from "@shared/offering-catalogue/search";
import type { OfferingCatalogue } from "@shared/offering-catalogue/types";

export interface LoadedCatalogue {
  idx: CatalogueIndex;
  search: CatalogueSearch;
}

let pending: Promise<LoadedCatalogue> | null = null;

export function loadOfferingCatalogue(): Promise<LoadedCatalogue> {
  if (!pending) {
    pending = import("@shared/offering-catalogue/catalogue.json")
      .then((m) => {
        const idx = indexCatalogue((m.default ?? m) as unknown as OfferingCatalogue);
        return { idx, search: createCatalogueSearch(idx) };
      })
      .catch((e) => {
        pending = null; // a later retry loads it again
        throw e;
      });
  }
  return pending;
}

export function useOfferingCatalogue() {
  return useQuery({
    queryKey: ["offering-catalogue"],
    queryFn: loadOfferingCatalogue,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

export const offeringsQueryKey = (companyId: string) => ["offerings", companyId] as const;

export function label(rec: { en: string; ar: string }, language: string): string {
  return language === "ar" ? rec.ar : rec.en;
}
