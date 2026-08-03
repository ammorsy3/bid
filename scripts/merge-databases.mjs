#!/usr/bin/env node
/**
 * Merge one Bid database into another.
 *
 *   node scripts/merge-databases.mjs --source <url> --target <url> [--apply]
 *
 * Default is a DRY RUN: everything executes inside a transaction that is then
 * rolled back, so you see exactly what would happen — including any constraint
 * violation — without changing the target. Pass --apply to commit.
 *
 * Written for the eczogii -> qjwulf consolidation (see docs/db-merge-plan.md).
 * It takes connection strings as arguments specifically so the run that is
 * rehearsed against local scratch copies is the same code that later runs
 * against the real databases.
 *
 * Decisions encoded here (all confirmed by Ahmed, 2026-08-03):
 *   D-1  source wins on rows present in both
 *   D-2  keep both accounts for the 4 duplicated humans; rename the TARGET's
 *        dormant email to +legacy, then move its content to the real account
 *   D-3  keep the source's companies.slug, rename the target's
 *   D-4  same for company_profiles.traction_slug
 *   D-5  the disputed account ends up admin (source already has is_admin=true)
 *   D-6  keep abdulrahman@seet-marketing.com (source value)
 *   D-7  companies.owner_user_id — target is NULL on all shared rows, so this
 *        fills blanks rather than overwriting
 *   D-8  6 tenders differ on status; source is correct (all long past deadline)
 *   D-9  skip error_logs and product_events entirely
 */

import pg from "pg";

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i === -1 ? null : args[i + 1]; };
const SOURCE = arg("--source");
const TARGET = arg("--target");
const APPLY = args.includes("--apply");

if (!SOURCE || !TARGET) {
  console.error("usage: merge-databases.mjs --source <url> --target <url> [--apply]");
  process.exit(2);
}

// Insert order matters: parents before children, or the foreign keys reject the
// row. Derived from the 78 FK constraints in the schema.
const TABLE_ORDER = [
  "users",
  "companies",
  "company_profiles",
  "user_companies",
  "company_documents",
  "tenders",
  "offers",
  "offer_views",
  "proposal_analyses",
  "tender_savings",
  "tender_questions",
  "tender_templates",
  "purchase_orders",
  "awards",
  "negotiation_actions",
  "invitations",
  "vendors_base",
  "join_requests",
  "membership_requests",
  "team_invitations",
  "invitation_links",
  "trusted_browsers",
  "tour_progress",
  "notification_preferences",
  "api_keys",
  "integrations",
  "admin_notifications",
  "audit_log",
  "member_activity_log",
  "ai_chat_sessions",
  "ai_chat_messages",
];

// D-9: append-only history nobody reads day to day. ~2,500 rows, most of the FK
// risk, no operational value.
const SKIP_TABLES = new Set(["error_logs", "product_events"]);

// D-2: the four humans holding an account in each database.
// `email` is the shared address; source keeps it, target's copy is renamed.
const DUPLICATE_HUMANS = [
  { email: "info@bidapp.sa" },
  { email: "a.farag@builtcorrectly.org" },
  { email: "ahmed.farag@bookedbycold.com" },
  { email: "akams901@gmail.com" },
];

// Every column that points at users.id, so a remapped account takes its content
// with it (D-2: move the dormant account's data to the real one).
const USER_FK_COLUMNS = [
  ["companies", "owner_user_id"],
  ["user_companies", "user_id"],
  ["user_companies", "invited_by"],
  ["company_documents", "uploaded_by"],
  ["tenders", "created_by"],
  ["offers", "created_by"],
  ["offer_views", "viewed_by"],
  ["awards", "awarded_by"],
  ["join_requests", "user_id"],
  ["join_requests", "reviewed_by"],
  ["membership_requests", "user_id"],
  ["team_invitations", "invited_by"],
  ["invitation_links", "created_by"],
  ["trusted_browsers", "user_id"],
  ["tour_progress", "user_id"],
  ["notification_preferences", "user_id"],
  ["api_keys", "created_by"],
  ["audit_log", "admin_id"],
  ["member_activity_log", "actor_user_id"],
  ["ai_chat_sessions", "user_id"],
  ["negotiation_actions", "actor_user_id"],
];

const log = (...a) => console.log(...a);
const section = (t) => log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

async function columnsOf(client, table) {
  const { rows } = await client.query(
    `select column_name from information_schema.columns
      where table_schema='public' and table_name=$1 order by ordinal_position`, [table]);
  return rows.map((r) => r.column_name);
}

/**
 * Map of column -> data_type, used to fix jsonb handling.
 *
 * node-postgres infers the wire format from the JS value, not the column type.
 * A JS array bound to a `jsonb` column is serialised as a POSTGRES array
 * literal (`{a,b}`) rather than JSON (`["a","b"]`), which Postgres rejects with
 * `invalid input syntax for type json`. company_profiles alone has ten jsonb
 * columns holding arrays (tags, service_areas, portfolio, …). So json/jsonb
 * values must be stringified explicitly before binding.
 *
 * Genuine Postgres array columns (e.g. tenders.target_audience_types text[])
 * must NOT be stringified — node-postgres already handles those correctly.
 */
async function typesOf(client, table) {
  const { rows } = await client.query(
    `select column_name, data_type from information_schema.columns
      where table_schema='public' and table_name=$1`, [table]);
  return Object.fromEntries(rows.map((r) => [r.column_name, r.data_type]));
}

const bindValue = (types, col, v) =>
  v !== null && v !== undefined && (types[col] === "json" || types[col] === "jsonb")
    ? JSON.stringify(v)
    : v;

/**
 * Run one statement inside a savepoint so a single bad row cannot poison the
 * whole transaction. Without this, the first failure makes every later
 * statement fail with "current transaction is aborted", hiding the real errors
 * behind a cascade and forcing one-error-per-run debugging.
 */
async function tryRow(client, sql, params) {
  await client.query("SAVEPOINT r");
  try {
    await client.query(sql, params);
    await client.query("RELEASE SAVEPOINT r");
    return null;
  } catch (e) {
    await client.query("ROLLBACK TO SAVEPOINT r");
    return e.message.split("\n")[0];
  }
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `select 1 from information_schema.tables
      where table_schema='public' and table_name=$1 and table_type='BASE TABLE'`, [table]);
  return rows.length > 0;
}

async function hasIdColumn(client, table) {
  return (await columnsOf(client, table)).includes("id");
}

async function main() {
  const src = new pg.Client({ connectionString: SOURCE });
  const tgt = new pg.Client({ connectionString: TARGET });
  await src.connect();
  await tgt.connect();

  // Supabase defaults bite here, and neither shows up when rehearsing locally:
  //
  //   statement_timeout = 2min — fine for app queries, but this merge holds one
  //     long transaction and a statement that waits on a lock gets cancelled
  //     mid-run, aborting everything.
  //
  //   idle_in_transaction_session_timeout = 0 — an abandoned transaction holds
  //     its row locks FOREVER. When a run is interrupted (a timeout, a dropped
  //     connection), the next run blocks on those locks until it too is
  //     cancelled. Exactly what happened on 2026-08-03: a killed run left a
  //     session idle-in-transaction for 15 minutes holding locks on users.
  //
  // So: no statement timeout for our own work, and a 5-minute self-destruct on
  // an idle transaction so a dead run cleans up after itself.
  for (const c of [src, tgt]) {
    await c.query("set statement_timeout = 0");
    await c.query("set idle_in_transaction_session_timeout = '5min'");
  }

  log(APPLY
    ? "MODE: APPLY — changes will be COMMITTED to the target"
    : "MODE: DRY RUN — everything is rolled back at the end");

  const stats = { inserted: {}, updated: {}, renamed: [], remapped: [], skipped: [], failures: [] };

  await tgt.query("BEGIN");
  try {
    // ── Preflight: schemas must match, or inserts silently lose columns ──────
    section("PREFLIGHT");
    let mismatches = 0;
    for (const t of TABLE_ORDER) {
      if (!(await tableExists(src, t)) || !(await tableExists(tgt, t))) {
        log(`  ! ${t}: missing on one side — skipping`);
        stats.skipped.push(t);
        continue;
      }
      // Compare the SET of columns, not their order. Every insert and update
      // below names its columns explicitly, so physical order is irrelevant —
      // and it legitimately differs here: dropping and re-adding a column moves
      // it to the end of the table (companies.national_id_number, 2026-08-02).
      const a = [...(await columnsOf(src, t))].sort();
      const b = [...(await columnsOf(tgt, t))].sort();
      const onlySrc = a.filter((c) => !b.includes(c));
      const onlyTgt = b.filter((c) => !a.includes(c));
      if (onlySrc.length || onlyTgt.length) {
        log(`  ! ${t}: COLUMN MISMATCH  source-only=[${onlySrc}]  target-only=[${onlyTgt}]`);
        mismatches++;
      }
    }
    log(mismatches === 0 ? "  schemas match on every table" : `  ${mismatches} mismatched table(s)`);
    if (mismatches > 0) throw new Error("schema mismatch — aborting");

    // ── D-2 step 1: free up the duplicated emails on the target ─────────────
    section("D-2  rename duplicate accounts on the target to +legacy");
    const remap = []; // { fromId (target dormant), toId (source real), email }
    for (const { email } of DUPLICATE_HUMANS) {
      const s = await src.query("select id from users where email=$1", [email]);
      const t = await tgt.query("select id from users where email=$1", [email]);
      if (!s.rows.length || !t.rows.length) { log(`  - ${email}: not duplicated, nothing to do`); continue; }
      const srcId = s.rows[0].id, tgtId = t.rows[0].id;
      if (srcId === tgtId) { log(`  - ${email}: same id both sides, no conflict`); continue; }
      const [local, domain] = email.split("@");
      const legacy = `${local}+legacy@${domain}`;
      await tgt.query("update users set email=$1 where id=$2", [legacy, tgtId]);
      log(`  ✓ ${email}\n      target ${tgtId.slice(0, 8)}… -> ${legacy}\n      content will move to ${srcId.slice(0, 8)}…`);
      stats.renamed.push(`${email} -> ${legacy}`);
      remap.push({ fromId: tgtId, toId: srcId, email });
    }

    // ── D-3 / D-4: free up slugs the source is bringing with it ─────────────
    section("D-3/D-4  rename colliding slugs on the target");
    for (const [table, col] of [["companies", "slug"], ["company_profiles", "traction_slug"]]) {
      const { rows } = await src.query(`select id, ${col} as v from ${table} where ${col} is not null`);
      for (const r of rows) {
        const clash = await tgt.query(`select id from ${table} where ${col}=$1 and id<>$2`, [r.v, r.id]);
        if (!clash.rows.length) continue;
        const legacy = `${r.v}-legacy`;
        await tgt.query(`update ${table} set ${col}=$1 where id=$2`, [legacy, clash.rows[0].id]);
        log(`  ✓ ${table}.${col}: "${r.v}" kept for source; target ${clash.rows[0].id.slice(0, 8)}… -> "${legacy}"`);
        stats.renamed.push(`${table}.${col} ${r.v} -> ${legacy}`);
      }
    }

    // ── Insert rows that exist only in the source ──────────────────────────
    section("INSERT rows present only in the source");
    for (const t of TABLE_ORDER) {
      if (SKIP_TABLES.has(t) || stats.skipped.includes(t)) continue;
      if (!(await hasIdColumn(src, t))) { log(`  - ${t}: no id column, needs manual handling`); stats.skipped.push(t); continue; }

      const cols = await columnsOf(src, t);
      const tgtIds = new Set((await tgt.query(`select id from "${t}"`)).rows.map((r) => r.id));
      const { rows } = await src.query(`select * from "${t}"`);
      const missing = rows.filter((r) => !tgtIds.has(r.id));
      if (!missing.length) { log(`  · ${t}: nothing to insert`); continue; }

      const types = await typesOf(src, t);
      const list = cols.map((c) => `"${c}"`).join(",");
      const ph = cols.map((_, i) => `$${i + 1}`).join(",");
      let ok = 0; const errs = [];
      for (const row of missing) {
        const err = await tryRow(tgt, `insert into "${t}" (${list}) values (${ph}) on conflict do nothing`,
          cols.map((c) => bindValue(types, c, row[c])));
        if (err) errs.push(`${String(row.id).slice(0, 8)}…: ${err}`); else ok++;
      }
      stats.inserted[t] = ok;
      log(`  ${errs.length ? "✗" : "✓"} ${t}: inserted ${ok}/${missing.length}`);
      for (const e of errs.slice(0, 3)) log(`      ${e}`);
      if (errs.length > 3) log(`      … and ${errs.length - 3} more`);
      if (errs.length) stats.failures.push(`${t}: ${errs.length} insert(s) failed`);
    }

    // ── D-1: source wins where both have the row ───────────────────────────
    section("D-1  update rows present in both (source wins)");
    for (const t of TABLE_ORDER) {
      if (SKIP_TABLES.has(t) || stats.skipped.includes(t)) continue;
      const cols = (await columnsOf(src, t)).filter((c) => c !== "id");
      if (!cols.length) continue;
      const tgtIds = new Set((await tgt.query(`select id from "${t}"`)).rows.map((r) => r.id));
      const { rows } = await src.query(`select * from "${t}"`);
      const shared = rows.filter((r) => tgtIds.has(r.id));
      if (!shared.length) continue;

      const types = await typesOf(src, t);
      const set = cols.map((c, i) => `"${c}"=$${i + 1}`).join(",");
      let n = 0; const errs = [];
      for (const row of shared) {
        const err = await tryRow(tgt, `update "${t}" set ${set} where id=$${cols.length + 1}`,
          [...cols.map((c) => bindValue(types, c, row[c])), row.id]);
        if (err) errs.push(`${String(row.id).slice(0, 8)}…: ${err}`); else n++;
      }
      stats.updated[t] = n;
      log(`  ${errs.length ? "✗" : "✓"} ${t}: updated ${n}/${shared.length}`);
      for (const e of errs.slice(0, 3)) log(`      ${e}`);
      if (errs.length > 3) log(`      … and ${errs.length - 3} more`);
      if (errs.length) stats.failures.push(`${t}: ${errs.length} update(s) failed`);
    }

    // ── D-2 step 2: move the dormant accounts' content to the real account ──
    section("D-2  move dormant-account content to the real account");
    for (const { fromId, toId, email } of remap) {
      let moved = 0, dropped = 0;
      for (const [table, col] of USER_FK_COLUMNS) {
        if (!(await tableExists(tgt, table))) continue;
        const cols = await columnsOf(tgt, table);
        if (!cols.includes(col)) continue;

        // Move row by row rather than in one UPDATE. Some tables carry a
        // composite unique constraint that includes the user column — e.g.
        // tour_progress is UNIQUE(user_id, tour_id) — so if BOTH accounts have
        // an equivalent row, repointing one onto the other collides. When that
        // happens the dormant row is redundant by definition (the real account
        // already has the same fact recorded), so it is deleted rather than
        // aborting the merge. Anything that fails for any OTHER reason is
        // reported and left alone.
        const hasId = cols.includes("id");
        const { rows } = await tgt.query(
          `select ${hasId ? "id" : "ctid as id"} from "${table}" where "${col}"=$1`, [fromId]);
        if (!rows.length) continue;

        let m = 0, d = 0;
        for (const r of rows) {
          const key = hasId ? "id" : "ctid";
          const err = await tryRow(tgt,
            `update "${table}" set "${col}"=$1 where ${key}=$2`, [toId, r.id]);
          if (!err) { m++; continue; }
          if (/duplicate key|unique constraint/i.test(err)) {
            const delErr = await tryRow(tgt, `delete from "${table}" where ${key}=$1`, [r.id]);
            if (!delErr) { d++; } else log(`      ! ${table}: ${delErr}`);
          } else {
            log(`      ! ${table}.${col}: ${err}`);
            stats.failures.push(`${table}.${col}: ${err}`);
          }
        }
        if (m || d) log(`    ${table}.${col}: moved ${m}${d ? `, dropped ${d} duplicate(s)` : ""}`);
        moved += m; dropped += d;
      }
      log(`  ✓ ${email}: moved ${moved} record(s) to ${toId.slice(0, 8)}…${dropped ? `, dropped ${dropped} redundant duplicate(s)` : ""}`);
      stats.remapped.push(`${email}: ${moved} moved, ${dropped} dropped`);
    }

    // ── Verify ─────────────────────────────────────────────────────────────
    section("VERIFY");
    for (const t of ["users", "companies", "company_profiles", "user_companies", "tenders", "offers"]) {
      const n = (await tgt.query(`select count(*)::int c from "${t}"`)).rows[0].c;
      log(`  ${t.padEnd(20)} ${n}`);
    }
    const orphans = await tgt.query(`
      select 'user_companies.user_id' k, count(*)::int c from user_companies uc
        left join users u on u.id=uc.user_id where u.id is null
      union all select 'user_companies.company_id', count(*)::int from user_companies uc
        left join companies c on c.id=uc.company_id where c.id is null
      union all select 'tenders.company_id', count(*)::int from tenders t
        left join companies c on c.id=t.company_id where t.company_id is not null and c.id is null
      union all select 'offers.tender_id', count(*)::int from offers o
        left join tenders t on t.id=o.tender_id where t.id is null
      union all select 'company_profiles.company_id', count(*)::int from company_profiles p
        left join companies c on c.id=p.company_id where c.id is null`);
    log("\n  orphaned references (must all be 0):");
    let bad = 0;
    for (const r of orphans.rows) { log(`    ${r.k.padEnd(32)} ${r.c}`); if (r.c > 0) bad++; }
    log(bad === 0 ? "\n  ✓ no orphaned references" : `\n  ✗ ${bad} orphan class(es) — DO NOT APPLY`);

    if (APPLY && bad === 0) { await tgt.query("COMMIT"); log("\nCOMMITTED."); }
    else if (APPLY) { await tgt.query("ROLLBACK"); log("\nROLLED BACK — orphans present."); }
    else { await tgt.query("ROLLBACK"); log("\nROLLED BACK (dry run). Re-run with --apply to commit."); }
  } catch (e) {
    await tgt.query("ROLLBACK");
    log(`\nABORTED, rolled back: ${e.message}`);
    process.exitCode = 1;
  } finally {
    await src.end(); await tgt.end();
  }
}

main();
