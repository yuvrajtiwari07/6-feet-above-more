// src/lib/db.ts
// PostgreSQL connection pool pointing to Supabase
// Configured to be serverless-friendly (safe for Vercel)

import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

let poolInstance: Pool | null = null;

function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('[DB] DATABASE_URL environment variable is required but was not found.');
    }

    poolInstance = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // Required for Supabase hosted Postgres
      },
      max: 4, // Reduced for serverless to prevent connection exhaustion
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 5000,
    });

    poolInstance.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
  }
  return poolInstance;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
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
