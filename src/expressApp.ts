import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productRouter from './controllers/productController';
import userRouter from './controllers/userController';
import { requireAuth } from './middleware/authMiddleware';
import { requireAdmin } from './middleware/adminMiddleware';
import { ImporterFactory } from './lib/importers/ImporterFactory';
import { GoogleGenAI } from '@google/genai';


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

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'A product URL is required.' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid URL format.' });
    }

    let scraped: any = {};
    let retailerName = 'Retailer';
    try {
      const importer = ImporterFactory.getImporter(parsedUrl.href);
      scraped = await importer.importProduct(parsedUrl.href);
      retailerName = importer.retailerName;
    } catch (err: any) {
      console.warn('[AICuration] Scraper failed or returned empty. Attempting basic URL parse fallback.', err?.message);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a fashion AI specialized in sizing, styling, and classifying products for tall men (6ft+).
Given this scraped raw product metadata:
${JSON.stringify(scraped)}

And the retailer product URL: ${parsedUrl.href}

Generate a clean, professional, structured curation response matching this JSON schema exactly:
{
  "brand": "Inferred fashion brand (e.g., Zara, Roadster, H&M, Snitch)",
  "title": "Concise human-friendly display title",
  "category": "One of: 'Ethnic Wear', 'Formals', 'Streetwear', 'Casuals'",
  "subCategory": "Garment detailed style (e.g., Shirts, Kurtas, Cargo Pants)",
  "material": "Material blend breakdown (e.g., 100% Cotton, Belgian Linen)",
  "price": 1499,
  "retailer": "Retailer platform name",
  "occasions": ["Daily Wear", "Travel"],
  "seasons": ["All Season"],
  "colors": ["Navy", "Olive"],
  "tags": ["relaxed-fit", "tall-friendly"],
  "tallFit": {
    "tallFriendly": true,
    "recommendedHeightRanges": ["6'2–6'3", "6'4–6'5"],
    "bodyTypes": ["Athletic", "Broad"],
    "highlights": ["Extended Sleeves", "Longline Dropped Torso"]
  }
}

Strict requirements:
1. "category" MUST be exactly one of: 'Ethnic Wear', 'Formals', 'Streetwear', 'Casuals'.
2. The "price" MUST be an integer number.
3. The response MUST be a single raw JSON object. Do not wrap the JSON output in markdown code blocks or any other formatting.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const text = response.text || '';
        const parsedResult = JSON.parse(text.trim());
        
        return res.json({
          success: true,
          source: 'gemini-3.5-flash',
          ...parsedResult
        });
      } catch (err: any) {
        console.error('[AICuration] Gemini API curation failed. Falling back to structured parser.', err?.message);
      }
    }

    // Structured Fallback Parser
    try {
      const fallbackResult = runFallbackParser(scraped, parsedUrl.href, retailerName);
      return res.json(fallbackResult);
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: 'Failed to curate product from URL.',
        detail: err?.message ?? 'Unknown error'
      });
    }
  }
);

function runFallbackParser(scraped: any, url: string, detectedRetailer: string): any {
  let retailer = scraped.retailer || detectedRetailer || 'Retailer';
  if (retailer === 'Retailer' || !retailer) {
    try {
      const host = new URL(url).hostname.replace('www.', '').split('.')[0];
      retailer = host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
      retailer = 'Retailer';
    }
  }

  const combinedText = `${scraped.title || ''} ${scraped.category || ''} ${scraped.subCategory || ''} ${scraped.description || ''}`.toLowerCase();
  
  // Strict Categories allowed: 'Ethnic Wear', 'Formals', 'Streetwear', 'Casuals'
  let category = 'Casuals';
  if (combinedText.match(/kurta|ethnic|sangeet|sherwani|wedding|festive/)) {
    category = 'Ethnic Wear';
  } else if (combinedText.match(/blazer|suit|trousers|formal|corporate|interview/)) {
    category = 'Formals';
  } else if (combinedText.match(/hoodie|sweatshirt|cargo|streetwear|skate|hypebeast/)) {
    category = 'Streetwear';
  }

  let subCategory = scraped.subCategory || scraped.category || '';
  if (!subCategory) {
    if (combinedText.includes('shirt')) subCategory = 'Shirts';
    else if (combinedText.includes('jeans')) subCategory = 'Jeans';
    else if (combinedText.includes('kurta')) subCategory = 'Kurtas';
    else if (combinedText.includes('sneaker')) subCategory = 'Sneakers';
    else if (combinedText.includes('jacket')) subCategory = 'Jackets';
    else subCategory = 'Garments';
  }

  const price = typeof scraped.price === 'number' ? scraped.price : 1499;

  // Tall fit curation defaults
  const highlights = ['Extended Torso Fit'];
  if (combinedText.match(/shirt|jacket|hoodie|sweatshirt/)) {
    highlights.push('Extended Sleeves');
  } else if (combinedText.match(/pants|jeans|cargo|chinos/)) {
    highlights.push('Extra Inseam Length');
  }

  return {
    success: true,
    source: 'fallback-parser',
    brand: scraped.brand || 'Roadster',
    title: scraped.title || 'Curated Tall Garment',
    category,
    subCategory,
    material: scraped.material || '100% Cotton',
    price,
    retailer,
    occasions: scraped.occasions && scraped.occasions.length > 0 ? scraped.occasions : ['Daily Wear'],
    seasons: scraped.seasons && scraped.seasons.length > 0 ? scraped.seasons : ['All Season'],
    colors: scraped.colors && scraped.colors.length > 0 ? scraped.colors : ['Navy'],
    tags: scraped.tags && scraped.tags.length > 0 ? scraped.tags : ['relaxed-fit', 'tall-friendly'],
    tallFit: {
      tallFriendly: true,
      recommendedHeightRanges: ["6'2–6'3", "6'4–6'5"],
      bodyTypes: ['Athletic', 'Broad'],
      highlights
    }
  };
}

export default app;

