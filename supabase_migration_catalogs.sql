-- ============================================================
--  6FEETNABOVE — Catalog Feature Migration
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Catalog Categories (admin-managed)
CREATE TABLE IF NOT EXISTS catalog_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_cat_active ON catalog_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_catalog_cat_order  ON catalog_categories(sort_order);

-- Catalogs
CREATE TABLE IF NOT EXISTS catalogs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  slug          TEXT UNIQUE NOT NULL,
  description   TEXT,
  category_id   UUID REFERENCES catalog_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  cover_image   TEXT,
  product_ids   TEXT[] DEFAULT '{}',
  affiliate_url TEXT,
  is_published  BOOLEAN DEFAULT TRUE,
  sort_order    INT DEFAULT 0,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogs_category  ON catalogs(category_name);
CREATE INDEX IF NOT EXISTS idx_catalogs_published ON catalogs(is_published);
CREATE INDEX IF NOT EXISTS idx_catalogs_order     ON catalogs(sort_order);

-- Auto-update updated_at trigger
CREATE TRIGGER catalogs_updated_at
  BEFORE UPDATE ON catalogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Catalogs
ALTER TABLE catalogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published catalogs"
  ON catalogs FOR SELECT USING (is_published = true);
CREATE POLICY "Service role manages catalogs"
  ON catalogs USING (auth.role() = 'service_role');

-- RLS: Catalog Categories
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active catalog categories"
  ON catalog_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Service role manages catalog categories"
  ON catalog_categories USING (auth.role() = 'service_role');

-- Done!
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
