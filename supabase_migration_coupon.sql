-- ============================================================
--  6FEETNABOVE — Coupon Code Migration
--  Replaces the fabricated "discount %" / "club price" concept with a real
--  coupon code the admin can paste from the retailer (or their own affiliate
--  program) for buyers to use at checkout. Non-breaking: additive column,
--  discount_percent column is left in place but the app stops using it.
--  Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Done!
-- Verify:
--   SELECT id, coupon_code FROM products WHERE coupon_code IS NOT NULL;
