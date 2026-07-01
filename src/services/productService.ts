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
  if (!p.productSegment?.trim()) return 'Product Segment is required';
  if (!p.productType?.trim()) return 'Product Type is required';
  if (typeof p.priceAtRetailer !== 'number' || p.priceAtRetailer < 0) {
    return 'Price must be a non-negative number';
  }
  const validTiers = ['verified', 'friendly', 'community'];
  if (p.verifiedTier && !validTiers.includes(p.verifiedTier)) {
    return `verifiedTier must be one of: ${validTiers.join(', ')}`;
  }
  const discountPercent = p.discountPercent;
  if (discountPercent !== undefined && (discountPercent < 0 || discountPercent > 100)) {
    return 'discountPercent must be between 0 and 100';
  }
  return null;
}

function sanitizeProduct(p: Product): Product {
  return {
    ...p,
    id:             p.id.trim().toLowerCase(),
    brand:          p.brand.trim(),
    title:          p.title.trim(),
    category:       p.category.trim(),
    categories:     (p.categories ?? []).filter(Boolean),
    subCategory:    p.subCategory?.trim(),
    productSegment: p.productSegment.trim(),
    productType:    p.productType.trim(),
    description:    p.description?.trim(),
    retailer:       p.retailer?.trim() ?? '',
    affiliateUrl:   p.affiliateUrl?.trim() || 'https://6feetabove.com/redirect',
    // Sanitize arrays
    images:         (p.images ?? []).filter(Boolean),
    occasions:      (p.occasions ?? []).filter(Boolean),
    seasons:        (p.seasons ?? []).filter(Boolean),
    colors:         (p.colors ?? []).filter(Boolean),
    sizes:          (p.sizes ?? []).filter(Boolean),
    tags:           (p.tags ?? []).filter(Boolean),
    heightRanges:   (p.heightRanges ?? []).filter(Boolean),
    bodyTypes:      (p.bodyTypes ?? []).filter(Boolean),
    fitHighlights:  (p.fitHighlights ?? []).filter(Boolean),
  };
}

export const productService = {
  async getAll(filters?: {
    category?: string;
    brand?: string;
    search?: string;
    isFeatured?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number }> {
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

    // Check for duplicate URL
    if (sanitized.affiliateUrl) {
      const existingUrl = await productRepository.findByUrl(sanitized.affiliateUrl);
      if (existingUrl) {
        return { error: `Product with this URL already exists (ID: "${existingUrl.id}").` };
      }
    }
    if (sanitized.merchantLinks && Array.isArray(sanitized.merchantLinks)) {
      for (const m of sanitized.merchantLinks) {
        if (m.url) {
          const existingUrl = await productRepository.findByUrl(m.url);
          if (existingUrl) {
            return { error: `Product with URL "${m.url}" already exists (ID: "${existingUrl.id}").` };
          }
        }
      }
    }

    // Check for duplicate Title + Brand (case insensitive)
    const { products: allProducts } = await productRepository.findAll();
    const cleanTitle = sanitized.title.trim().toLowerCase();
    const cleanBrand = sanitized.brand.trim().toLowerCase();
    const existingTitleBrand = allProducts.find(p =>
      p.title.trim().toLowerCase() === cleanTitle &&
      p.brand.trim().toLowerCase() === cleanBrand
    );
    if (existingTitleBrand) {
      return { error: `Product with title "${sanitized.title}" and brand "${sanitized.brand}" already exists (ID: "${existingTitleBrand.id}").` };
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
