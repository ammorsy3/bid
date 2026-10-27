// Analytics foundations for vendor offerings (BID-OFFERING-CLASSIFICATION).
//
// Every count is of DISTINCT organizations in a bucket: an organization with
// three items in one group counts once for that group, once for its
// specialization and once for its sector. Joins never inflate totals.
//
// Buckets OVERLAP: an organization offering in two sectors is counted in both,
// so per-sector counts cannot be summed into a unique total — use
// classificationStatusCounts() (or a DISTINCT count) for that.
//
// Only 'registered' organizations of non-deleted companies are counted in the
// taxonomy buckets; legacy (unclassified) organizations are unknown, never
// "offers nothing", and appear only in the status counts.
//
// Results are aggregates only. Never log per-organization selections.

import { sql } from "drizzle-orm";
import type { CatalogueIndex, OfferingSelection } from "@shared/offering-catalogue/selection";
import { db as defaultDb } from "../db";

export type OfferingBucket = "sector" | "specialization" | "group" | "item" | "offering_type";

type Database = typeof defaultDb;

export interface BucketCount { bucket: string; organizations: number }

const BUCKET_SQL: Record<Exclude<OfferingBucket, "item">, ReturnType<typeof sql.raw>> = {
  sector: sql.raw("f.sector_id"),
  specialization: sql.raw("g.specialization_id"),
  group: sql.raw("g.id"),
  offering_type: sql.raw("g.offering_type"),
};

export function createOfferingAnalytics(database: Database) {
  return {
    /** Distinct registered organizations per bucket. Items count item selections only (a group declaration never implies an item). */
    async organizationsBy(bucket: OfferingBucket): Promise<BucketCount[]> {
      const result = bucket === "item"
        ? await database.execute(sql`
            SELECT i.item_id AS bucket, count(DISTINCT i.company_id)::int AS organizations
            FROM company_offering_items i
            JOIN company_vendor_registrations r ON r.company_id = i.company_id AND r.status = 'registered'
            JOIN companies c ON c.id = i.company_id AND c.deleted_at IS NULL
            GROUP BY 1 ORDER BY 1`)
        : await database.execute(sql`
            WITH effective AS (
              SELECT company_id, group_id FROM company_offering_items
              UNION
              SELECT company_id, group_id FROM company_offering_groups
            )
            SELECT ${BUCKET_SQL[bucket]} AS bucket, count(DISTINCT e.company_id)::int AS organizations
            FROM effective e
            JOIN offering_groups g ON g.id = e.group_id
            JOIN offering_specializations f ON f.id = g.specialization_id
            JOIN company_vendor_registrations r ON r.company_id = e.company_id AND r.status = 'registered'
            JOIN companies c ON c.id = e.company_id AND c.deleted_at IS NULL
            GROUP BY 1 ORDER BY 1`);
      return (result.rows as any[]).map((r) => ({ bucket: String(r.bucket), organizations: Number(r.organizations) }));
    },

    /** Every non-deleted organization once. A company without a row predates classification. */
    async classificationStatusCounts(): Promise<Record<string, number>> {
      const result = await database.execute(sql`
        SELECT coalesce(r.status, 'legacy_unclassified') AS status, count(*)::int AS organizations
        FROM companies c
        LEFT JOIN company_vendor_registrations r ON r.company_id = c.id
        WHERE c.deleted_at IS NULL
        GROUP BY 1`);
      return Object.fromEntries((result.rows as any[]).map((r) => [String(r.status), Number(r.organizations)]));
    },
  };
}

/**
 * Reference semantics of organizationsBy(), over in-memory data. The SQL above
 * must agree with this (tests/offerings.integration.test.ts checks it on Postgres).
 */
export function referenceOrganizationsBy(
  orgs: { companyId: string; selection: OfferingSelection }[],
  idx: CatalogueIndex,
  bucket: OfferingBucket,
): BucketCount[] {
  const members = new Map<string, Set<string>>();
  const add = (key: string, companyId: string) => {
    const set = members.get(key) ?? new Set<string>();
    set.add(companyId);
    members.set(key, set);
  };
  for (const { companyId, selection } of orgs) {
    for (const g of selection.groups) {
      const group = idx.groups.get(g.groupId);
      if (!group) continue;
      if (bucket === "item") { g.itemIds.forEach((i) => add(i, companyId)); continue; }
      if (g.itemIds.length === 0 && !g.declared) continue;
      const key = bucket === "sector" ? group.sectorId
        : bucket === "specialization" ? group.specializationId
        : bucket === "group" ? group.id
        : group.type;
      add(key, companyId);
    }
  }
  return [...members].map(([b, s]) => ({ bucket: b, organizations: s.size })).sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));
}
