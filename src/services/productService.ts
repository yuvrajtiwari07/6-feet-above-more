// src/services/productService.ts
// Business logic layer — sits between controllers and repository

import { productRepository } from '../repositories/productRepository';
import { Product } from '../types';

function validateProduct(p: Partial<Product>): string | null {
  if (!p.id || typeof p.id !== 'string' || !/^[a-z0-9_-]+$/i.test(p.id)) {
    return 'Product ID must be alphanumeric with hyphens/underscores only';
  }
  if (!p.brand?.trim()) return 'Brand is required';
  if (!p.title?.trim()) return 'Title is required';
  if (!p.category?.trim()) return 'Category is required';
  if (typeof p.priceAtRetailer !== 'number' || p.priceAtRetailer < 0) {
    return 'Price must be a non-negative number';
  }
  const validTiers = ['verified', 'friendly', 'community'];
  if (p.verifiedTier && !validTiers.includes(p.verifiedTier)) {
    return `verifiedTier must be one of: ${validTiers.join(', ')}`;
  }
  const discountPercent = (p as any).discountPercent;
  if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
    return 'discountPercent must be between 0 and 100';
  }
  return null;
}

function sanitizeProduct(p: Product): Product {
  return {
    ...p,
    id:           p.id.trim().toLowerCase(),
    brand:        p.brand.trim(),
    title:        p.title.trim(),
    category:     p.category.trim(),
    subCategory:  p.subCategory?.trim(),
    description:  p.description?.trim(),
    retailer:     p.retailer?.trim() ?? '',
    affiliateUrl: p.affiliateUrl?.trim() || 'https://6feetabove.com/redirect',
    // Sanitize arrays
    images:       (p.images ?? []).filter(Boolean),
    occasions:    (p.occasions ?? []).filter(Boolean),
    seasons:      (p.seasons ?? []).filter(Boolean),
    colors:       (p.colors ?? []).filter(Boolean),
    sizes:        (p.sizes ?? []).filter(Boolean),
    // Computed
    reviewsCount: p.customReviews?.length ?? 0,
    averageRating:
      p.customReviews && p.customReviews.length > 0
        ? Number(
            (
              p.customReviews.reduce((acc, r) => acc + r.rating, 0) /
              p.customReviews.length
            ).toFixed(1)
          )
        : 5.0,
  };
}

export const productService = {
  async getAll(filters?: {
    category?: string;
    brand?: string;
    search?: string;
    isFeatured?: boolean;
  }): Promise<Product[]> {
    return productRepository.findAll(filters);
  },

  async getById(id: string): Promise<Product | null> {
    if (!id) return null;
    return productRepository.findById(id.trim().toLowerCase());
  },

  async create(data: Product): Promise<{ product?: Product; error?: string }> {
    const error = validateProduct(data);
    if (error) return { error };

    const sanitized = sanitizeProduct(data);

    // Check for duplicate
    const existing = await productRepository.findById(sanitized.id);
    if (existing) {
      return { error: `Product with ID "${sanitized.id}" already exists. Use update instead.` };
    }

    const product = await productRepository.create(sanitized);
    return { product };
  },

  async update(
    id: string,
    data: Partial<Product>
  ): Promise<{ product?: Product; error?: string }> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      return { error: `Product "${id}" not found` };
    }

    // Validate only the fields provided
    if (data.priceAtRetailer !== undefined && data.priceAtRetailer < 0) {
      return { error: 'Price must be non-negative' };
    }

    const product = await productRepository.update(id, data);
    return { product: product ?? undefined };
  },

  async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const existing = await productRepository.findById(id);
    if (!existing) {
      return { success: false, error: `Product "${id}" not found` };
    }
    const deleted = await productRepository.delete(id);
    return { success: deleted };
  },
};
