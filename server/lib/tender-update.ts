// The one write path for a request's fields, with its invariants checked under
// the request's row lock (PB evidence gap: spec edit vs first offer).
//
// SELECT … FOR UPDATE on the tender row conflicts with the FOR KEY SHARE lock
// every offer insert takes through its tender_id foreign key, and with the
// itemized submission's FOR SHARE. So "no offers yet" and the update are one
// atomic decision: an offer that commits first is seen and the edit refused
// (P8, 409 SPEC_LOCKED); an edit that commits first makes the offer wait and
// then price the new specification.

import { and, eq, ne } from "drizzle-orm";
import { offers, tenders, type InsertTender, type Tender } from "@shared/schema";
import { lockedSpecChanges } from "@shared/tender-spec-lock";
import { ItemsLockedError, SpecLockedError, STRUCTURE_KEYS } from "./items-lock";
import type { db as defaultDb } from "../db";

type Database = typeof defaultDb;

export async function updateTenderGuarded(database: Database, id: string, updates: Partial<InsertTender>): Promise<Tender> {
  // Published-item lock (proposal §7): the structure of a request never changes.
  const structureKeys = STRUCTURE_KEYS.filter((k) => k in updates);
  if (structureKeys.length) throw new ItemsLockedError(structureKeys);
  return database.transaction(async (tx) => {
    const [current] = await tx.select().from(tenders).where(eq(tenders.id, id)).for("update");
    if (!current) throw new Error(`tender ${id} not found`);
    // An itemized request's deliverables are only the mirror written with its items.
    if (current.itemizedPricing) {
      const fields = ["deliverables", ...("submissionType" in updates && updates.submissionType !== current.submissionType ? ["submissionType"] : [])]
        .filter((k) => k in updates);
      if (fields.length) throw new ItemsLockedError(fields);
    }
    // P8: once offers exist, the specification they priced stays as it is.
    const specChanges = lockedSpecChanges(current as Record<string, unknown>, updates as Record<string, unknown>);
    if (specChanges.length) {
      const [anyOffer] = await tx.select({ id: offers.id }).from(offers)
        .where(and(eq(offers.tenderId, id), ne(offers.status, "superseded"))).limit(1);
      if (anyOffer) throw new SpecLockedError(specChanges);
    }
    const [tender] = await tx.update(tenders).set({ ...updates, updatedAt: new Date() }).where(eq(tenders.id, id)).returning();
    return tender;
  });
}
