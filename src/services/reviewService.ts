// src/services/reviewService.ts
// Business logic for product reviews

import { reviewRepository } from '../repositories/reviewRepository';
import { UserReview } from '../types';
import { query } from '../lib/db';

export const reviewService = {
  async getByProductId(productId: string): Promise<UserReview[]> {
    if (!productId) return [];
    return reviewRepository.findByProductId(productId);
  },

  async create(data: {
    productId: string;
    userId?: string;
    userEmail?: string;
    rating: number;
    height?: string;
    weight?: string;
    bodyType?: string;
    reviewText?: string;
  }): Promise<{ review?: UserReview; error?: string }> {
    // Validate
    if (!data.productId?.trim()) return { error: 'Product ID is required' };
    if (!data.rating || data.rating < 1 || data.rating > 5) return { error: 'Rating must be between 1 and 5' };
    if (data.reviewText && data.reviewText.length > 1000) return { error: 'Review text must be under 1000 characters' };

    // Check duplicate (1 review per user per product)
    if (data.userId) {
      const alreadyReviewed = await reviewRepository.hasUserReviewed(data.productId, data.userId);
      if (alreadyReviewed) {
        return { error: 'You have already reviewed this product' };
      }
    }

    const review = await reviewRepository.create(data);

    // Refresh aggregate rating on the product
    await query('SELECT refresh_product_rating($1)', [data.productId]);

    return { review };
  },

  async getAggregateRating(productId: string): Promise<{ count: number; average: number }> {
    return reviewRepository.getAggregateRating(productId);
  },
};
