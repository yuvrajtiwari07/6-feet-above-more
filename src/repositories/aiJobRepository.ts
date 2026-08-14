// src/repositories/aiJobRepository.ts
// Raw SQL for ai_jobs / ai_job_items / gemini_usage — no business logic here.

import { query, queryOne } from '../lib/db';

export type AiJobType = 'discovery' | 'retag';
export type AiJobStatus = 'queued' | 'discovering' | 'curating' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type AiJobItemStatus = 'pending' | 'pending_review' | 'approved' | 'rejected_ai' | 'rejected_admin' | 'duplicate' | 'failed';

export interface AiJob {
  id: string;
  jobType: AiJobType;
  vertical: string;
  retailer: string | null;
  sourceUrl: string | null;
  status: AiJobStatus;
  nextPageUrl: string | null;
  urlsDiscovered: number;
  urlsProcessed: number;
  urlsImported: number;
  urlsDuplicate: number;
  urlsRejected: number;
  urlsFailed: number;
  errorMessage: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiJobItem {
  id: string;
  jobId: string;
  productUrl: string | null;
  productId: string | null;
  status: AiJobItemStatus;
  curatedJson: any;
  previousJson: any;
  rejectReason: string | null;
  approvedProductId: string | null;
  createdAt: string;
  updatedAt: string;
}

function rowToJob(row: any): AiJob {
  return {
    id: row.id,
    jobType: row.job_type,
    vertical: row.vertical,
    retailer: row.retailer,
    sourceUrl: row.source_url,
    status: row.status,
    nextPageUrl: row.next_page_url,
    urlsDiscovered: row.urls_discovered,
    urlsProcessed: row.urls_processed,
    urlsImported: row.urls_imported,
    urlsDuplicate: row.urls_duplicate,
    urlsRejected: row.urls_rejected,
    urlsFailed: row.urls_failed,
    errorMessage: row.error_message,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToItem(row: any): AiJobItem {
  return {
    id: row.id,
    jobId: row.job_id,
    productUrl: row.product_url,
    productId: row.product_id,
    status: row.status,
    curatedJson: row.curated_json,
    previousJson: row.previous_json,
    rejectReason: row.reject_reason,
    approvedProductId: row.approved_product_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const aiJobRepository = {
  async createJob(input: {
    jobType: AiJobType;
    vertical: string;
    retailer?: string | null;
    sourceUrl?: string | null;
    createdBy?: string | null;
  }): Promise<AiJob> {
    const row = await queryOne(
      `INSERT INTO ai_jobs (job_type, vertical, retailer, source_url, next_page_url, created_by)
       VALUES ($1, $2, $3, $4, $4, $5)
       RETURNING *`,
      [input.jobType, input.vertical, input.retailer ?? null, input.sourceUrl ?? null, input.createdBy ?? null]
    );
    return rowToJob(row);
  },

  async listJobs(jobType?: AiJobType): Promise<AiJob[]> {
    const rows = jobType
      ? await query('SELECT * FROM ai_jobs WHERE job_type = $1 ORDER BY created_at DESC LIMIT 50', [jobType])
      : await query('SELECT * FROM ai_jobs ORDER BY created_at DESC LIMIT 50');
    return rows.map(rowToJob);
  },

  async getJob(id: string): Promise<AiJob | null> {
    const row = await queryOne('SELECT * FROM ai_jobs WHERE id = $1', [id]);
    return row ? rowToJob(row) : null;
  },

  async setStatus(id: string, status: AiJobStatus, errorMessage?: string | null): Promise<void> {
    await query('UPDATE ai_jobs SET status = $2, error_message = $3 WHERE id = $1', [id, status, errorMessage ?? null]);
  },

  /**
   * Atomically claims the oldest job that's actively runnable, so two
   * overlapping ticks (e.g. a manual "Run now" firing during a scheduled
   * tick) never process the same job twice.
   */
  async claimNextRunnableJob(): Promise<AiJob | null> {
    const row = await queryOne(
      `UPDATE ai_jobs SET status = CASE WHEN status = 'queued' THEN 'discovering' ELSE status END
       WHERE id = (
         SELECT id FROM ai_jobs
         WHERE status IN ('queued', 'discovering', 'curating')
         ORDER BY updated_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    return row ? rowToJob(row) : null;
  },

  async updateJobCounters(id: string, delta: Partial<{
    urlsDiscovered: number; urlsProcessed: number; urlsImported: number;
    urlsDuplicate: number; urlsRejected: number; urlsFailed: number;
  }>, nextPageUrl?: string | null): Promise<void> {
    const cols: Record<string, string> = {
      urlsDiscovered: 'urls_discovered', urlsProcessed: 'urls_processed', urlsImported: 'urls_imported',
      urlsDuplicate: 'urls_duplicate', urlsRejected: 'urls_rejected', urlsFailed: 'urls_failed',
    };
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(cols)) {
      const val = (delta as any)[key];
      if (val) {
        sets.push(`${col} = ${col} + $${idx++}`);
        params.push(val);
      }
    }
    if (nextPageUrl !== undefined) {
      sets.push(`next_page_url = $${idx++}`);
      params.push(nextPageUrl);
    }
    if (sets.length === 0) return;
    params.push(id);
    await query(`UPDATE ai_jobs SET ${sets.join(', ')} WHERE id = $${idx}`, params);
  },

  async insertItems(jobId: string, urls: string[]): Promise<number> {
    if (urls.length === 0) return 0;
    let inserted = 0;
    for (const url of urls) {
      const rows = await query(
        `INSERT INTO ai_job_items (job_id, product_url) VALUES ($1, $2)
         ON CONFLICT (job_id, product_url) DO NOTHING
         RETURNING id`,
        [jobId, url]
      );
      if (rows.length > 0) inserted++;
    }
    return inserted;
  },

  async insertRetagItems(jobId: string, productIds: string[]): Promise<void> {
    for (const productId of productIds) {
      await query(
        `INSERT INTO ai_job_items (job_id, product_id) VALUES ($1, $2)`,
        [jobId, productId]
      );
    }
  },

  async claimPendingItems(jobId: string, limit: number): Promise<AiJobItem[]> {
    const rows = await query(
      `SELECT * FROM ai_job_items WHERE job_id = $1 AND status = 'pending' ORDER BY created_at ASC LIMIT $2`,
      [jobId, limit]
    );
    return rows.map(rowToItem);
  },

  async countPending(jobId: string): Promise<number> {
    const row = await queryOne(`SELECT COUNT(*)::int AS n FROM ai_job_items WHERE job_id = $1 AND status = 'pending'`, [jobId]);
    return row?.n ?? 0;
  },

  async updateItem(id: string, patch: {
    status: AiJobItemStatus;
    curatedJson?: any;
    previousJson?: any;
    rejectReason?: string | null;
    approvedProductId?: string | null;
  }): Promise<void> {
    await query(
      `UPDATE ai_job_items SET status = $2, curated_json = $3, previous_json = $4, reject_reason = $5, approved_product_id = $6
       WHERE id = $1`,
      [id, patch.status, JSON.stringify(patch.curatedJson ?? null), JSON.stringify(patch.previousJson ?? null), patch.rejectReason ?? null, patch.approvedProductId ?? null]
    );
  },

  async listItems(jobId: string, status?: AiJobItemStatus): Promise<AiJobItem[]> {
    const rows = status
      ? await query('SELECT * FROM ai_job_items WHERE job_id = $1 AND status = $2 ORDER BY created_at DESC', [jobId, status])
      : await query('SELECT * FROM ai_job_items WHERE job_id = $1 ORDER BY created_at DESC', [jobId]);
    return rows.map(rowToItem);
  },

  async getItem(id: string): Promise<AiJobItem | null> {
    const row = await queryOne('SELECT * FROM ai_job_items WHERE id = $1', [id]);
    return row ? rowToItem(row) : null;
  },

  // ── Gemini free-tier daily usage budget ─────────────────────
  async getTodayUsage(): Promise<number> {
    const row = await queryOne(
      `INSERT INTO gemini_usage (day, request_count) VALUES (CURRENT_DATE, 0)
       ON CONFLICT (day) DO NOTHING
       RETURNING request_count`
    );
    if (row) return row.request_count;
    const existing = await queryOne('SELECT request_count FROM gemini_usage WHERE day = CURRENT_DATE');
    return existing?.request_count ?? 0;
  },

  async incrementUsage(by = 1): Promise<void> {
    await query(
      `INSERT INTO gemini_usage (day, request_count) VALUES (CURRENT_DATE, $1)
       ON CONFLICT (day) DO UPDATE SET request_count = gemini_usage.request_count + $1`,
      [by]
    );
  },
};
