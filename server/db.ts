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
const host = new URL(connectionString).hostname;
const isLocal = host === 'localhost' || host === '127.0.0.1';

export const pool = new Pool({
  connectionString,
  // Supabase requires TLS and signs its certs with a private root CA, so the cert
  // has to be supplied explicitly for verification to succeed.
  ssl: isLocal ? undefined : { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

export const db = drizzle({ client: pool, schema });
