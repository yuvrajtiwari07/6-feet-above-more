// src/repositories/catalogCategoryRepository.ts
import { query, queryOne } from '../lib/db';
import { CatalogCategory } from '../types';

function rowToCategory(row: any): CatalogCategory {
  return {
    id:          row.id,
    name:        row.name,
    slug:        row.slug,
    description: row.description,
    coverImage:  row.cover_image,
    sortOrder:   row.sort_order ?? 0,
    isActive:    row.is_active,
    createdAt:   row.created_at,
  };
}

export const catalogCategoryRepository = {
  async findAll(): Promise<CatalogCategory[]> {
    const rows = await query('SELECT * FROM catalog_categories ORDER BY sort_order ASC, name ASC');
    return rows.map(rowToCategory);
  },

  async findById(id: string): Promise<CatalogCategory | null> {
    const row = await queryOne('SELECT * FROM catalog_categories WHERE id = $1', [id]);
    return row ? rowToCategory(row) : null;
  },

  async create(data: Omit<CatalogCategory, 'id' | 'createdAt'>): Promise<CatalogCategory> {
    const rows = await query(
      `INSERT INTO catalog_categories (name, slug, description, cover_image, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.name, data.slug, data.description ?? null, data.coverImage ?? null, data.sortOrder, data.isActive]
    );
    return rowToCategory(rows[0]);
  },

  async update(id: string, data: Partial<Omit<CatalogCategory, 'id' | 'createdAt'>>): Promise<CatalogCategory | null> {
    const fieldMap: Record<string, string> = {
      name: 'name', slug: 'slug', description: 'description',
      coverImage: 'cover_image', sortOrder: 'sort_order', isActive: 'is_active',
    };
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) {
        setClauses.push(`${col} = $${idx++}`);
        params.push((data as any)[key]);
      }
    }
    if (setClauses.length === 0) return this.findById(id);
    params.push(id);
    const rows = await query(
      `UPDATE catalog_categories SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    return rows.length > 0 ? rowToCategory(rows[0]) : null;
  },

  async delete(id: string): Promise<boolean> {
    const rows = await query('DELETE FROM catalog_categories WHERE id = $1 RETURNING id', [id]);
    return rows.length > 0;
  },
};
