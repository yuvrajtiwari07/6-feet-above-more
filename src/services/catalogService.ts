// src/services/catalogService.ts
import { catalogRepository } from '../repositories/catalogRepository';
import { productRepository } from '../repositories/productRepository';
import { Catalog } from '../types';

function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function validate(data: Partial<Catalog>): string | null {
  if (!data.title?.trim()) return 'Catalog title is required';
  if (!data.categoryName?.trim()) return 'Category name is required';
  return null;
}

export const catalogService = {
  async getAll(filters?: { category?: string }): Promise<Catalog[]> {
    return catalogRepository.findAll({ category: filters?.category, publishedOnly: true });
  },

  async getAllForAdmin(): Promise<Catalog[]> {
    return catalogRepository.findAll({ publishedOnly: false });
  },

  async getById(id: string): Promise<{ catalog?: Catalog; products?: any[]; error?: string }> {
    const catalog = await catalogRepository.findById(id);
    if (!catalog) return { error: 'Catalog not found' };
    // Resolve product data for all productIds
    const products = await Promise.all(
      catalog.productIds.map(pid => productRepository.findById(pid))
    );
    return { catalog, products: products.filter(Boolean) };
  },

  async create(data: Partial<Catalog>): Promise<{ catalog?: Catalog; error?: string }> {
    const err = validate(data);
    if (err) return { error: err };

    const slug = data.slug?.trim() || toSlug(data.title!.trim());

    // Validate productIds exist
    if (data.productIds && data.productIds.length > 0) {
      const checks = await Promise.all(data.productIds.map(id => productRepository.findById(id)));
      const missing = data.productIds.filter((id, i) => !checks[i]);
      if (missing.length > 0) return { error: `Products not found: ${missing.join(', ')}` };
    }

    const catalog = await catalogRepository.create({
      title:        data.title!.trim(),
      slug,
      description:  data.description?.trim(),
      categoryId:   data.categoryId,
      categoryName: data.categoryName!.trim(),
      coverImage:   data.coverImage?.trim(),
      productIds:   data.productIds ?? [],
      affiliateUrl: data.affiliateUrl?.trim(),
      isPublished:  data.isPublished ?? true,
      sortOrder:    data.sortOrder ?? 0,
      tags:         data.tags ?? [],
    });
    return { catalog };
  },

  async update(id: string, data: Partial<Catalog>): Promise<{ catalog?: Catalog | null; error?: string }> {
    const existing = await catalogRepository.findById(id);
    if (!existing) return { error: 'Catalog not found' };

    if (data.productIds && data.productIds.length > 0) {
      const checks = await Promise.all(data.productIds.map(pid => productRepository.findById(pid)));
      const missing = data.productIds.filter((pid, i) => !checks[i]);
      if (missing.length > 0) return { error: `Products not found: ${missing.join(', ')}` };
    }

    const catalog = await catalogRepository.update(id, data);
    return { catalog };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const existing = await catalogRepository.findById(id);
    if (!existing) return { success: false, error: 'Catalog not found' };
    const deleted = await catalogRepository.delete(id);
    return { success: deleted };
  },
};
