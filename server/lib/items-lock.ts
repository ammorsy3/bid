// Published-item lock (proposal §7): errors and keys, dependency-free so
// storage can use them.
// Set once at creation and never changed: an itemized request's structure.
export const STRUCTURE_KEYS = ["requestType", "itemizedPricing", "showReferencePrices", "itemColumns", "itemsRevision"] as const;

export class ItemsLockedError extends Error {
  readonly code = "ITEMS_LOCKED" as const;
  constructor(public fields: string[]) {
    super("Items cannot be edited after publication to preserve the basis of vendor pricing.");
    this.name = "ItemsLockedError";
  }
}

/** P8: the request already has offers, so these specification fields cannot change. */
export class SpecLockedError extends Error {
  readonly code = "SPEC_LOCKED" as const;
  constructor(public fields: string[]) {
    super("This request already has offers, so its specification and quantities can no longer be changed.");
    this.name = "SpecLockedError";
  }
}
