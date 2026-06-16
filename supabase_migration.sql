-- ============================================================
--  6FEETABOVE & MORE — Supabase Database Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
--  USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       TEXT UNIQUE NOT NULL,  -- Supabase auth UID
  email         TEXT NOT NULL,
  is_admin      BOOLEAN DEFAULT FALSE,
  height        TEXT DEFAULT '6''3"',
  body_type     TEXT DEFAULT 'Athletic',
  card_size     TEXT DEFAULT 'medium',
  saved_product_ids TEXT[] DEFAULT '{}',
  saved_fit_ids     TEXT[] DEFAULT '{}',
  preferences       JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
--  PRODUCTS TABLE (expanded schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id                   TEXT PRIMARY KEY,
  brand                TEXT NOT NULL,
  title                TEXT NOT NULL,
  category             TEXT NOT NULL,
  sub_category         TEXT,
  description          TEXT,
  fit_type             TEXT DEFAULT 'Regular Tall',
  retailer             TEXT NOT NULL DEFAULT '',
  affiliate_url        TEXT NOT NULL DEFAULT '',
  price_at_retailer    NUMERIC(10,2) NOT NULL DEFAULT 0,
  images               TEXT[] DEFAULT '{}',
  occasions            TEXT[] DEFAULT '{}',
  seasons              TEXT[] DEFAULT '{}',
  colors               TEXT[] DEFAULT '{}',
  sizes                TEXT[] DEFAULT '{}',
  verified_tier        TEXT NOT NULL DEFAULT 'community'
                         CHECK (verified_tier IN ('verified', 'friendly', 'community')),
  out_of_stock         BOOLEAN DEFAULT FALSE,
  verification_badges  TEXT[] DEFAULT '{}',
  merchant_links       JSONB DEFAULT '[]',
  custom_reviews       JSONB DEFAULT '[]',
  reviews_count        INT DEFAULT 0,
  average_rating       NUMERIC(3,2) DEFAULT 5.0,
  measurements         JSONB DEFAULT '{}',
  verdicts             JSONB DEFAULT '[]',

  -- NEW expanded columns
  material             TEXT,
  care_instructions    TEXT,
  weight_grams         INT,
  country_of_origin    TEXT DEFAULT 'India',
  tags                 TEXT[] DEFAULT '{}',
  discount_percent     NUMERIC(5,2) DEFAULT 0,
  is_featured          BOOLEAN DEFAULT FALSE,
  sku_code             TEXT,

  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand    ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_stock    ON products(out_of_stock);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================

-- Products: public read, service_role write (enforced via backend)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read products" ON products
  FOR SELECT USING (true);
CREATE POLICY "Service role can do all" ON products
  USING (auth.role() = 'service_role');

-- Users: authenticated users can read their own row; service_role does everything
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own row" ON users
  FOR SELECT USING (user_id = auth.uid()::text);
CREATE POLICY "Service role manages users" ON users
  USING (auth.role() = 'service_role');

-- ============================================================
--  AFFILIATE CLICKS LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  retailer     TEXT NOT NULL,
  affiliate_url TEXT NOT NULL,
  user_id      TEXT,
  ip_hash      TEXT,
  clicked_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_product ON affiliate_clicks(product_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON affiliate_clicks(clicked_at);

-- ============================================================
-- Done! Check tables with: SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- ============================================================
