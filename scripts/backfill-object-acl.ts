/**
 * Rebuilds the object_acl table for files migrated from the old Replit/GCS
 * bucket. Those ACLs lived in Google Cloud custom object metadata and did not
 * survive the copy into Supabase Storage, so ownership is reconstructed from
 * the database rows that reference each file.
 *
 * Files that nothing references get no row and therefore stay inaccessible.
 *
 * Usage:
 *   npx tsx scripts/backfill-object-acl.ts          # dry run, prints plan
 *   npx tsx scripts/backfill-object-acl.ts --apply  # writes rows
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { pool, db } from '../server/db';

const APPLY = process.argv.includes('--apply');

// Each source maps a file path to the user who owns it, plus (where the file
// belongs to a tender exchange) the other users who must still be able to read
// it — the buyer needs to open the supplier's offer documents.
const SOURCES = sql`
  -- Supplier offer documents: owned by the submitter, readable by the tender owner.
  select o.technical_file_url as path, o.created_by as owner,
         o.tender_id as tender_id, t.created_by as counterparty
    from offers o join tenders t on t.id = o.tender_id
   where o.technical_file_url like '/objects/%'
  union all
  select o.financial_file_url, o.created_by, o.tender_id, t.created_by
    from offers o join tenders t on t.id = o.tender_id
   where o.financial_file_url like '/objects/%'
  union all
  select o.combined_file_url, o.created_by, o.tender_id, t.created_by
    from offers o join tenders t on t.id = o.tender_id
   where o.combined_file_url like '/objects/%'
  union all
  -- Purchase orders: owned by the uploader, readable by the tender owner.
  select p.file_url, p.uploaded_by, p.tender_id, t.created_by
    from purchase_orders p join tenders t on t.id = p.tender_id
   where p.file_url like '/objects/%'
  union all
  -- Tender attachments: owned by the tender creator.
  select a->>'url', t.created_by, t.id, null
    from tenders t, jsonb_array_elements(t.attachments) a
   where a->>'url' like '/objects/%'
  union all
  -- Company documents: owned by the company owner.
  select cd.file_url, c.owner_user_id, null, null
    from company_documents cd join companies c on c.id = cd.company_id
   where cd.file_url like '/objects/%'
  union all
  -- Company profile assets stored in the private uploads folder.
  select cp.brochure_url, c.owner_user_id, null, null
    from company_profiles cp join companies c on c.id = cp.company_id
   where cp.brochure_url like '/objects/%'
  union all
  select cp.logo_url, c.owner_user_id, null, null
    from company_profiles cp join companies c on c.id = cp.company_id
   where cp.logo_url like '/objects/%'
`;

async function main() {
  const planned: any = await db.execute(sql`
    with refs as (${SOURCES})
    select path,
           max(owner::text) as owner,
           max(tender_id::text) as tender_id,
           array_remove(array_agg(distinct counterparty::text), null) as allowed
      from refs
     where owner is not null
     group by path
  `);

  const rows = (planned as any).rows as Array<{
    path: string; owner: string; tender_id: string | null; allowed: string[];
  }>;

  const total: any = await db.execute(
    sql`select count(*)::int n from storage.objects where bucket_id = 'private-files'`,
  );
  const inBucket = (total as any).rows[0].n;

  console.log(`private files in bucket : ${inBucket}`);
  console.log(`recoverable (referenced): ${rows.length}`);
  console.log(`left unowned (deny)     : ${inBucket - rows.length}`);
  console.log();

  for (const r of rows) {
    const extra = r.allowed.length ? ` +read:${r.allowed.length}` : '';
    console.log(`  ${r.path}  owner=${r.owner.slice(0, 8)}…${extra}`);
  }

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these rows.');
    await pool.end();
    return;
  }

  let written = 0;
  for (const r of rows) {
    const tenderAccess =
      r.tender_id && r.allowed.length
        ? JSON.stringify({ tenderId: r.tender_id, allowedUserIds: r.allowed })
        : null;

    // Only the uploads/ folder is private; the rest live in the public bucket.
    const visibility = r.path.startsWith('/objects/uploads/') ? 'private' : 'public';

    await db.execute(sql`
      insert into object_acl (object_path, owner_id, visibility, tender_access)
      values (${r.path}, ${r.owner}, ${visibility}, ${tenderAccess}::jsonb)
      on conflict (object_path) do update set
        owner_id      = excluded.owner_id,
        visibility    = excluded.visibility,
        tender_access = excluded.tender_access
    `);
    written++;
  }

  console.log(`\nWrote ${written} ACL rows.`);
  await pool.end();
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
