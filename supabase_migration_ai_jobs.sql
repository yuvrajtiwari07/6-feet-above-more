-- ============================================================
--  6FEETABOVE & MORE — AI Discovery & Retag Jobs
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Fuzzy title matching for name-based duplicate detection
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);

-- ============================================================
--  AI_JOBS — a discovery crawl or a bulk retag run
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_jobs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type          TEXT NOT NULL CHECK (job_type IN ('discovery', 'retag')),
  vertical          TEXT NOT NULL DEFAULT 'fashion',
  retailer          TEXT,                    -- discovery only
  source_url        TEXT,                    -- discovery only: the listing/search page URL
  status            TEXT NOT NULL DEFAULT 'queued'
                      CHECK (status IN ('queued', 'discovering', 'curating', 'paused', 'completed', 'failed', 'cancelled')),
  next_page_url     TEXT,                    -- discovery pagination cursor; NULL once discovery phase is done
  urls_discovered   INT NOT NULL DEFAULT 0,
  urls_processed    INT NOT NULL DEFAULT 0,
  urls_imported     INT NOT NULL DEFAULT 0,  -- pending_review (discovery) or applied (retag)
  urls_duplicate    INT NOT NULL DEFAULT 0,
  urls_rejected     INT NOT NULL DEFAULT 0,
  urls_failed       INT NOT NULL DEFAULT 0,
  error_message     TEXT,
  created_by        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);

CREATE TRIGGER ai_jobs_updated_at
  BEFORE UPDATE ON ai_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  AI_JOB_ITEMS — one product URL (discovery) or one existing
--  product (retag) within a job
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_job_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id                UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
  product_url           TEXT,               -- discovery: scraped listing URL
  product_id            TEXT,               -- retag: existing products.id being re-tagged
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'pending_review', 'approved', 'rejected_ai', 'rejected_admin', 'duplicate', 'failed')),
  curated_json          JSONB,
  previous_json         JSONB,              -- retag: snapshot of prior tags/category for audit
  reject_reason         TEXT,
  approved_product_id   TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, product_url)
);

CREATE INDEX IF NOT EXISTS idx_ai_job_items_status ON ai_job_items(job_id, status);

CREATE TRIGGER ai_job_items_updated_at
  BEFORE UPDATE ON ai_job_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  GEMINI_USAGE — daily request counter (ticks are stateless
--  serverless invocations, so the free-tier budget has to live
--  in the DB rather than in-process memory)
-- ============================================================
CREATE TABLE IF NOT EXISTS gemini_usage (
  day             DATE PRIMARY KEY,
  request_count   INT NOT NULL DEFAULT 0
);
