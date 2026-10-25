// Itemized requests: the request, its items and the derived deliverables mirror
// are written in ONE transaction (proposal §2), so there is never a request
// without its items or a mirror that disagrees with them. Items are never
// updated after creation (published-item lock, proposal §7): there is no
// update function here on purpose.

import { and, asc, eq } from "drizzle-orm";
import { tenderItems, tenders, type InsertTender, type Tender, type TenderItem } from "@shared/schema";
import { deliverablesMirror, type StoredItem } from "@shared/boq-items";
import { db as defaultDb } from "../db";
import type { StructuredRequest } from "./structured-request";

type Database = typeof defaultDb;

export const toStoredItem = (i: TenderItem): StoredItem => ({
  id: i.id,
  position: i.position,
  name: i.name,
  description: i.description,
  unit: i.unit,
  // numeric comes back as a fixed-scale string ("2.5000"); keep the canonical text.
  quantity: i.quantity.includes(".") ? i.quantity.replace(/\.?0+$/, "") : i.quantity,
  referenceUnitPrice: i.referenceUnitPrice,
  imageUrl: i.imageUrl,
  customValues: i.customValues ?? null,
});

export function createTenderItemsStore(database: Database) {
  return {
    async createItemizedTender(values: InsertTender, s: StructuredRequest): Promise<Tender> {
      return database.transaction(async (tx) => {
        const [tender] = await tx.insert(tenders).values({
          ...values,
          submissionType: s.submissionType,
          requestType: s.requestType,
          itemizedPricing: true,
          showReferencePrices: s.showReferencePrices,
          itemColumns: s.itemColumns,
          itemsRevision: 1,
          deliverables: null,
        }).returning();
        const rows = await tx.insert(tenderItems).values(s.items.map((it, position) => ({
          tenderId: tender.id,
          revision: 1,
          position,
          name: it.name,
          description: it.description,
          unit: it.unit,
          quantity: it.quantity,
          referenceUnitPrice: it.referenceUnitPrice,
          imageUrl: it.imageUrl,
          customValues: it.customValues,
        }))).returning();
        const [withMirror] = await tx.update(tenders)
          .set({ deliverables: deliverablesMirror(rows.map(toStoredItem)) })
          .where(eq(tenders.id, tender.id))
          .returning();
        return withMirror;
      });
    },

    async getItems(tenderId: string, revision: number): Promise<StoredItem[]> {
      const rows = await database.select().from(tenderItems)
        .where(and(eq(tenderItems.tenderId, tenderId), eq(tenderItems.revision, revision)))
        .orderBy(asc(tenderItems.position));
      return rows.map(toStoredItem);
    },

  };
}

export type TenderItemsStore = ReturnType<typeof createTenderItemsStore>;
export const tenderItemsStore: TenderItemsStore = createTenderItemsStore(defaultDb);
