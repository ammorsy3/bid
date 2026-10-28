// Vendor-offering catalogue (BID-OFFERING-CLASSIFICATION).
//
// Three classification levels: main sector → specialized sector → offering
// group. Listed items inside a group are offering DETAILS, not a fourth level.
// Every ID is stable: sector/specialization/group IDs come from the source
// sheet; item IDs are assigned once and kept in item-ids.json.

export const OFFERING_TYPES = ["Service", "Physical Product", "Digital Product", "Works", "Rental"] as const;
export type OfferingType = typeof OFFERING_TYPES[number];

/** active: selectable. deprecated: no longer in the source; kept so existing selections keep their meaning. */
export type RecordStatus = "active" | "deprecated";

export interface CatalogueSector {
  id: string;
  /** Label exactly as in the source sheet. */
  src: string;
  en: string;
  ar: string;
  status: RecordStatus;
}

export interface CatalogueSpecialization extends CatalogueSector {
  sectorId: string;
}

export interface CatalogueGroup extends CatalogueSector {
  specializationId: string;
  sectorId: string;
  type: OfferingType;
  /** "Includes (Examples)" exactly as in the source. Non-exhaustive by definition. */
  examples: string;
  /** Item IDs (active and deprecated) in source order. Empty: the group is declared as a whole. */
  items: string[];
}

export interface CatalogueItem {
  id: string;
  groupId: string;
  src: string;
  en: string;
  ar: string;
  status: RecordStatus;
  /** How the item came to exist. Every item in version 1 is one separable source example. */
  provenance: "source_example";
}

export interface CatalogueProvenance {
  sourceUrl: string;
  sourceRevisionId: string;
  sourceModifiedTime: string;
  retrievedAt: string;
  checksum: string;
}

export interface OfferingCatalogue {
  version: string;
  provenance: CatalogueProvenance;
  sectors: CatalogueSector[];
  specializations: CatalogueSpecialization[];
  groups: CatalogueGroup[];
  items: CatalogueItem[];
}

/** Persisted item-ID assignments. Never regenerated from positions. */
export interface ItemIdMap {
  note?: string;
  items: Record<string, { groupId: string; key: string; source: string }>;
}

export type ArabicLabels = Record<string, string>;
