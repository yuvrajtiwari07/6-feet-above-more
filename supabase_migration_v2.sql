-- ============================================================
--  6FEETABOVE & MORE — Supabase Database Migration V2
--  Category-Aware Form & Database Schema Upgrade
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add new columns to products table if they don't exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_segment TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT;

-- 2. Populate product_segment and product_type based on existing category/sub_category
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
WHERE product_segment IS NULL OR product_type IS NULL;

-- Make product_segment and product_type NOT NULL with defaults for safety
ALTER TABLE products ALTER COLUMN product_segment SET DEFAULT 'Upperwear';
ALTER TABLE products ALTER COLUMN product_segment SET NOT NULL;
ALTER TABLE products ALTER COLUMN product_type SET DEFAULT 'T-Shirt';
ALTER TABLE products ALTER COLUMN product_type SET NOT NULL;

-- 3. Upgrade size elements: Convert old comma-separated strings inside arrays to clean arrays
-- e.g. '{"M, L, XL"}' -> '{"M", "L", "XL"}'
CREATE OR REPLACE FUNCTION clean_and_split_array(arr text[])
RETURNS text[] AS $$
DECLARE
  elem text;
  sub_elem text;
  result text[] := '{}';
BEGIN
  IF arr IS NULL THEN
    RETURN '{}';
  END IF;
  FOREACH elem IN ARRAY arr LOOP
    IF elem LIKE '%,%' THEN
      FOREACH sub_elem IN ARRAY string_to_array(elem, ',') LOOP
        result := array_append(result, trim(sub_elem));
      END LOOP;
    ELSE
      result := array_append(result, trim(elem));
    END IF;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

UPDATE products 
SET 
  sizes = clean_and_split_array(sizes),
  verification_badges = clean_and_split_array(verification_badges);

DROP FUNCTION clean_and_split_array(text[]);

-- 4. Convert measurements JSONB structure
-- Old structure: {"totalLength": 82, "sleeveLength": 71}
-- New structure: {"totalLength": {"value": 82, "unit": "cm"}, "sleeveLength": {"value": 71, "unit": "cm"}}
CREATE OR REPLACE FUNCTION migrate_measurements(old_m JSONB)
RETURNS JSONB AS $$
DECLARE
  key text;
  val numeric;
  result JSONB := '{}';
BEGIN
  IF old_m IS NULL OR old_m = '{}'::jsonb OR jsonb_typeof(old_m) != 'object' THEN
    RETURN '{}'::jsonb;
  END IF;

  FOR key IN SELECT jsonb_object_keys(old_m) LOOP
    -- If already migrated (value is an object containing 'value' and 'unit')
    IF jsonb_typeof(old_m->key) = 'object' AND (old_m->key)->>'value' IS NOT NULL THEN
      result := jsonb_set(result, array[key], old_m->key);
    ELSE
      -- Convert raw number value
      val := (old_m->>key)::numeric;
      IF val IS NOT NULL THEN
        result := jsonb_set(result, array[key], jsonb_build_object('value', val, 'unit', 'cm'));
      END IF;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

UPDATE products SET measurements = migrate_measurements(measurements);
DROP FUNCTION migrate_measurements(JSONB);

-- 5. Convert merchant_links JSONB structure
-- Old structure: [{"retailer": "Amazon", "url": "...", "price": 1999}]
-- New structure: [{"store": "Amazon", "url": "...", "price": 1999}]
CREATE OR REPLACE FUNCTION migrate_merchant_links(old_links JSONB)
RETURNS JSONB AS $$
DECLARE
  elem JSONB;
  result JSONB := '[]';
  store_val text;
BEGIN
  IF old_links IS NULL OR jsonb_typeof(old_links) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR elem IN SELECT jsonb_array_elements(old_links) LOOP
    store_val := COALESCE(elem->>'store', elem->>'retailer', '');
    result := jsonb_insert(
      result, 
      '{999999}', -- append to end
      jsonb_build_object(
        'store', store_val,
        'url', COALESCE(elem->>'url', ''),
        'price', COALESCE((elem->>'price')::numeric, 0)
      )
    );
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

UPDATE products SET merchant_links = migrate_merchant_links(merchant_links);
DROP FUNCTION migrate_merchant_links(JSONB);
