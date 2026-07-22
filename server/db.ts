import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";
import { SUPABASE_ROOT_CA } from './supabase-ca';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const connectionString = process.env.DATABASE_URL;
const url = new URL(connectionString);
const host = url.hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1';

// Every warm function instance holds its own pool, so a generous max multiplies
// across instances and can exhaust Postgres' connection limit. On serverless we
// point DATABASE_URL at Supabase's transaction-mode pooler (port 6543), which
// hands a connection back after each statement, so many instances can share the
// pooler's slots. That means the *local* pg pool should stay tiny: a couple of
// connections per instance is plenty for the few requests Fluid Compute runs
// concurrently, and keeps the total across instances well under the pooler cap.
const isServerless = !!process.env.VERCEL;

// Guard against the session-mode pooler (port 5432) in production: it holds one
// real Postgres connection per client for the whole session and is capped low
// (pool_size 15 on Supabase), so serverless traffic exhausts it — the cause of
// the EMAXCONNSESSION sign-in failures. Warn loudly rather than fail silently.
if (isServerless && !isLocal && url.port === '5432') {
  console.warn(
    '[db] DATABASE_URL uses the session-mode pooler (port 5432). ' +
    'Serverless should use the transaction pooler (port 6543) or connections will exhaust.',
  );
}

export const pool = new Pool({
  connectionString,
  // Supabase requires TLS and signs its certs with a private root CA, so the cert
  // has to be supplied explicitly for verification to succeed.
  ssl: isLocal ? undefined : { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
  max: isServerless ? 2 : 10,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const db = drizzle({ client: pool, schema });
