// src/repositories/reviewRepository.ts
// Raw SQL queries for the reviews table

import { query, queryOne } from '../lib/db';
import { UserReview } from '../types';

function rowToReview(row: any): UserReview {
  return {
    id:         row.id,
    productId:  row.product_id,
    userId:     row.user_id,
    userEmail:  row.user_email,
    rating:     Number(row.rating),
    height:     row.height,
    weight:     row.weight,
    bodyType:   row.body_type,
    reviewText: row.review_text,
    createdAt:  row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export const reviewRepository = {
  async findByProductId(productId: string): Promise<UserReview[]> {
    const rows = await query(
      'SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC',
      [productId]
    );
    return rows.map(rowToReview);
  },

  async create(review: {
    productId: string;
    userId?: string;
    userEmail?: string;
    rating: number;
    height?: string;
    weight?: string;
    bodyType?: string;
    reviewText?: string;
  }): Promise<UserReview> {
    const text = `
      INSERT INTO reviews (product_id, user_id, user_email, rating, height, weight, body_type, review_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      review.productId,
      review.userId ?? null,
      review.userEmail ?? null,
      review.rating,
      review.height ?? null,
      review.weight ?? null,
      review.bodyType ?? null,
      review.reviewText ?? null,
    ];
    const rows = await query(text, params);
    return rowToReview(rows[0]);
  },

  async getAggregateRating(productId: string): Promise<{ count: number; average: number }> {
    const row = await queryOne(
      'SELECT COUNT(*)::int as count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average FROM reviews WHERE product_id = $1',
      [productId]
    );
    return {
      count: row?.count ?? 0,
      average: Number(row?.average ?? 0),
    };
  },

  async hasUserReviewed(productId: string, userId: string): Promise<boolean> {
    const row = await queryOne(
      'SELECT 1 FROM reviews WHERE product_id = $1 AND user_id = $2 LIMIT 1',
      [productId, userId]
    );
    return !!row;
  },
};
