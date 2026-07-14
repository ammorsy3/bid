/**
 * Rebuilds object_acl in PRODUCTION.
 *
 * Production's object_acl is empty: the ACLs lived in Google Cloud object
 * metadata and did not survive the copy into Supabase Storage. Until this runs,
 * every private file 403s for everyone.
 *
 * Talks to Supabase over the REST API rather than Postgres, so it needs only
 * PROD_SUPABASE_URL + PROD_SUPABASE_SERVICE_ROLE_KEY — no database password.
 *
 * Ownership is reconstructed from the rows that reference each file, exactly as
 * the dev backfill did. Files nothing references get no policy and stay denied.
 *
 *   node scripts/backfill-object-acl-prod.mjs           # dry run, writes nothing
 *   node scripts/backfill-object-acl-prod.mjs --apply   # writes
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

const url = (process.env.PROD_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.PROD_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("PROD_SUPABASE_URL and PROD_SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const all = async (table, cols) => {
  const { data, error } = await sb.from(table).select(cols);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
};

const [companies, userCompanies, tenders, offers, purchaseOrders, companyDocs, companyProfiles] =
  await Promise.all([
    all("companies", "id,owner_user_id"),
    all("user_companies", "user_id,company_id,role_in_company,deleted_at"),
    all("tenders", "id,created_by,attachments"),
    all(
      "offers",
      "id,tender_id,created_by,technical_file_url,financial_file_url,combined_file_url",
    ),
    all("purchase_orders", "id,tender_id,uploaded_by,file_url"),
    all("company_documents", "company_id,file_url"),
    all("company_profiles", "company_id,logo_url,brochure_url"),
  ]);

const tenderById = new Map(tenders.map((t) => [t.id, t]));

// Who owns a company. companies.owner_user_id is null for nearly every company
// in production, so the membership table is the real source of truth; the column
// is only a fallback.
const companyOwner = new Map();
for (const c of companies) {
  if (c.owner_user_id) companyOwner.set(c.id, c.owner_user_id);
}
for (const m of userCompanies) {
  if (m.role_in_company === "owner" && !m.deleted_at && !companyOwner.has(m.company_id)) {
    companyOwner.set(m.company_id, m.user_id);
  }
}

/** path -> { owner, tenderId, allowed:Set } */
const plan = new Map();

function claim(path, owner, tenderId = null, counterparty = null) {
  if (!path || !String(path).startsWith("/objects/") || !owner) return;
  const entry = plan.get(path) ?? { owner, tenderId, allowed: new Set() };
  entry.owner ??= owner;
  if (tenderId) entry.tenderId = tenderId;
  if (counterparty) entry.allowed.add(counterparty);
  plan.set(path, entry);
}

// Supplier bid documents: owned by the submitter, readable by the tender owner.
for (const o of offers) {
  const buyer = tenderById.get(o.tender_id)?.created_by ?? null;
  for (const f of [o.technical_file_url, o.financial_file_url, o.combined_file_url]) {
    claim(f, o.created_by, o.tender_id, buyer);
  }
}

// Purchase orders: owned by the uploader, readable by the tender owner.
for (const p of purchaseOrders) {
  const buyer = tenderById.get(p.tender_id)?.created_by ?? null;
  claim(p.file_url, p.uploaded_by, p.tender_id, buyer);
}

// Tender attachments: owned by the tender creator.
for (const t of tenders) {
  for (const a of Array.isArray(t.attachments) ? t.attachments : []) {
    claim(a?.url, t.created_by, t.id);
  }
}

// Company documents and profile assets: owned by the company owner.
for (const d of companyDocs) claim(d.file_url, companyOwner.get(d.company_id));
for (const p of companyProfiles) {
  claim(p.logo_url, companyOwner.get(p.company_id));
  claim(p.brochure_url, companyOwner.get(p.company_id));
}

// How many private objects exist in the bucket, for context.
const { data: privateTop } = await sb.storage
  .from("private-files")
  .list("uploads", { limit: 1000 });
const inBucket = (privateTop ?? []).length;

const rows = [...plan.entries()].map(([path, e]) => ({
  object_path: path,
  owner_id: e.owner,
  visibility: path.startsWith("/objects/uploads/") ? "private" : "public",
  tender_access:
    e.tenderId && e.allowed.size
      ? { tenderId: e.tenderId, allowedUserIds: [...e.allowed] }
      : null,
}));

console.log(`private objects in bucket : ${inBucket}`);
console.log(`recoverable (referenced)  : ${rows.length}`);
console.log(`left unowned (stay denied): ${inBucket - rows.filter((r) => r.visibility === "private").length}`);
console.log();
for (const r of rows) {
  const extra = r.tender_access ? ` +read:${r.tender_access.allowedUserIds.length}` : "";
  console.log(`  ${r.visibility.padEnd(7)} ${r.object_path}  owner=${r.owner_id.slice(0, 8)}…${extra}`);
}

if (!APPLY) {
  console.log("\nDry run — nothing written. Re-run with --apply.");
  process.exit(0);
}

const { error } = await sb
  .from("object_acl")
  .upsert(rows, { onConflict: "object_path" });
if (error) {
  console.error("\nFAILED:", error.message);
  process.exit(1);
}

const { count } = await sb
  .from("object_acl")
  .select("*", { count: "exact", head: true });
console.log(`\nWrote ${rows.length} ACL rows. object_acl now has ${count}.`);
