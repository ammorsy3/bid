import { sql } from "drizzle-orm";
import { db } from "./db";
import type { StoredObject } from "./objectStorage";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

// The ACL policy of the object.
// Persisted in the `object_acl` table, keyed by the app-relative object path
// (e.g. "/objects/uploads/<uuid>"). It used to live in Google Cloud custom
// object metadata, which does not survive a bucket-to-bucket migration —
// Postgres keeps it with the rest of the app's state.
export interface ObjectAclPolicy {
  owner?: string | null;
  visibility: "public" | "private";
  tenderAccess?: {
    tenderId: string;
    allowedUserIds: string[];
  };
}

export async function setObjectAclPolicy(
  object: StoredObject,
  aclPolicy: ObjectAclPolicy,
): Promise<void> {
  const tenderAccess = aclPolicy.tenderAccess
    ? JSON.stringify(aclPolicy.tenderAccess)
    : null;

  await db.execute(sql`
    insert into object_acl (object_path, owner_id, visibility, tender_access)
    values (
      ${object.objectPath},
      ${aclPolicy.owner ?? null},
      ${aclPolicy.visibility},
      ${tenderAccess}::jsonb
    )
    on conflict (object_path) do update set
      owner_id = excluded.owner_id,
      visibility = excluded.visibility,
      tender_access = excluded.tender_access
  `);
}

export async function getObjectAclPolicy(
  object: StoredObject,
): Promise<ObjectAclPolicy | null> {
  const result = await db.execute(sql`
    select owner_id, visibility, tender_access
    from object_acl
    where object_path = ${object.objectPath}
    limit 1
  `);

  const row = (result as any).rows?.[0];
  if (!row) return null;

  return {
    owner: row.owner_id,
    visibility: row.visibility,
    tenderAccess: row.tender_access ?? undefined,
  };
}

export async function canAccessObject({
  userId,
  object,
  requestedPermission,
}: {
  userId?: string;
  object: StoredObject;
  requestedPermission: ObjectPermission;
}): Promise<boolean> {
  // Objects living in the public bucket are world-readable by construction —
  // they are served without auth and need no ACL row.
  if (object.isPublic && requestedPermission === ObjectPermission.READ) {
    return true;
  }

  // No policy means no access. Files migrated from the old Replit/GCS bucket
  // lost their metadata ACLs, so an unclaimed private object stays denied
  // rather than defaulting open.
  const aclPolicy = await getObjectAclPolicy(object);
  if (!aclPolicy) {
    return false;
  }

  if (
    aclPolicy.visibility === "public" &&
    requestedPermission === ObjectPermission.READ
  ) {
    return true;
  }

  if (!userId) {
    return false;
  }

  if (aclPolicy.owner && aclPolicy.owner === userId) {
    return true;
  }

  if (aclPolicy.tenderAccess?.allowedUserIds.includes(userId)) {
    return true;
  }

  return false;
}

/**
 * Who uploaded the object at this app path, from its ACL row. Null when the
 * object has no ACL row (never finalised through PUT /api/objects/metadata).
 * Used to make sure a caller can only attach their OWN upload to a record that
 * widens read access (e.g. a company verification document).
 */
export async function getObjectOwnerByPath(objectPath: string): Promise<string | null> {
  const result = await db.execute(sql`
    select owner_id from object_acl where object_path = ${objectPath} limit 1
  `);
  const row = (result as any).rows?.[0];
  return row?.owner_id ?? null;
}

// ── Company provenance (migrations/0017_object_acl_provenance.sql) ────────────
// Which company an upload belongs to is recorded once, by the server, when the
// upload is issued — never derived from the records that later reference it.
//   provenance 'company'             owner_company_id = the company it was issued for
//   provenance 'pending_onboarding'  issued before its company exists; bindable once,
//                                    by its uploader, during company creation
//   provenance NULL                  legacy (before 0017): never bindable; served only
//                                    under the authorship fallback
// setObjectAclPolicy (finalization, backfills) never writes these columns.

export type Provenance = "company" | "pending_onboarding" | null;

export interface ObjectProvenance {
  ownerId: string | null;
  ownerCompanyId: string | null;
  provenance: Provenance;
  visibility: string;
}

/** How long a pending onboarding upload may be bound (accepted: 24 hours). */
export const ONBOARDING_BIND_WINDOW_HOURS = 24;

export async function getObjectProvenance(objectPath: string): Promise<ObjectProvenance | null> {
  const result = await db.execute(sql`
    select owner_id, owner_company_id, provenance, visibility
      from object_acl where object_path = ${objectPath} limit 1
  `);
  const row = (result as any).rows?.[0];
  if (!row) return null;
  return {
    ownerId: row.owner_id ?? null,
    ownerCompanyId: row.owner_company_id ?? null,
    provenance: (row.provenance ?? null) as Provenance,
    visibility: row.visibility,
  };
}

/**
 * The ACL row for a newly issued upload, written before its signed URL is
 * returned. With a company it is that company's file; without one it is a
 * pending onboarding upload.
 */
export async function issueObjectAcl(objectPath: string, ownerId: string, companyId: string | null): Promise<void> {
  if (companyId) {
    await db.execute(sql`
      insert into object_acl (object_path, owner_id, visibility, owner_company_id, provenance, issued_at)
      values (${objectPath}, ${ownerId}, 'private', ${companyId}, 'company', now())
    `);
  } else {
    await db.execute(sql`
      insert into object_acl (object_path, owner_id, visibility, owner_company_id, provenance, issued_at)
      values (${objectPath}, ${ownerId}, 'private', null, 'pending_onboarding', now())
    `);
  }
}

/**
 * Publishes a company's own file (visibility public), e.g. when it becomes that
 * company's profile logo. Only rows issued for that company change.
 */
export async function publishCompanyObject(
  objectPath: string,
  companyId: string,
  executor: { execute: typeof db.execute } = db,
): Promise<boolean> {
  const result = await executor.execute(sql`
    update object_acl set visibility = 'public'
     where object_path = ${objectPath} and provenance = 'company' and owner_company_id = ${companyId}
  `);
  return ((result as any).rowCount ?? 0) > 0;
}

/**
 * Binds a pending onboarding upload to the company being created — at most once,
 * only by its uploader, only within the binding window. One conditional UPDATE:
 * under concurrency the row lock lets exactly one transaction match. Returns
 * whether this call bound it. Must run inside the company-creation transaction.
 */
export async function bindOnboardingObject(
  executor: { execute: typeof db.execute },
  objectPath: string,
  userId: string,
  companyId: string,
): Promise<boolean> {
  const result = await executor.execute(sql`
    update object_acl
       set owner_company_id = ${companyId}, provenance = 'company'
     where object_path = ${objectPath}
       and owner_id = ${userId}
       and provenance = 'pending_onboarding'
       and owner_company_id is null
       and issued_at > now() - make_interval(hours => ${ONBOARDING_BIND_WINDOW_HOURS})
    returning object_path
  `);
  return ((result as any).rows?.length ?? 0) === 1;
}
