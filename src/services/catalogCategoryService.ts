// src/services/catalogCategoryService.ts
import { catalogCategoryRepository } from '../repositories/catalogCategoryRepository';
import { CatalogCategory } from '../types';

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function validate(data: Partial<CatalogCategory>): string | null {
  if (!data.name?.trim()) return 'Category name is required';
  if (data.name.trim().length > 80) return 'Name must be 80 characters or less';
  return null;
}

export const catalogCategoryService = {
  async getAll(): Promise<CatalogCategory[]> {
    return catalogCategoryRepository.findAll();
  },

  async getById(id: string): Promise<CatalogCategory | null> {
    return catalogCategoryRepository.findById(id);
  },

  async create(data: Partial<CatalogCategory>): Promise<{ category?: CatalogCategory; error?: string }> {
    const err = validate(data);
    if (err) return { error: err };
    const slug = data.slug?.trim() || toSlug(data.name!.trim());
    return {
      category: await catalogCategoryRepository.create({
        name:      data.name!.trim(),
        slug,
        description: data.description?.trim(),
        coverImage:  data.coverImage?.trim(),
        sortOrder:   data.sortOrder ?? 0,
        isActive:    data.isActive ?? true,
      }),
    };
  },

  async update(id: string, data: Partial<CatalogCategory>): Promise<{ category?: CatalogCategory | null; error?: string }> {
    const existing = await catalogCategoryRepository.findById(id);
    if (!existing) return { error: 'Catalog category not found' };
    if (data.name !== undefined && !data.name.trim()) return { error: 'Name cannot be empty' };
    const updates: any = {};
    if (data.name !== undefined)        updates.name        = data.name.trim();
    if (data.slug !== undefined)        updates.slug        = data.slug.trim() || toSlug(data.name?.trim() || existing.name);
    if (data.description !== undefined) updates.description = data.description;
    if (data.coverImage !== undefined)  updates.coverImage  = data.coverImage;
    if (data.sortOrder !== undefined)   updates.sortOrder   = data.sortOrder;
    if (data.isActive !== undefined)    updates.isActive    = data.isActive;
    return { category: await catalogCategoryRepository.update(id, updates) };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const existing = await catalogCategoryRepository.findById(id);
    if (!existing) return { success: false, error: 'Catalog category not found' };
    const deleted = await catalogCategoryRepository.delete(id);
    return { success: deleted };
  },
};
