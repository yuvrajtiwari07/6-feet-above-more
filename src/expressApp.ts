import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productRouter from './controllers/productController';
import userRouter from './controllers/userController';
import { requireAuth } from './middleware/authMiddleware';
import { requireAdmin } from './middleware/adminMiddleware';
import { ImporterFactory } from './lib/importers/ImporterFactory';


let __dirname = '';
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  __dirname = process.cwd();
}

const app = express();

// ── Body Parsing ──────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Security Headers ──────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ── API Routes ────────────────────────────────────────────

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'ok',
    brand:     '6FeetnAbove',
    version:   '2.0.0',
    database:  'supabase-postgres',
    timestamp: new Date().toISOString(),
  });
});

// Static category definitions (no DB needed)
app.get('/api/categories', (_req, res) => {
  res.json([
    { name: 'Ethnic Wear',  theme: 'ethnic',    tags: ['Wedding', 'Festive', 'Haldi', 'Sangeet'] },
    { name: 'Formals',      theme: 'formals',   tags: ['Office', 'Boardroom', 'Interviews', 'Corporate'] },
    { name: 'Streetwear',   theme: 'streetwear',tags: ['Hypebeast', 'Oversized', 'Skate', 'Concert'] },
    { name: 'Casuals',      theme: 'casuals',   tags: ['Weekend', 'Lounge', 'Everyday', 'Comfort'] },
    { name: 'Summer',       theme: 'summer',    tags: ['Beach', 'Brunch', 'Linen', 'Vacation'] },
    { name: 'Winter',       theme: 'winter',    tags: ['Overcoats', 'Layering', 'Warm Luxury', 'Knitted'] },
    { name: 'Sneakers',     theme: 'default',   tags: ['Big Sizes', 'UK 12-15', 'Flat Arches'] },
  ]);
});

// Products CRUD (admin-protected mutations)
app.use('/api/products', productRouter);

// Affiliate click tracker redirect
app.post('/api/track', (_req, res) => {
  res.redirect(307, '/api/products/track');
});

// User profile (authenticated)
app.use('/api/users', userRouter);

// ─── Admin: Import Product from URL ───────────────────────
// POST /api/admin/import-product
// Fetches product metadata from any supported retailer URL.
// Does NOT create or save anything — returns data for the admin form to populate.
app.post(
  '/api/admin/import-product',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'A product URL is required.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format.' });
    }

    try {
      const importer = ImporterFactory.getImporter(parsedUrl.href);
      const product = await importer.importProduct(parsedUrl.href);

      return res.json({
        success: true,
        product,
        retailerName: importer.retailerName,
      });
    } catch (err: any) {
      console.error('[ImportProduct] Error importing from URL:', url, err?.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch product data from the provided URL.',
        detail: err?.message ?? 'Unknown error',
      });
    }
  }
);

export default app;

