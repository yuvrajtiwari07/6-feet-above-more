-- ============================================================
--  6FEETNABOVE — Consolidated Database Schema Migration
--  Includes product segments, types, categories, and reviews
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Enable UUID Extension ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. Add New Columns to Products Table ───────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_segment TEXT DEFAULT 'Upperwear';
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'T-Shirt';
ALTER TABLE products ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tall_friendly BOOLEAN DEFAULT TRUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height_ranges TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS body_types TEXT[] DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS fit_highlights TEXT[] DEFAULT '{}';

-- ── 3. Populate Segment / Type If Empty ────────────────────────
UPDATE products 
SET 
  product_segment = CASE 
    WHEN LOWER(category) = 'sneakers' THEN 'Footwear'
    WHEN LOWER(category) = 'ethnic wear' THEN 'Ethnic Wear'
    WHEN LOWER(category) = 'formals' THEN 'Upperwear'
    WHEN LOWER(category) = 'streetwear' THEN 'Upperwear'
    WHEN LOWER(category) = 'casuals' THEN 'Upperwear'
    ELSE 'Upperwear'
  END,
  product_type = CASE 
    WHEN LOWER(category) = 'sneakers' THEN 'Sneakers'
    WHEN LOWER(category) = 'ethnic wear' THEN 'Kurta'
    WHEN LOWER(category) = 'formals' THEN 'Shirt'
    WHEN LOWER(category) = 'streetwear' THEN 'T-Shirt'
    WHEN LOWER(category) = 'casuals' THEN 'T-Shirt'
    ELSE 'T-Shirt'
  END
WHERE product_segment IS NULL OR product_type IS NULL OR product_segment = '' OR product_type = '';

-- Make columns NOT NULL
ALTER TABLE products ALTER COLUMN product_segment SET NOT NULL;
ALTER TABLE products ALTER COLUMN product_type SET NOT NULL;

-- ── 4. Migrate Existing category to categories Array ─────────
UPDATE products
SET categories = ARRAY[category]
WHERE (categories = '{}' OR categories IS NULL) AND category IS NOT NULL AND category != '';

-- ── 5. Create Reviews Table ───────────────────────────────────
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

-- ── 6. Create Refresh Rating Function ─────────────────────────
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

-- ── 7. Enable RLS and Policies for Reviews ────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are publicly readable" ON reviews;
CREATE POLICY "Reviews are publicly readable"
  ON reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert reviews" ON reviews;
CREATE POLICY "Authenticated users can insert reviews"
  ON reviews FOR INSERT
  WITH CHECK (true);

-- ── 8. Default Curation Values for Existing Products ──────────
UPDATE products
SET tall_friendly = TRUE,
    height_ranges = ARRAY['6''0–6''2', '6''2–6''4', '6''4–6''6'],
    body_types = ARRAY['Athletic', 'Slim'],
    fit_highlights = COALESCE(
      NULLIF(verification_badges, '{}'),
      ARRAY['Extended Torso Fit', 'Extra Sleeve Length']
    )
WHERE tall_friendly IS NULL OR height_ranges = '{}';
