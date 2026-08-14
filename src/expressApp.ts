import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productRouter from './controllers/productController';
import userRouter from './controllers/userController';
import catalogRouter from './controllers/catalogController';
import { requireAuth } from './middleware/authMiddleware';
import { requireAdmin } from './middleware/adminMiddleware';
import { ImporterFactory } from './lib/importers/ImporterFactory';
import { productRepository } from './repositories/productRepository';
import { productService } from './services/productService';
import {
  WELLNESS_CATEGORIES,
} from './data/wellness';
import {
  normalizeVertical,
  scrapeAndCurate,
  buildProductFromCuration,
  convertUrlToAffiliate,
  parseMetadataFromUrl,
} from './lib/curation/curatePipeline';
import aiJobsRouter from './controllers/aiJobsController';


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

// ─── Mobile OAuth bounce page ─────────────────────────────
// Supabase's redirect-URL allow-list does not reliably honor custom
// (non-http) URI schemes, so the mobile app sends Google OAuth through this
// real HTTPS page instead (which Supabase *does* honor), and this page
// immediately hands off to the app's deep link with the same query/hash
// intact. Web logins never hit this route.
//
// The app's scheme must start with a letter — a leading digit is not a
// valid URI scheme per the URL spec, so `window.location.replace()` with
// such a string is silently resolved as a *relative* path instead of an
// absolute URL, which is what broke this redirect originally.
app.get('/api/auth/mobile-redirect', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#112133;">
  <p>Returning to the app…</p>
  <script>
    window.location.replace('sixfeetabovemore://auth/callback' + window.location.search + window.location.hash);
  </script>
</body>
</html>`);
});

// Static category definitions (no DB needed)
// `?vertical=wellness` returns the nutrition / body care / health care taxonomy;
// anything else keeps returning the original fashion list unchanged.
const FASHION_CATEGORY_DEFS = [
  { name: 'Ethnic Wear',  theme: 'ethnic',    tags: ['Wedding', 'Festive', 'Haldi', 'Sangeet'] },
  { name: 'Formals',      theme: 'formals',   tags: ['Office', 'Boardroom', 'Interviews', 'Corporate'] },
  { name: 'Streetwear',   theme: 'streetwear',tags: ['Hypebeast', 'Oversized', 'Skate', 'Concert'] },
  { name: 'Casuals',      theme: 'casuals',   tags: ['Weekend', 'Lounge', 'Everyday', 'Comfort'] },
  { name: 'Summer',       theme: 'summer',    tags: ['Beach', 'Brunch', 'Linen', 'Vacation'] },
  { name: 'Winter',       theme: 'winter',    tags: ['Overcoats', 'Layering', 'Warm Luxury', 'Knitted'] },
  { name: 'Sneakers',     theme: 'default',   tags: ['Big Sizes', 'UK 12-15', 'Flat Arches'] },
];

app.get('/api/categories', (req, res) => {
  if (req.query.vertical === 'wellness') {
    return res.json(
      WELLNESS_CATEGORIES.map(c => ({ name: c.name, theme: 'wellness', tags: c.types.slice(0, 4) }))
    );
  }
  res.json(FASHION_CATEGORY_DEFS);
});

// Products CRUD (admin-protected mutations)
app.use('/api/products', productRouter);

// Affiliate click tracker redirect
app.post('/api/track', (_req, res) => {
  res.redirect(307, '/api/products/track');
});

// User profile (authenticated)
app.use('/api/users', userRouter);

// Catalog categories + catalogs
app.use('/api/catalogs', catalogRouter);

// AI discovery crawl jobs + bulk retag jobs
app.use('/api/admin', aiJobsRouter);

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

    // Check for duplicate URL
    try {
      const existingProduct = await productRepository.findByUrl(url);
      if (existingProduct) {
        return res.status(400).json({ success: false, error: 'Product already exists in the system.' });
      }
    } catch (err: any) {
      console.warn(`[ImportProduct] Duplicate check failed for ${url}:`, err?.message);
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

// ─── Admin: Generate Affiliate URL with EarnKaro ────────
// POST /api/admin/generate-affiliate
app.post(
  '/api/admin/generate-affiliate',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'A product URL is required.' });
    }

    try {
      const apiToken = process.env.EARNKARO_API_KEY;
      if (!apiToken) {
        return res.status(500).json({ success: false, error: 'EARNKARO_API_KEY is not configured on the server.' });
      }

      const payload = {
        deal: url.trim(),
        convert_option: 'convert_only'
      };

      const response = await fetch('https://ekaro-api.affiliaters.in/api/converter/public', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json() as any;

      if (!response.ok || data.error === 1 || !data.success) {
        let errorMsg = data.message || 'EarnKaro link conversion failed';
        if (response.status === 401) {
          errorMsg = 'EarnKaro Authorization Error (401). Please check the API key.';
        } else if (response.status === 429 || errorMsg.includes('Too many requests')) {
          errorMsg = 'EarnKaro API limit exceeded. Please retry in 1 minute.';
        }
        return res.status(response.status >= 400 && response.status < 600 ? response.status : 400).json({
          success: false,
          error: errorMsg
        });
      }

      return res.json({
        success: true,
        affiliateUrl: data.data
      });
    } catch (err: any) {
      console.error('[GenerateAffiliate] Error:', err?.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to connect to the EarnKaro affiliate API.',
        detail: err?.message ?? 'Unknown error'
      });
    }
  }
);


// ─── AI Curation: Import Product from URL with Gemini ────────
// POST /api/curate/import-url
// Uses gemini-3.5-flash to auto-generate a complete curated product schema.
// Falls back to a structured rule-based parser if the API call fails or key is missing.
app.post(
  '/api/curate/import-url',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { url } = req.body as { url?: string };
    const vertical = normalizeVertical((req.body as any)?.vertical);

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'A product URL is required.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format.' });
    }

    // Check for duplicate URL
    try {
      const existingProduct = await productRepository.findByUrl(url);
      if (existingProduct) {
        return res.status(400).json({ success: false, error: 'Product already exists in the system.' });
      }
    } catch (err: any) {
      console.warn(`[ImportUrl] Duplicate check failed for ${url}:`, err?.message);
    }

    try {
      const { scraped, curated, isBlocked, source } = await scrapeAndCurate(parsedUrl.href, vertical);
      return res.json({
        success: true,
        source,
        vertical,
        scrapeBlocked: isBlocked,
        ...curated,
        images: scraped.images && scraped.images.length > 0 ? scraped.images : (curated.images || [])
      });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: 'Failed to curate product from URL.',
        detail: err?.message ?? 'Unknown error'
      });
    }
  }
);

app.post(
  '/api/admin/bulk-import',
  requireAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    const { urls } = req.body as { urls?: string[] };
    const vertical = normalizeVertical((req.body as any)?.vertical);

    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ success: false, error: 'An array of product URLs is required.' });
    }

    const MAX_URLS = 300;
    const urlsToProcess = urls.slice(0, MAX_URLS);

    interface BulkResult {
      url: string;
      success: boolean;
      savedId?: string;
      duplicate?: boolean;
      noAffiliate?: boolean;
      /** True if the retailer blocked our scraper — saved with a guessed title only, no real images/price. */
      scrapeBlocked?: boolean;
      error?: string;
    }

    const results: BulkResult[] = [];

    for (const rawUrl of urlsToProcess) {
      const url = rawUrl.trim();
      if (!url) continue;

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        results.push({ url, success: false, error: 'Invalid URL format.' });
        continue;
      }

      // ── Duplicate check ────────────────────────────────────
      try {
        const existingProduct = await productRepository.findByUrl(url);
        if (existingProduct) {
          results.push({ url, success: false, duplicate: true, error: 'Product already exists in the system.' });
          continue;
        }
      } catch (err: any) {
        console.warn(`[BulkImport] Duplicate check failed for ${url}:`, err?.message);
      }

      // ── Scrape + curate (Gemini or fallback) ────────────────
      let scraped: any, curated: any, retailerName: string, isBlocked: boolean;
      try {
        ({ scraped, curated, retailerName, isBlocked } = await scrapeAndCurate(parsedUrl.href, vertical));
      } catch (err: any) {
        results.push({ url, success: false, error: err?.message ?? 'Failed to parse product data.' });
        continue;
      }

      // ── Affiliate conversion ────────────────────────────────
      const affiliateInfo = await convertUrlToAffiliate(url);

      // ── Build and save product ──────────────────────────────
      try {
        const newProduct = buildProductFromCuration(curated, scraped, url, vertical, retailerName, affiliateInfo);

        const saveResult = await productService.create(newProduct);
        if (saveResult.error) {
          // Could be a title+brand duplicate discovered at DB level
          const isDup = saveResult.error.includes('already exists');
          results.push({ url, success: false, duplicate: isDup, error: saveResult.error });
        } else {
          results.push({ url, success: true, savedId: saveResult.product?.id, noAffiliate: !affiliateInfo.affiliateGenerated, scrapeBlocked: isBlocked });
        }
      } catch (err: any) {
        console.error(`[BulkImport] Save failed for ${url}:`, err?.message);
        results.push({ url, success: false, error: `Save failed: ${err?.message ?? 'DB error'}` });
      }
    }

    return res.json({ success: true, results });
  }
);

export default app;


