// What an organization offers, and the rules every save must pass — shared by
// the server (authoritative) and the client (instant feedback).
//
// The stored truth is POSITIVE and EXPLICIT:
//   • listed items the organization selected, each inside its own group; and
//   • group-level declarations ("we offer something in this group"), kept
//     separately. A declaration never stands for the group's listed items.
// Sector and specialization roll-ups are derived, never stored. There is no
// "all future children" flag: an item added to the catalogue later is not
// selected for anybody until they tick it.
//
// An organization has an EFFECTIVE offering when it has at least one selected
// item or one group declaration. Choosing a sector or specialization alone is
// not an offering.

import { z } from "zod";
import type { OfferingCatalogue, CatalogueGroup, CatalogueItem, CatalogueSector, CatalogueSpecialization } from "./types";

export interface GroupSelection {
  groupId: string;
  itemIds: string[];
  /** Explicit group-level declaration. Required for groups without listed items; optional ("not listed") otherwise. */
  declared: boolean;
}

export interface OfferingSelection {
  groups: GroupSelection[];
}

export const MAX_SELECTED_GROUPS = 800;
export const MAX_ITEMS_PER_GROUP = 50;

const id = z.string().min(1).max(48).regex(/^BID-D\d{2}-F\d{2}-G\d{2}(-I\d{2,3})?$/);

export const saveOfferingsSchema = z.object({
  /** The revision the editor started from (optimistic concurrency). */
  expectedRevision: z.number().int().min(0).max(1_000_000_000),
  groups: z.array(z.object({
    groupId: id,
    itemIds: z.array(id).max(MAX_ITEMS_PER_GROUP),
    declared: z.boolean(),
  }).strict()).max(MAX_SELECTED_GROUPS),
  /** Required to turn a requester-only organization into a vendor. */
  activateVendor: z.boolean().optional(),
}).strict();

export type SaveOfferingsInput = z.infer<typeof saveOfferingsSchema>;

export interface CatalogueIndex {
  catalogue: OfferingCatalogue;
  sectors: Map<string, CatalogueSector>;
  specializations: Map<string, CatalogueSpecialization>;
  groups: Map<string, CatalogueGroup>;
  items: Map<string, CatalogueItem>;
  /** Active listed items of a group, in display order. */
  activeItems: (groupId: string) => CatalogueItem[];
}

export function indexCatalogue(catalogue: OfferingCatalogue): CatalogueIndex {
  const items = new Map(catalogue.items.map((i) => [i.id, i]));
  const active = new Map<string, CatalogueItem[]>();
  for (const g of catalogue.groups) active.set(g.id, g.items.map((i) => items.get(i)!).filter((i) => i && i.status === "active"));
  return {
    catalogue,
    sectors: new Map(catalogue.sectors.map((s) => [s.id, s])),
    specializations: new Map(catalogue.specializations.map((s) => [s.id, s])),
    groups: new Map(catalogue.groups.map((g) => [g.id, g])),
    items,
    activeItems: (groupId) => active.get(groupId) ?? [],
  };
}

export type SelectionErrorCode =
  | "DUPLICATE_GROUP" | "UNKNOWN_GROUP" | "INACTIVE_GROUP" | "EMPTY_GROUP"
  | "DUPLICATE_ITEM" | "UNKNOWN_ITEM" | "ITEM_NOT_IN_GROUP" | "INACTIVE_ITEM";

export interface SelectionError { code: SelectionErrorCode; groupId: string; itemId?: string }

/** Canonical form: groups by ID, items by ID. Two selections are equal iff their keys are equal. */
export function normalizeSelection(sel: OfferingSelection): OfferingSelection {
  return {
    groups: [...sel.groups]
      .map((g) => ({ groupId: g.groupId, itemIds: [...g.itemIds].sort(), declared: g.declared }))
      .sort((a, b) => a.groupId.localeCompare(b.groupId)),
  };
}

export function selectionKey(sel: OfferingSelection): string {
  return JSON.stringify(normalizeSelection(sel).groups);
}

export function hasEffectiveOffering(sel: OfferingSelection): boolean {
  return sel.groups.some((g) => g.itemIds.length > 0 || g.declared);
}

/**
 * Validates a selection against the catalogue. `held` is what the organization
 * already has stored: deprecated records it already holds may be kept (their
 * meaning is preserved), but nothing deprecated can be newly chosen.
 */
export function validateSelection(
  input: OfferingSelection,
  idx: CatalogueIndex,
  held: OfferingSelection = { groups: [] },
): { ok: true; selection: OfferingSelection } | { ok: false; errors: SelectionError[] } {
  const errors: SelectionError[] = [];
  const heldItems = new Set(held.groups.flatMap((g) => g.itemIds));
  const heldDeclarations = new Set(held.groups.filter((g) => g.declared).map((g) => g.groupId));
  const seenGroups = new Set<string>();
  for (const g of input.groups) {
    if (seenGroups.has(g.groupId)) { errors.push({ code: "DUPLICATE_GROUP", groupId: g.groupId }); continue; }
    seenGroups.add(g.groupId);
    const group = idx.groups.get(g.groupId);
    if (!group) { errors.push({ code: "UNKNOWN_GROUP", groupId: g.groupId }); continue; }
    if (g.itemIds.length === 0 && !g.declared) errors.push({ code: "EMPTY_GROUP", groupId: g.groupId });
    if (g.declared && group.status !== "active" && !heldDeclarations.has(g.groupId)) {
      errors.push({ code: "INACTIVE_GROUP", groupId: g.groupId });
    }
    const seenItems = new Set<string>();
    for (const itemId of g.itemIds) {
      if (seenItems.has(itemId)) { errors.push({ code: "DUPLICATE_ITEM", groupId: g.groupId, itemId }); continue; }
      seenItems.add(itemId);
      const item = idx.items.get(itemId);
      if (!item) { errors.push({ code: "UNKNOWN_ITEM", groupId: g.groupId, itemId }); continue; }
      if (item.groupId !== g.groupId) { errors.push({ code: "ITEM_NOT_IN_GROUP", groupId: g.groupId, itemId }); continue; }
      if ((item.status !== "active" || group.status !== "active") && !heldItems.has(itemId)) {
        errors.push({ code: "INACTIVE_ITEM", groupId: g.groupId, itemId });
      }
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, selection: normalizeSelection(input) };
}

export interface SelectionRollup {
  groups: number;
  items: number;
  declarations: number;
  /** Effective groups per specialization / sector (a group counts once). */
  bySpecialization: Map<string, number>;
  bySector: Map<string, number>;
}

/** Derived counts for summaries and partial states. Nothing here is stored. */
export function rollup(sel: OfferingSelection, idx: CatalogueIndex): SelectionRollup {
  const r: SelectionRollup = { groups: 0, items: 0, declarations: 0, bySpecialization: new Map(), bySector: new Map() };
  for (const g of sel.groups) {
    if (g.itemIds.length === 0 && !g.declared) continue;
    const group = idx.groups.get(g.groupId);
    if (!group) continue;
    r.groups++;
    r.items += g.itemIds.length;
    if (g.declared) r.declarations++;
    r.bySpecialization.set(group.specializationId, (r.bySpecialization.get(group.specializationId) ?? 0) + 1);
    r.bySector.set(group.sectorId, (r.bySector.get(group.sectorId) ?? 0) + 1);
  }
  return r;
}
