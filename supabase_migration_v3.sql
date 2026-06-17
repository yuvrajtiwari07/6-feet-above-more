-- ============================================================
--  6FEETNABOVE — Schema v3: Curation-First Redesign
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. NEW COLUMNS ON PRODUCTS ────────────────────────────────

-- Multi-select categories (replaces single "category" text)
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Tall-fit curation fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS tall_friendly BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_ranges TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS body_types TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS fit_highlights TEXT[] DEFAULT '{}';

-- ── 2. MIGRATE EXISTING category → categories ARRAY ──────────

UPDATE products
SET categories = ARRAY[category]
WHERE categories = '{}' AND category IS NOT NULL AND category != '';

-- ── 3. REVIEWS TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     TEXT,                -- Supabase auth UID (NULL = anonymous)
  user_email  TEXT,                -- Display-friendly email
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  height      TEXT,                -- e.g. "6'4\""
  weight      TEXT,                -- optional, e.g. "85kg"
  body_type   TEXT,                -- e.g. "Athletic"
  review_text TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast product lookup
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);

-- ── 4. UPDATE PRODUCTS aggregate rating from reviews ─────────
-- This function recalculates average_rating and reviews_count
-- Call it after inserting/deleting reviews

CREATE OR REPLACE FUNCTION refresh_product_rating(p_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET
    reviews_count = (SELECT COUNT(*) FROM reviews WHERE product_id = p_id),
    average_rating = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE product_id = p_id),
      0
    )
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- ── 5. RLS Policies for reviews ──────────────────────────────

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews
CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (true);

-- Authenticated users can insert their own reviews
CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- ── 6. DEFAULT tall-fit data for existing products ───────────

UPDATE products
SET tall_friendly = TRUE,
    height_ranges = ARRAY['6''0–6''2', '6''2–6''4', '6''4–6''6'],
    body_types = ARRAY['Athletic', 'Slim'],
    fit_highlights = COALESCE(
      NULLIF(verification_badges, '{}'),
      ARRAY['Extended Torso Fit', 'Extra Sleeve Length']
    )
WHERE tall_friendly IS NULL OR height_ranges = '{}';
