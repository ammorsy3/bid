/**
 * Fixture harness for integration tests.
 *
 * These tests run against the live Supabase database, so the rules here are
 * strict and deliberate:
 *
 *   • Every row this creates is tracked by its exact primary key.
 *   • Teardown deletes ONLY those tracked keys — never a LIKE pattern, never a
 *     bulk DELETE, never a TRUNCATE. A test can therefore not remove real data
 *     even if its own bookkeeping is wrong.
 *   • Fixture identities are namespaced with a per-run id so a crashed run
 *     leaves obviously-labelled rows behind rather than colliding with anything.
 *
 * If you add a new fixture kind, register its key in `track()` so it gets torn
 * down. Do not reach for a broader delete.
 */
import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../../server/db";
import { supabaseStorage, PRIVATE_BUCKET } from "../../server/objectStorage";

const RUN = randomUUID().slice(0, 8);

export const runTag = () => RUN;

type Table =
  | "users"
  | "companies"
  | "user_companies"
  | "tenders"
  | "offers"
  | "company_documents"
  | "company_profiles"
  | "object_acl";

// Insertion order matters on teardown: children are removed before parents.
const TEARDOWN_ORDER: Table[] = [
  "object_acl",
  "company_profiles",
  "company_documents",
  "offers",
  "tenders",
  "user_companies",
  "companies",
  "users",
];

const created: Record<Table, string[]> = {
  users: [],
  companies: [],
  user_companies: [],
  tenders: [],
  offers: [],
  company_documents: [],
  company_profiles: [],
  object_acl: [],
};

const storageObjects: string[] = [];

function track(table: Table, key: string) {
  created[table].push(key);
}

export async function makeUser(opts: { isAdmin?: boolean } = {}) {
  const id = randomUUID();
  const email = `acltest-${RUN}-${id.slice(0, 6)}@test.invalid`;
  await db.execute(sql`
    insert into users (id, email, username, password, name, is_admin)
    values (${id}, ${email}, ${`acltest_${RUN}_${id.slice(0, 6)}`},
            'x-not-a-real-hash', 'ACL Test User', ${opts.isAdmin ?? false})
  `);
  track("users", id);
  return { id, email };
}

export async function makeCompany(ownerUserId: string) {
  const id = randomUUID();
  await db.execute(sql`
    insert into companies (id, name, slug, owner_user_id)
    values (${id}, ${`ACL Test Co ${RUN}`}, ${`acl-test-${RUN}-${id.slice(0, 6)}`},
            ${ownerUserId})
  `);
  track("companies", id);

  const membershipId = randomUUID();
  await db.execute(sql`
    insert into user_companies (id, user_id, company_id, role_in_company)
    values (${membershipId}, ${ownerUserId}, ${id}, 'owner')
  `);
  track("user_companies", membershipId);

  return { id };
}

export async function makeTender(companyId: string, createdBy: string, status = "published") {
  const id = randomUUID();
  await db.execute(sql`
    insert into tenders (id, company_id, created_by, title, description, status,
                         deadline, invitation_token)
    values (${id}, ${companyId}, ${createdBy},
            ${`ACL Test Tender ${RUN}`}, 'fixture', ${status},
            now() + interval '30 days', ${randomUUID()})
  `);
  track("tenders", id);
  return { id };
}

/** Uploads a real object to the private bucket and returns its /objects/ path. */
export async function makePrivateFile(content = `acl-fixture-${RUN}`) {
  const key = `uploads/acltest-${RUN}-${randomUUID()}`;
  const { error } = await supabaseStorage
    .from(PRIVATE_BUCKET)
    .upload(key, Buffer.from(content), { contentType: "text/plain", upsert: false });
  if (error) throw new Error(`fixture upload failed: ${error.message}`);
  storageObjects.push(key);
  return { objectPath: `/objects/${key}` };
}

export async function setAcl(
  objectPath: string,
  policy: { owner?: string | null; visibility: "public" | "private"; tenderAccess?: unknown },
) {
  await db.execute(sql`
    insert into object_acl (object_path, owner_id, visibility, tender_access)
    values (${objectPath}, ${policy.owner ?? null}, ${policy.visibility},
            ${policy.tenderAccess ? JSON.stringify(policy.tenderAccess) : null}::jsonb)
    on conflict (object_path) do update set
      owner_id = excluded.owner_id,
      visibility = excluded.visibility,
      tender_access = excluded.tender_access
  `);
  track("object_acl", objectPath);
}

export async function makeOffer(args: {
  tenderId: string;
  companyId: string;
  createdBy: string;
  technicalFileUrl: string;
}) {
  const id = randomUUID();
  await db.execute(sql`
    insert into offers (id, tender_id, company_id, created_by, technical_file_url, status)
    values (${id}, ${args.tenderId}, ${args.companyId}, ${args.createdBy},
            ${args.technicalFileUrl}, 'submitted')
  `);
  track("offers", id);
  return { id };
}

export async function makeCompanyDocument(args: {
  companyId: string;
  fileUrl: string;
  uploadedBy: string;
  documentType?: string;
}) {
  const id = randomUUID();
  await db.execute(sql`
    insert into company_documents (id, company_id, document_type, file_url, uploaded_by)
    values (${id}, ${args.companyId}, ${args.documentType ?? "cr_certificate"},
            ${args.fileUrl}, ${args.uploadedBy})
  `);
  track("company_documents", id);
  return { id };
}

/** Points a company's profile logo at an object, creating the profile row if needed. */
export async function setCompanyLogo(companyId: string, logoUrl: string) {
  const id = randomUUID();
  await db.execute(sql`
    insert into company_profiles (id, company_id, display_name, logo_url)
    values (${id}, ${companyId}, ${`ACL Test Co ${RUN}`}, ${logoUrl})
    on conflict (company_id) do update set logo_url = excluded.logo_url
  `);
  track("company_profiles", id);
}

export function tokenFor(user: {
  id: string;
  activeCompanyId?: string | null;
  isAdmin?: boolean;
}) {
  return jwt.sign(
    {
      userId: user.id,
      activeCompanyId: user.activeCompanyId ?? null,
      roleInCompany: null,
      isAdmin: user.isAdmin ?? false,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "10m" },
  );
}

/**
 * Removes every row and object this run created, by exact key. Deliberately
 * tolerant of individual failures so one bad delete cannot strand the rest.
 */
export async function teardown() {
  for (const table of TEARDOWN_ORDER) {
    const keys = created[table];
    if (keys.length === 0) continue;

    const column = table === "object_acl" ? "object_path" : "id";
    for (const key of keys) {
      try {
        await db.execute(
          sql`delete from ${sql.identifier(table)} where ${sql.identifier(column)} = ${key}`,
        );
      } catch (err) {
        console.error(`teardown: failed to delete ${table}.${column}=${key}`, err);
      }
    }
    created[table] = [];
  }

  if (storageObjects.length > 0) {
    await supabaseStorage.from(PRIVATE_BUCKET).remove(storageObjects);
    storageObjects.length = 0;
  }
}
