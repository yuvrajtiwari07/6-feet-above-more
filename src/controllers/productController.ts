// src/controllers/productController.ts
// Express route handlers for /api/products

import { Router, Request, Response } from 'express';
import { productService } from '../services/productService';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { query } from '../lib/db';

const router = Router();

// ───────────────────────────────────────────────
//  GET /api/products
//  Public — list all products with optional filters
// ───────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, brand, search, featured } = req.query;
    const products = await productService.getAll({
      category:   category as string | undefined,
      brand:      brand as string | undefined,
      search:     search as string | undefined,
      isFeatured: featured === 'true' ? true : undefined,
    });
    res.json({ success: true, count: products.length, products });
  } catch (err: any) {
    console.error('[ProductController] GET /products error:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ───────────────────────────────────────────────
//  GET /api/products/:id
//  Public — get single product by ID
// ───────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (err: any) {
    console.error('[ProductController] GET /products/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ───────────────────────────────────────────────
//  POST /api/products
//  Admin only — create a new product
// ───────────────────────────────────────────────
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { product, error } = await productService.create(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    res.status(201).json({ success: true, product });
  } catch (err: any) {
    console.error('[ProductController] POST /products error:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// ───────────────────────────────────────────────
//  PUT /api/products/:id
//  Admin only — update existing product (partial)
// ───────────────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { product, error } = await productService.update(req.params.id, req.body);
    if (error) {
      return res.status(404).json({ error });
    }
    res.json({ success: true, product });
  } catch (err: any) {
    console.error('[ProductController] PUT /products/:id error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// ───────────────────────────────────────────────
//  DELETE /api/products/:id
//  Admin only — delete product
// ───────────────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { success, error } = await productService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error });
    }
    res.json({ success: true, message: `Product ${req.params.id} deleted` });
  } catch (err: any) {
    console.error('[ProductController] DELETE /products/:id error:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ───────────────────────────────────────────────
//  POST /api/products/track
//  Public (optional auth) — affiliate click logging
// ───────────────────────────────────────────────
router.post('/track', async (req: Request, res: Response) => {
  const { productId, retailer, affiliateUrl } = req.body;

  if (!productId || !retailer) {
    return res.status(400).json({ error: 'productId and retailer are required' });
  }

  try {
    await query(
      `INSERT INTO affiliate_clicks (product_id, retailer, affiliate_url, user_id)
       VALUES ($1, $2, $3, $4)`,
      [productId, retailer, affiliateUrl ?? '', (req as any).user?.uid ?? null]
    );

    console.log(`[AFFILIATE TRACK] ${new Date().toISOString()} | Product: ${productId} | Retailer: ${retailer}`);
    res.json({
      success:        true,
      message:        'Click logged',
      redirectTarget: affiliateUrl,
      timestamp:      new Date().toISOString(),
    });
  } catch (err: any) {
    // Non-fatal — still return success to not block user
    console.warn('[ProductController] Affiliate tracking failed:', err.message);
    res.json({ success: true, message: 'Click noted (logging unavailable)' });
  }
});

export default router;
