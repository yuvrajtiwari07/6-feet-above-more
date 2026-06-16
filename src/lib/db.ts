// src/lib/db.ts
// PostgreSQL connection pool pointing to Supabase
// Uses the session-mode pooler for IPv4 compatibility

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('[DB] DATABASE_URL environment variable is required');
}

export const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase hosted Postgres
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

// Test connection on startup (non-fatal)
pool.connect()
  .then(client => {
    client.query('SELECT 1').then(() => {
      console.log('[DB] ✅ Connected to Supabase PostgreSQL');
      client.release();
    }).catch(err => {
      console.error('[DB] ⚠️  DB connected but query failed:', err.message);
      client.release();
    });
  })
  .catch(err => {
    console.error('[DB] ⚠️  Could not connect to database:', err.message);
    console.error('[DB]    Run the migration SQL in Supabase Dashboard first.');
    console.error('[DB]    URL: https://supabase.com/dashboard/project/vhbyngwstjszztlmwyma/sql/new');
  });

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[]
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
