// The vendor-offering catalogue the server validates against: the same
// generated file the client loads (shared/offering-catalogue/catalogue.json),
// bundled with the code — never fetched from Google Sheets at runtime.

import catalogueJson from "@shared/offering-catalogue/catalogue.json";
import { indexCatalogue, type CatalogueIndex } from "@shared/offering-catalogue/selection";
import type { OfferingCatalogue } from "@shared/offering-catalogue/types";

let cached: CatalogueIndex | null = null;

export function offeringCatalogue(): CatalogueIndex {
  if (!cached) cached = indexCatalogue(catalogueJson as unknown as OfferingCatalogue);
  return cached;
}
