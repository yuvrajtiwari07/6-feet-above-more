-- ============================================================
--  6FEETNABOVE — Verticals Migration (Fashion + Wellness)
--  Adds the second storefront: nutrition, body care & health care.
--  Everything that exists today is backfilled to 'fashion', so this
--  migration is non-breaking.
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Vertical column on products ────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS vertical TEXT NOT NULL DEFAULT 'fashion';

UPDATE products SET vertical = 'fashion' WHERE vertical IS NULL OR vertical = '';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vertical_check;
ALTER TABLE products ADD CONSTRAINT products_vertical_check
  CHECK (vertical IN ('fashion', 'wellness'));

CREATE INDEX IF NOT EXISTS idx_products_vertical ON products(vertical);

-- ── 2. Wellness-only attribute columns ────────────────────────
-- Deliberately few. Fashion rows leave these empty; wellness rows
-- leave the tall-fit / sizing columns empty instead.
ALTER TABLE products ADD COLUMN IF NOT EXISTS form            TEXT;        -- Powder, Capsule, Gummy, Serum, Oil, Cream…
ALTER TABLE products ADD COLUMN IF NOT EXISTS net_quantity    TEXT;        -- "60 capsules", "1 kg", "100 ml"
ALTER TABLE products ADD COLUMN IF NOT EXISTS concerns        TEXT[] DEFAULT '{}';  -- Hair Fall, Acne, Immunity…
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_ingredients TEXT[] DEFAULT '{}';  -- Whey Isolate, Niacinamide…
ALTER TABLE products ADD COLUMN IF NOT EXISTS diet_tags       TEXT[] DEFAULT '{}';  -- Vegan, Sugar Free, Veg…

-- ── 3. Verticals on catalogs ──────────────────────────────────
ALTER TABLE catalog_categories ADD COLUMN IF NOT EXISTS vertical TEXT NOT NULL DEFAULT 'fashion';
ALTER TABLE catalogs           ADD COLUMN IF NOT EXISTS vertical TEXT NOT NULL DEFAULT 'fashion';

ALTER TABLE catalog_categories DROP CONSTRAINT IF EXISTS catalog_categories_vertical_check;
ALTER TABLE catalog_categories ADD CONSTRAINT catalog_categories_vertical_check
  CHECK (vertical IN ('fashion', 'wellness'));

ALTER TABLE catalogs DROP CONSTRAINT IF EXISTS catalogs_vertical_check;
ALTER TABLE catalogs ADD CONSTRAINT catalogs_vertical_check
  CHECK (vertical IN ('fashion', 'wellness'));

CREATE INDEX IF NOT EXISTS idx_catalog_cat_vertical ON catalog_categories(vertical);
CREATE INDEX IF NOT EXISTS idx_catalogs_vertical    ON catalogs(vertical);

-- ── 4. Relax fashion-only NOT NULLs for wellness rows ─────────
-- Wellness products have no fit type; keep the column but allow blanks.
ALTER TABLE products ALTER COLUMN fit_type DROP NOT NULL;

-- Wellness rows should not inherit the tall-fit default.
ALTER TABLE products ALTER COLUMN tall_friendly SET DEFAULT FALSE;
UPDATE products SET tall_friendly = FALSE, height_ranges = '{}', body_types = '{}', fit_highlights = '{}'
WHERE vertical = 'wellness';

-- Done!
-- Verify:
--   SELECT vertical, COUNT(*) FROM products GROUP BY vertical;
