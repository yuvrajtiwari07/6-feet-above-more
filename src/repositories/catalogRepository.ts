// src/repositories/catalogRepository.ts
import { query, queryOne } from '../lib/db';
import { Catalog } from '../types';

function rowToCatalog(row: any): Catalog {
  return {
    id:           row.id,
    title:        row.title,
    slug:         row.slug,
    description:  row.description,
    categoryId:   row.category_id,
    categoryName: row.category_name,
    coverImage:   row.cover_image,
    productIds:   row.product_ids ?? [],
    affiliateUrl: row.affiliate_url,
    isPublished:  row.is_published,
    sortOrder:    row.sort_order ?? 0,
    tags:         row.tags ?? [],
    createdAt:    row.created_at,
    updatedAt:    row.updated_at,
  };
}

export const catalogRepository = {
  async findAll(filters?: {
    category?: string;
    publishedOnly?: boolean;
  }): Promise<Catalog[]> {
    let text = 'SELECT * FROM catalogs WHERE 1=1';
    const params: any[] = [];
    let idx = 1;
    if (filters?.category) {
      text += ` AND LOWER(category_name) = LOWER($${idx++})`;
      params.push(filters.category);
    }
    if (filters?.publishedOnly !== false) {
      text += ` AND is_published = true`;
    }
    text += ' ORDER BY sort_order ASC, created_at DESC';
    const rows = await query(text, params);
    return rows.map(rowToCatalog);
  },

  async findById(id: string): Promise<Catalog | null> {
    const row = await queryOne('SELECT * FROM catalogs WHERE id = $1', [id]);
    return row ? rowToCatalog(row) : null;
  },

  async create(data: Omit<Catalog, 'id' | 'createdAt' | 'updatedAt'>): Promise<Catalog> {
    const rows = await query(
      `INSERT INTO catalogs
         (title, slug, description, category_id, category_name, cover_image,
          product_ids, affiliate_url, is_published, sort_order, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.title, data.slug, data.description ?? null,
        data.categoryId ?? null, data.categoryName,
        data.coverImage ?? null, data.productIds ?? [],
        data.affiliateUrl ?? null, data.isPublished ?? true,
        data.sortOrder ?? 0, data.tags ?? [],
      ]
    );
    return rowToCatalog(rows[0]);
  },

  async update(id: string, partial: Partial<Omit<Catalog, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Catalog | null> {
    const fieldMap: Record<string, string> = {
      title: 'title', slug: 'slug', description: 'description',
      categoryId: 'category_id', categoryName: 'category_name',
      coverImage: 'cover_image', productIds: 'product_ids',
      affiliateUrl: 'affiliate_url', isPublished: 'is_published',
      sortOrder: 'sort_order', tags: 'tags',
    };
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in partial) {
        setClauses.push(`${col} = $${idx++}`);
        params.push((partial as any)[key]);
      }
    }
    if (setClauses.length === 0) return this.findById(id);
    setClauses.push(`updated_at = NOW()`);
    params.push(id);
    const rows = await query(
      `UPDATE catalogs SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return rows.length > 0 ? rowToCatalog(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM catalogs WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};
