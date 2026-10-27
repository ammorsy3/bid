// Vendor offerings and vendor registration — storage and the completion rule
// (BID-OFFERING-CLASSIFICATION).
//
// Invariant, enforced here and nowhere weaker: an organization is
// 'registered' (vendor registration complete) only while it has at least one
// EFFECTIVE offering — a selected listed item or a group-level declaration.
// A save runs in one transaction under the registration row lock: it checks the
// revision the editor started from, validates every ID against the catalogue
// and the organization's held records, replaces the offerings, moves the status
// and writes a counts-only activity row — all or nothing. A failed save leaves
// the previous offerings and status exactly as they were.
//
// Statuses: see VENDOR_REGISTRATION_STATUSES in shared/schema.ts. A missing row
// means the organization predates classification (legacy_unclassified) — never
// registered. Requester-only companies claim nothing; turning one into a vendor
// is an explicit activation that requires offerings.

import { and, eq, inArray, sql } from "drizzle-orm";
import {
  companies,
  companyOfferingGroups,
  companyOfferingItems,
  companyVendorRegistrations,
  memberActivityLog,
  type CompanyVendorRegistration,
  type VendorRegistrationStatus,
} from "@shared/schema";
import {
  hasEffectiveOffering,
  normalizeSelection,
  selectionKey,
  validateSelection,
  type CatalogueIndex,
  type OfferingSelection,
  type SelectionError,
} from "@shared/offering-catalogue/selection";
import { db as defaultDb } from "../db";
import { offeringCatalogue } from "./offering-catalogue";

type Database = typeof defaultDb;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Reader = Tx | Database;

export class OfferingError extends Error {
  constructor(public status: number, public code: string, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
    this.name = "OfferingError";
  }
}

export interface OfferingState {
  status: VendorRegistrationStatus;
  revision: number;
  catalogueVersion: string | null;
  registeredAt: Date | null;
  updatedAt: Date | null;
  selection: OfferingSelection;
}

export interface SaveOfferingsArgs {
  companyId: string;
  actorId: string;
  expectedRevision: number;
  selection: OfferingSelection;
  activateVendor?: boolean;
}

/** Statuses that block vendor capabilities (submitting offers). Legacy is not blocked: never lock existing organizations out. */
export const VENDOR_BLOCKED_STATUSES: ReadonlySet<VendorRegistrationStatus> = new Set(["pending", "requester_only"]);

/** The initial status of a new organization. Teams and individuals only offer; companies choose. */
export function initialVendorStatus(accountType: string, vendorIntent: "vendor" | "requester_only" | undefined): VendorRegistrationStatus {
  if (accountType !== "company") return "pending";
  return vendorIntent === "requester_only" ? "requester_only" : "pending";
}

/**
 * Item selections and group declarations in ONE statement (OFC-4), so they
 * always come from the same snapshot. A row with a NULL item is a declaration.
 */
async function readSelection(reader: Reader, companyId: string): Promise<OfferingSelection> {
  const result = await reader.execute(sql`
    SELECT item_id, group_id FROM company_offering_items WHERE company_id = ${companyId}
    UNION ALL
    SELECT NULL, group_id FROM company_offering_groups WHERE company_id = ${companyId}`);
  const byGroup = new Map<string, { itemIds: string[]; declared: boolean }>();
  for (const r of result.rows as { item_id: string | null; group_id: string }[]) {
    const g = byGroup.get(r.group_id) ?? { itemIds: [], declared: false };
    if (r.item_id === null) g.declared = true; else g.itemIds.push(r.item_id);
    byGroup.set(r.group_id, g);
  }
  return normalizeSelection({ groups: [...byGroup].map(([groupId, g]) => ({ groupId, ...g })) });
}

function toState(row: CompanyVendorRegistration | undefined, selection: OfferingSelection): OfferingState {
  return {
    status: (row?.status as VendorRegistrationStatus) ?? "legacy_unclassified",
    revision: row?.revision ?? 0,
    catalogueVersion: row?.catalogueVersion ?? null,
    registeredAt: row?.registeredAt ?? null,
    updatedAt: row?.updatedAt ?? null,
    selection,
  };
}

/** Creates the row for an organization that predates classification, then locks it. */
async function lockRegistration(tx: Tx, companyId: string): Promise<CompanyVendorRegistration> {
  await tx.insert(companyVendorRegistrations)
    .values({ companyId, status: "legacy_unclassified" })
    .onConflictDoNothing();
  const [row] = await tx.select().from(companyVendorRegistrations)
    .where(eq(companyVendorRegistrations.companyId, companyId)).for("update");
  if (!row) throw new OfferingError(404, "NOT_FOUND", "Organization not found");
  return row;
}

async function loadCompany(reader: Reader, companyId: string) {
  const [company] = await reader.select({ id: companies.id, accountType: companies.accountType, deletedAt: companies.deletedAt })
    .from(companies).where(eq(companies.id, companyId));
  if (!company || company.deletedAt) throw new OfferingError(404, "NOT_FOUND", "Organization not found");
  return company;
}

const counts = (s: OfferingSelection) => ({
  groups: s.groups.length,
  items: s.groups.reduce((n, g) => n + g.itemIds.length, 0),
  declarations: s.groups.filter((g) => g.declared).length,
});

export type SavePlan =
  | { kind: "noop" }
  | {
    kind: "write";
    next: OfferingSelection;
    removeItems: string[];
    addItems: [itemId: string, groupId: string][];
    removeDecl: string[];
    addDecl: string[];
  };

/**
 * The whole decision of a save, without I/O: validation, the completion rule,
 * requester-only activation, optimistic concurrency and idempotent retries.
 * Throws OfferingError (nothing is written); otherwise says what to write.
 */
export function planSave(
  current: { status: VendorRegistrationStatus; revision: number },
  held: OfferingSelection,
  args: Pick<SaveOfferingsArgs, "expectedRevision" | "selection" | "activateVendor">,
  idx: CatalogueIndex,
): SavePlan {
  const validation = validateSelection(args.selection, idx, held);
  if (!validation.ok) {
    // Codes only: error bodies can reach client error reporting, which must never carry classification data.
    const codes = [...new Set(validation.errors.map((e: SelectionError) => e.code))];
    throw new OfferingError(422, "INVALID_SELECTION", "Some selected offerings are not valid. Reload the list and try again.", { errorCodes: codes });
  }
  const next = validation.selection;
  if (!hasEffectiveOffering(next)) {
    throw current.status === "registered"
      ? new OfferingError(422, "LAST_OFFERING_REQUIRED", "A registered vendor must keep at least one offering. Add another before removing the last one.")
      : new OfferingError(422, "OFFERINGS_REQUIRED", "Select at least one service or product your organization offers.");
  }
  if (current.status === "requester_only" && !args.activateVendor) {
    throw new OfferingError(409, "VENDOR_NOT_ACTIVE", "This company is registered as a requester only. Confirm that it also offers services or products.");
  }
  const same = selectionKey(next) === selectionKey(held);
  if (current.revision !== args.expectedRevision) {
    // A retry of a save that already committed asks for exactly what is stored: answer it, change nothing.
    if (same && current.status === "registered") return { kind: "noop" };
    // No selections in the body (see INVALID_SELECTION); the client re-reads them.
    throw new OfferingError(409, "OFFERINGS_CONFLICT", "Your organization's offerings were changed elsewhere. Review the latest version before saving.", {
      currentRevision: current.revision,
    });
  }
  if (same && current.status === "registered") return { kind: "noop" };

  // Replace: drop what is no longer selected, add what is new; kept rows keep their original timestamp and version.
  const heldItems = new Set(held.groups.flatMap((g) => g.itemIds));
  const nextItems = new Map(next.groups.flatMap((g) => g.itemIds.map((i) => [i, g.groupId] as const)));
  const heldDecl = new Set(held.groups.filter((g) => g.declared).map((g) => g.groupId));
  const nextDecl = new Set(next.groups.filter((g) => g.declared).map((g) => g.groupId));
  return {
    kind: "write",
    next,
    removeItems: [...heldItems].filter((i) => !nextItems.has(i)),
    addItems: [...nextItems].filter(([i]) => !heldItems.has(i)),
    removeDecl: [...heldDecl].filter((g) => !nextDecl.has(g)),
    addDecl: [...nextDecl].filter((g) => !heldDecl.has(g)),
  };
}

/** Test seam only (tests/offerings.integration.test.ts): pause between the reads of read(). */
export interface OfferingStoreHooks {
  afterRegistrationRead?: () => Promise<void>;
}

export function createOfferingStore(database: Database, catalogue: () => CatalogueIndex = offeringCatalogue, hooks: OfferingStoreHooks = {}) {
  return {
    /**
     * Current state. Organization-private: callers authorise membership first.
     * OFC-4: status, revision and offerings come from ONE snapshot — a read-only
     * REPEATABLE READ transaction — so a save committing between the statements
     * can never pair one revision with another revision's offerings. (Saves are
     * consistent already: they read under the registration row lock that every
     * writer takes first.)
     */
    async read(companyId: string): Promise<OfferingState> {
      return database.transaction(async (tx) => {
        const [row] = await tx.select().from(companyVendorRegistrations)
          .where(eq(companyVendorRegistrations.companyId, companyId));
        await hooks.afterRegistrationRead?.();
        return toState(row, await readSelection(tx, companyId));
      }, { isolationLevel: "repeatable read", accessMode: "read only" });
    },

    async status(companyId: string): Promise<VendorRegistrationStatus> {
      const [row] = await database.select({ status: companyVendorRegistrations.status })
        .from(companyVendorRegistrations).where(eq(companyVendorRegistrations.companyId, companyId));
      return (row?.status as VendorRegistrationStatus) ?? "legacy_unclassified";
    },

    /** Replaces the organization's offerings; the only path to 'registered'. */
    async save(args: SaveOfferingsArgs): Promise<{ state: OfferingState; changed: boolean; completedRegistration: boolean }> {
      const idx = catalogue();
      return database.transaction(async (tx) => {
        await loadCompany(tx, args.companyId);
        const row = await lockRegistration(tx, args.companyId);
        const held = await readSelection(tx, args.companyId);

        const plan = planSave({ status: row.status as VendorRegistrationStatus, revision: row.revision }, held, args, idx);
        if (plan.kind === "noop") return { state: toState(row, held), changed: false, completedRegistration: false };
        const { next, removeItems, addItems, removeDecl, addDecl } = plan;
        const version = idx.catalogue.version;

        if (removeItems.length) {
          await tx.delete(companyOfferingItems).where(and(eq(companyOfferingItems.companyId, args.companyId), inArray(companyOfferingItems.itemId, removeItems)));
        }
        if (addItems.length) {
          await tx.insert(companyOfferingItems).values(addItems.map(([itemId, groupId]) => ({
            companyId: args.companyId, itemId, groupId, catalogueVersion: version, selectedBy: args.actorId,
          })));
        }
        if (removeDecl.length) {
          await tx.delete(companyOfferingGroups).where(and(eq(companyOfferingGroups.companyId, args.companyId), inArray(companyOfferingGroups.groupId, removeDecl)));
        }
        if (addDecl.length) {
          await tx.insert(companyOfferingGroups).values(addDecl.map((groupId) => ({
            companyId: args.companyId, groupId, catalogueVersion: version, declaredBy: args.actorId,
          })));
        }

        const now = new Date();
        const completedRegistration = row.status !== "registered";
        const [updated] = await tx.update(companyVendorRegistrations).set({
          status: "registered",
          revision: row.revision + 1,
          catalogueVersion: version,
          registeredAt: row.registeredAt ?? now,
          updatedAt: now,
          updatedBy: args.actorId,
        }).where(eq(companyVendorRegistrations.companyId, args.companyId)).returning();

        // Counts only: members can see the activity log, and analytics/logs never carry the selections themselves.
        await tx.insert(memberActivityLog).values({
          companyId: args.companyId,
          actorUserId: args.actorId,
          action: completedRegistration ? "company.vendor_registration_completed" : "company.offerings_updated",
          targetType: "company",
          targetId: args.companyId,
          summary: completedRegistration ? "Completed vendor registration" : "Updated offerings",
          metadata: { ...counts(next), revision: updated.revision, previousStatus: row.status },
        });
        return { state: toState(updated, next), changed: true, completedRegistration };
      });
    },

    /** A company that does not offer anything (yet). Never from 'registered': offerings are not discarded this way. */
    async declareRequesterOnly(args: { companyId: string; actorId: string; expectedRevision: number }): Promise<OfferingState> {
      return database.transaction(async (tx) => {
        const company = await loadCompany(tx, args.companyId);
        if (company.accountType !== "company") {
          throw new OfferingError(400, "VENDOR_ONLY_WORKSPACE", "Team and individual workspaces exist to offer services; they cannot be requester-only.");
        }
        const row = await lockRegistration(tx, args.companyId);
        if (row.status === "requester_only") return toState(row, { groups: [] });
        if (row.status === "registered") {
          throw new OfferingError(409, "ALREADY_REGISTERED", "This company is a registered vendor. Its offerings stay in place.");
        }
        if (row.revision !== args.expectedRevision) {
          throw new OfferingError(409, "OFFERINGS_CONFLICT", "Your organization's registration was changed elsewhere. Reload and try again.", {
            currentRevision: row.revision,
          });
        }
        const [updated] = await tx.update(companyVendorRegistrations).set({
          status: "requester_only", revision: row.revision + 1, updatedAt: new Date(), updatedBy: args.actorId,
        }).where(eq(companyVendorRegistrations.companyId, args.companyId)).returning();
        await tx.insert(memberActivityLog).values({
          companyId: args.companyId, actorUserId: args.actorId, action: "company.requester_only_declared",
          targetType: "company", targetId: args.companyId, summary: "Declared requester-only", metadata: { previousStatus: row.status },
        });
        return toState(updated, await readSelection(tx, args.companyId));
      });
    },
  };
}

export type OfferingStore = ReturnType<typeof createOfferingStore>;

let store: OfferingStore | null = null;
export function offeringStore(): OfferingStore {
  if (!store) store = createOfferingStore(defaultDb);
  return store;
}

/** Inserted inside the company-creation transaction (server/lib/company-onboarding.ts). */
export async function initializeVendorRegistration(tx: Tx, companyId: string, status: VendorRegistrationStatus) {
  if (status === "registered" || status === "legacy_unclassified") throw new Error(`A new organization cannot start as ${status}`);
  await tx.insert(companyVendorRegistrations).values({ companyId, status });
}
