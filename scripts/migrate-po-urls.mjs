#!/usr/bin/env node
// One-shot migration to rewrite legacy purchase_orders.file_url values from the
// raw bucket-path form (`/<bucket>/.private/uploads/<uuid>`) to the canonical
// `/objects/<entity-id>` form. Originated in BID-126: PO uploads used to skip
// `/api/objects/metadata`, which left them with raw bucket paths instead of
// the canonical entity path that every other upload flow stores.
//
// Usage:
//   DRY-RUN (default — prints planned updates, makes no changes):
//     node scripts/migrate-po-urls.mjs
//
//   APPLY (writes to the DB; requires DATABASE_URL):
//     node scripts/migrate-po-urls.mjs --apply
//
// Idempotent: rows already in `/objects/...` form are skipped. Rows whose path
// shape is not recognized are reported and left untouched.

import { neon } from '@neondatabase/serverless';

const APPLY = process.argv.includes('--apply');
const DATABASE_URL = process.env.DATABASE_URL;
const PRIVATE_OBJECT_DIR = process.env.PRIVATE_OBJECT_DIR;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Run from a shell with the env loaded (Replit secrets / .env).');
  process.exit(2);
}
if (!PRIVATE_OBJECT_DIR) {
  console.error('PRIVATE_OBJECT_DIR not set. Needed to map raw bucket paths to canonical /objects/<id>.');
  process.exit(2);
}

const privateDir = PRIVATE_OBJECT_DIR.endsWith('/')
  ? PRIVATE_OBJECT_DIR.slice(0, -1)
  : PRIVATE_OBJECT_DIR;

function normalize(rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) return { kind: 'empty' };
  if (rawPath.startsWith('/objects/')) return { kind: 'already_canonical' };
  if (rawPath.startsWith(privateDir + '/')) {
    const entityId = rawPath.slice(privateDir.length + 1);
    return { kind: 'rewrite', next: `/objects/${entityId}` };
  }
  if (rawPath.startsWith('https://storage.googleapis.com/')) {
    // Full presigned URL leaked into DB. Strip query, then try as raw path.
    const u = new URL(rawPath);
    const inner = u.pathname;
    if (inner.startsWith(privateDir + '/')) {
      const entityId = inner.slice(privateDir.length + 1);
      return { kind: 'rewrite', next: `/objects/${entityId}` };
    }
  }
  return { kind: 'unknown' };
}

const sql = neon(DATABASE_URL);
const rows = await sql`SELECT id, file_url FROM purchase_orders ORDER BY created_at`;

const buckets = { rewrite: [], already_canonical: [], empty: [], unknown: [] };
for (const row of rows) {
  const result = normalize(row.file_url);
  buckets[result.kind].push({ id: row.id, current: row.file_url, next: result.next });
}

console.log(`Total purchase_orders rows: ${rows.length}`);
console.log(`  Already canonical (skip): ${buckets.already_canonical.length}`);
console.log(`  Empty file_url (skip):    ${buckets.empty.length}`);
console.log(`  Unknown shape (report):   ${buckets.unknown.length}`);
console.log(`  Will rewrite:             ${buckets.rewrite.length}`);
console.log('');

if (buckets.unknown.length > 0) {
  console.log('Rows with unknown URL shape (left untouched, manual review):');
  for (const r of buckets.unknown) {
    console.log(`  ${r.id}  ${r.current}`);
  }
  console.log('');
}

if (buckets.rewrite.length === 0) {
  console.log('Nothing to rewrite.');
  process.exit(0);
}

console.log('Planned rewrites:');
for (const r of buckets.rewrite.slice(0, 20)) {
  console.log(`  ${r.id}`);
  console.log(`    from: ${r.current}`);
  console.log(`    to:   ${r.next}`);
}
if (buckets.rewrite.length > 20) {
  console.log(`  ... and ${buckets.rewrite.length - 20} more`);
}
console.log('');

if (!APPLY) {
  console.log('Dry-run only. Re-run with --apply to write changes.');
  process.exit(0);
}

console.log('Applying rewrites...');
let written = 0;
for (const r of buckets.rewrite) {
  await sql`UPDATE purchase_orders SET file_url = ${r.next} WHERE id = ${r.id}`;
  written++;
  if (written % 50 === 0) console.log(`  ${written}/${buckets.rewrite.length}`);
}
console.log(`Done. ${written} rows updated.`);
