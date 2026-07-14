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
