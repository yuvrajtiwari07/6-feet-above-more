import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productRouter from './controllers/productController';
import userRouter from './controllers/userController';
import catalogRouter from './controllers/catalogController';
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

// Catalog categories + catalogs
app.use('/api/catalogs', catalogRouter);

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
      const apiToken = process.env.EARNKARO_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2YTMyOWQzNThjNGFjODEyZjMyZmQxZmYiLCJlYXJua2FybyI6IjQ1OTgxNzQiLCJpYXQiOjE3ODE3MDIxOTB9.T3fYYdfW0-K5ttncr7879Ul7PVf0gLAnPoMhRYfADpA';
      
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

    // Detect block page or empty page
    const isBlocked = !scraped.title || 
      scraped.title.toLowerCase().includes('something went wrong') || 
      scraped.title.toLowerCase().includes('oops') || 
      scraped.title.toLowerCase().includes('access denied') || 
      scraped.title.toLowerCase().includes('cloudflare') || 
      scraped.title.toLowerCase().includes('attention required') || 
      scraped.title.toLowerCase().includes('robot check');

    if (isBlocked) {
      console.log('[AICuration] Scraping blocked or returned error page. Extracting from URL path...');
      const urlMetadata = parseMetadataFromUrl(parsedUrl.href);
      scraped = {
        ...scraped,
        title: urlMetadata.title || scraped.title || 'Curated Tall Garment',
        brand: urlMetadata.brand || scraped.brand || 'Brand',
        retailer: retailerName,
        isScrapeBlocked: true
      };
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
  "material": "Material blend breakdown or null/empty if unknown",
  "price": 1499, // Inferred integer price or null/empty if unknown (do NOT guess if not in raw metadata)
  "retailer": "Retailer platform name",
  "occasions": ["Daily Wear", "Travel"], // or empty array [] if unknown
  "seasons": ["All Season"],
  "colors": ["Navy", "Olive"], // or empty array [] if unknown
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
2. The "price" MUST be an integer number or null. Do NOT guess/hallucinate prices if they are not in the scraped metadata.
3. The "material" MUST be a string or null. Do NOT guess/hallucinate materials.
4. The "colors" MUST be an array of strings or empty array []. Do NOT guess/hallucinate colors.
5. The response MUST be a single raw JSON object. Do not wrap the JSON output in markdown code blocks or any other formatting.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
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
          ...parsedResult,
          images: scraped.images && scraped.images.length > 0 ? scraped.images : (parsedResult.images || [])
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

  const price = typeof scraped.price === 'number' ? scraped.price : null;

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
    brand: scraped.brand || null,
    title: scraped.title || null,
    images: scraped.images || [],
    category,
    subCategory,
    material: scraped.material || null,
    price,
    retailer,
    occasions: scraped.occasions && scraped.occasions.length > 0 ? scraped.occasions : [],
    seasons: scraped.seasons && scraped.seasons.length > 0 ? scraped.seasons : ['All Season'],
    colors: scraped.colors && scraped.colors.length > 0 ? scraped.colors : [],
    tags: scraped.tags && scraped.tags.length > 0 ? scraped.tags : ['relaxed-fit', 'tall-friendly'],
    tallFit: {
      tallFriendly: true,
      recommendedHeightRanges: ["6'2–6'3", "6'4–6'5"],
      bodyTypes: ['Athletic', 'Broad'],
      highlights
    }
  };
}

function parseMetadataFromUrl(urlStr: string): { brand?: string; title?: string; category?: string } {
  try {
    const url = new URL(urlStr);
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return {};

    let titleRaw = '';
    let brandRaw = '';
    let categoryRaw = '';

    const domain = url.hostname.replace('www.', '').split('.')[0];
    const detectedRetailer = domain.charAt(0).toUpperCase() + domain.slice(1);

    if (url.hostname.includes('myntra.com')) {
      const buyIdx = segments.indexOf('buy');
      if (buyIdx > 1) {
        titleRaw = segments[buyIdx - 2];
        brandRaw = segments[buyIdx - 3] || '';
      } else if (segments.length >= 2) {
        titleRaw = segments[1];
        brandRaw = segments[0];
      }
    } else if (url.hostname.includes('ajio.com')) {
      const pIdx = segments.indexOf('p');
      if (pIdx > 0) {
        const productSegment = segments[pIdx - 1];
        const parts = productSegment.split('-');
        brandRaw = parts[0] || '';
        titleRaw = parts.slice(1).join(' ');
      }
    } else if (url.hostname.includes('snitch.co.in') || url.hostname.includes('snitch.co')) {
      const prodIdx = segments.indexOf('products');
      if (prodIdx >= 0 && segments[prodIdx + 1]) {
        titleRaw = segments[prodIdx + 1];
        brandRaw = 'Snitch';
      }
    } else if (url.hostname.includes('zara.com')) {
      const last = segments[segments.length - 1] || '';
      if (last.includes('-p')) {
        titleRaw = last.split('-p')[0];
        brandRaw = 'Zara';
      }
    } else if (url.hostname.includes('hm.com')) {
      if (segments.length >= 2) {
        titleRaw = segments[segments.length - 2] || '';
        brandRaw = 'H&M';
      }
    }

    if (!titleRaw) {
      const candidates = segments.filter(s => {
        return !s.match(/^\d+$/) && !['p', 'buy', 'product', 'products', 'in', 'en', 'item', 'items', 'detail', 'details'].includes(s);
      });
      if (candidates.length > 0) {
        titleRaw = candidates[candidates.length - 1];
      }
    }

    const cleanBrand = brandRaw
      ? brandRaw.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : detectedRetailer;

    let cleanTitle = titleRaw
      ? titleRaw.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
      : '';

    if (!cleanTitle || cleanTitle.toLowerCase() === 'en in' || cleanTitle.length <= 5) {
      cleanTitle = `${cleanBrand} Curated Garment`;
    }

    return {
      brand: cleanBrand || undefined,
      title: cleanTitle || undefined,
      category: categoryRaw || undefined
    };
  } catch {
    return {};
  }
}

export default app;

