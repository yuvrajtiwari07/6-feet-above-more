// src/repositories/productRepository.ts
// All raw SQL queries for the products table — no business logic here

import { query, queryOne } from '../lib/db';
import { Product } from '../types';

// DB row → Product type mapper
function rowToProduct(row: any): Product {
  return {
    id:                  row.id,
    brand:               row.brand,
    title:               row.title,
    category:            row.category,
    subCategory:         row.sub_category,
    productSegment:      row.product_segment ?? 'Upperwear',
    productType:         row.product_type ?? 'T-Shirt',
    description:         row.description,
    fitType:             row.fit_type,
    retailer:            row.retailer,
    affiliateUrl:        row.affiliate_url,
    priceAtRetailer:     Number(row.price_at_retailer),
    images:              row.images ?? [],
    occasions:           row.occasions ?? [],
    seasons:             row.seasons ?? [],
    colors:              row.colors ?? [],
    sizes:               row.sizes ?? [],
    verifiedTier:        row.verified_tier,
    outOfStock:          row.out_of_stock,
    verificationBadges:  row.verification_badges ?? [],
    merchantLinks:       row.merchant_links ?? [],
    customReviews:       row.custom_reviews ?? [],
    reviewsCount:        row.reviews_count,
    averageRating:       Number(row.average_rating),
    measurements:        row.measurements ?? {},
    verdicts:            row.verdicts ?? [],
    // New expanded fields
    material:            row.material,
    careInstructions:    row.care_instructions,
    weightGrams:         row.weight_grams,
    countryOfOrigin:     row.country_of_origin,
    tags:                row.tags ?? [],
    discountPercent:     Number(row.discount_percent ?? 0),
    isFeatured:          row.is_featured,
    skuCode:             row.sku_code,
  };
}

export const productRepository = {
  async findAll(filters?: {
    category?: string;
    brand?: string;
    search?: string;
    isFeatured?: boolean;
  }): Promise<Product[]> {
    let text = 'SELECT * FROM products WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (filters?.category) {
      text += ` AND LOWER(category) = LOWER($${idx++})`;
      params.push(filters.category);
    }
    if (filters?.brand) {
      text += ` AND LOWER(brand) = LOWER($${idx++})`;
      params.push(filters.brand);
    }
    if (filters?.search) {
      text += ` AND (LOWER(title) LIKE $${idx} OR LOWER(brand) LIKE $${idx} OR LOWER(category) LIKE $${idx} OR LOWER(product_segment) LIKE $${idx} OR LOWER(product_type) LIKE $${idx})`;
      params.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }
    if (filters?.isFeatured !== undefined) {
      text += ` AND is_featured = $${idx++}`;
      params.push(filters.isFeatured);
    }

    text += ' ORDER BY created_at DESC';
    const rows = await query(text, params);
    return rows.map(rowToProduct);
  },

  async findById(id: string): Promise<Product | null> {
    const row = await queryOne(
      'SELECT * FROM products WHERE id = $1',
      [id]
    );
    return row ? rowToProduct(row) : null;
  },

  async create(p: Product): Promise<Product> {
    const text = `
      INSERT INTO products (
        id, brand, title, category, sub_category, product_segment, product_type,
        description, fit_type, retailer, affiliate_url, price_at_retailer,
        images, occasions, seasons, colors, sizes, verified_tier, out_of_stock,
        verification_badges, merchant_links, custom_reviews, reviews_count,
        average_rating, measurements, verdicts,
        material, care_instructions, weight_grams, country_of_origin,
        tags, discount_percent, is_featured, sku_code
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34
      )
      ON CONFLICT (id) DO UPDATE SET
        brand = EXCLUDED.brand, title = EXCLUDED.title,
        updated_at = NOW()
      RETURNING *
    `;
    const params = [
      p.id, p.brand, p.title, p.category, p.subCategory ?? null,
      p.productSegment, p.productType,
      p.description ?? null, p.fitType, p.retailer, p.affiliateUrl,
      p.priceAtRetailer, p.images, p.occasions, p.seasons, p.colors,
      p.sizes ?? [], p.verifiedTier, p.outOfStock ?? false,
      p.verificationBadges ?? [], JSON.stringify(p.merchantLinks ?? []),
      JSON.stringify(p.customReviews ?? []), p.reviewsCount ?? 0,
      p.averageRating ?? 5.0, JSON.stringify(p.measurements ?? {}),
      JSON.stringify(p.verdicts ?? []),
      p.material ?? null, p.careInstructions ?? null,
      p.weightGrams ?? null, p.countryOfOrigin ?? 'India',
      p.tags ?? [], p.discountPercent ?? 0,
      p.isFeatured ?? false, p.skuCode ?? null,
    ];
    const rows = await query(text, params);
    return rowToProduct(rows[0]);
  },

  async update(id: string, partial: Partial<Product>): Promise<Product | null> {
    // Build SET clause dynamically
    const fieldMap: Record<string, string> = {
      brand: 'brand', title: 'title', category: 'category',
      subCategory: 'sub_category', productSegment: 'product_segment',
      productType: 'product_type', description: 'description',
      fitType: 'fit_type', retailer: 'retailer', affiliateUrl: 'affiliate_url',
      priceAtRetailer: 'price_at_retailer', images: 'images',
      occasions: 'occasions', seasons: 'seasons', colors: 'colors',
      sizes: 'sizes', verifiedTier: 'verified_tier', outOfStock: 'out_of_stock',
      verificationBadges: 'verification_badges', merchantLinks: 'merchant_links',
      customReviews: 'custom_reviews', reviewsCount: 'reviews_count',
      averageRating: 'average_rating', measurements: 'measurements',
      verdicts: 'verdicts', material: 'material',
      careInstructions: 'care_instructions', weightGrams: 'weight_grams',
      countryOfOrigin: 'country_of_origin', tags: 'tags',
      discountPercent: 'discount_percent', isFeatured: 'is_featured',
      skuCode: 'sku_code',
    };

    const jsonbFields = new Set(['merchantLinks', 'customReviews', 'measurements', 'verdicts']);
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in partial) {
        const val = (partial as any)[key];
        setClauses.push(`${col} = $${idx++}`);
        params.push(jsonbFields.has(key) ? JSON.stringify(val) : val);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push(`updated_at = NOW()`);
    params.push(id);

    const text = `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`;
    const rows = await query(text, params);
    return rows.length > 0 ? rowToProduct(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};
