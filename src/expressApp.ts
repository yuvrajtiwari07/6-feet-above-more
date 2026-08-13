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
import { productRepository } from './repositories/productRepository';
import { productService } from './services/productService';
import {
  WELLNESS_CATEGORIES,
  WELLNESS_CATEGORY_NAMES,
  WELLNESS_CONCERNS,
  WELLNESS_DIET_TAGS,
  WELLNESS_FORMS,
  wellnessTypesFor,
} from './data/wellness';
import { Vertical } from './types';
import { getGarmentVersatilityDefaults } from './lib/garmentVersatility';


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
        title: urlMetadata.title || scraped.title || (vertical === 'wellness' ? 'Curated Wellness Product' : 'Curated Tall Garment'),
        brand: urlMetadata.brand || scraped.brand || 'Brand',
        retailer: retailerName,
        isScrapeBlocked: true
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildCurationPrompt(vertical, scraped, parsedUrl.href);

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
          vertical,
          scrapeBlocked: isBlocked,
          ...parsedResult,
          images: scraped.images && scraped.images.length > 0 ? scraped.images : (parsedResult.images || [])
        });
      } catch (err: any) {
        console.error('[AICuration] Gemini API curation failed. Falling back to structured parser.', err?.message);
      }
    }

    // Structured Fallback Parser
    try {
      const fallbackResult = vertical === 'wellness'
        ? runWellnessFallbackParser(scraped, parsedUrl.href, retailerName)
        : runFallbackParser(scraped, parsedUrl.href, retailerName);
      return res.json({ ...fallbackResult, scrapeBlocked: isBlocked });
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        error: 'Failed to curate product from URL.',
        detail: err?.message ?? 'Unknown error'
      });
    }
  }
);

function normalizeVertical(value: any): Vertical {
  return value === 'wellness' ? 'wellness' : 'fashion';
}

/**
 * The curation prompt differs per vertical: fashion is graded on tall fit,
 * wellness on what the product is made of and what concern it solves.
 */
function buildCurationPrompt(vertical: Vertical, scraped: any, url: string): string {
  if (vertical === 'wellness') {
    return `You are a wellness commerce AI that classifies nutrition, body care and health care products for an Indian storefront.
Given this scraped raw product metadata:
${JSON.stringify(scraped)}

And the retailer product URL: ${url}

Generate a clean, structured curation response matching this JSON schema exactly:
{
  "brand": "Inferred brand (e.g., MuscleBlaze, The Derma Co, Kapiva)",
  "title": "Concise human-friendly display title",
  "category": "One of: ${WELLNESS_CATEGORY_NAMES.join(' | ')}",
  "productType": "One of: ${wellnessTypesFor().join(', ')}",
  "form": "One of: ${WELLNESS_FORMS.join(', ')}",
  "netQuantity": "Pack size exactly as listed, e.g. '60 capsules', '1 kg', '100 ml', or null if unknown",
  "keyIngredients": ["Whey Isolate", "Niacinamide"],
  "concerns": ["Immunity"],
  "dietTags": ["Veg"],
  "price": 1499,
  "retailer": "Retailer platform name",
  "description": "One or two factual sentences about what the product does",
  "tags": ["daily-use"]
}

Strict requirements:
1. "category" MUST be exactly one of: ${WELLNESS_CATEGORY_NAMES.join(' | ')}.
2. "concerns" MUST only use values from this list: ${WELLNESS_CONCERNS.join(', ')}. Use [] if none apply.
3. "dietTags" MUST only use values from this list: ${WELLNESS_DIET_TAGS.join(', ')}. Use [] if none apply.
4. "price" MUST be an integer or null. Do NOT guess a price that is not in the scraped metadata.
5. "keyIngredients" MUST come from the scraped metadata. Do NOT invent ingredients, dosages or health claims.
6. Never state that a product treats, cures or prevents a disease.
7. Respond with a single raw JSON object — no markdown fences, no commentary.`;
  }

  return `You are a fashion AI specialized in sizing, styling, and classifying products for tall men (6ft+).
Given this scraped raw product metadata:
${JSON.stringify(scraped)}

And the retailer product URL: ${url}

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
}

/** Keyword classifier used when Gemini is unavailable for a wellness import. */
function runWellnessFallbackParser(scraped: any, url: string, detectedRetailer: string): any {
  let retailer = scraped.retailer || detectedRetailer || 'Retailer';
  if (retailer === 'Retailer' || !retailer) {
    try {
      const host = new URL(url).hostname.replace('www.', '').split('.')[0];
      retailer = host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
      retailer = 'Retailer';
    }
  }

  const text = `${scraped.title || ''} ${scraped.category || ''} ${scraped.subCategory || ''} ${scraped.description || ''} ${url}`.toLowerCase();
  const { category, productType } = detectWellnessCategoryAndType(text);

  let form = '';
  if (text.match(/powder|sachet/))            form = 'Powder';
  else if (text.match(/capsule|caps\b/))      form = 'Capsule';
  else if (text.match(/tablet|tabs\b/))       form = 'Tablet';
  else if (text.match(/gummy|gummies/))       form = 'Gummy';
  else if (text.match(/serum/))               form = 'Serum';
  else if (text.match(/cream|lotion|balm/))   form = 'Cream';
  else if (text.match(/\boil\b/))             form = 'Oil';
  else if (text.match(/gel\b/))               form = 'Gel';
  else if (text.match(/spray|mist/))          form = 'Spray';
  else if (text.match(/juice|syrup|liquid|drink/)) form = 'Liquid';

  const qty = text.match(/(\d+(?:\.\d+)?)\s?(kg|g|gm|grams|ml|l|capsules|caps|tablets|tabs|sachets|pieces)/);

  const concerns: string[] = [];
  const CONCERN_HINTS: [RegExp, string][] = [
    [/hair ?fall|hairfall/, 'Hair Fall'], [/dandruff/, 'Dandruff'], [/acne|pimple/, 'Acne'],
    [/pigment|dark spot|tan\b/, 'Pigmentation'], [/dry skin|hydrat|moistur/, 'Dry Skin'],
    [/anti ?age|wrinkle|retinol/, 'Anti-Ageing'], [/spf|sunscreen|uv\b/, 'Sun Protection'],
    [/immun/, 'Immunity'], [/gut|digest|probiotic|fibre|fiber/, 'Gut Health'],
    [/sleep|melatonin/, 'Sleep'], [/energy|stamina|endurance/, 'Energy & Stamina'],
    [/muscle|protein|gainer|creatine|bcaa/, 'Muscle Gain'], [/weight loss|slim|fat burn/, 'Weight Loss'],
    [/joint|bone|calcium|collagen/, 'Joint & Bone'], [/stress|focus|ashwagandha|nootropic/, 'Stress & Focus'],
    [/diabet|sugar control/, 'Diabetes Care'], [/heart|cardiac|cholesterol/, 'Heart Health'],
    [/women|menstrual|period/, "Women's Health"], [/\bmen\b|beard|testosterone/, "Men's Health"],
    [/kids|child|growth/, 'Kids Growth'],
  ];
  for (const [re, label] of CONCERN_HINTS) {
    if (re.test(text) && !concerns.includes(label)) concerns.push(label);
  }

  const dietTags: string[] = [];
  if (/vegan/.test(text)) dietTags.push('Vegan');
  else if (/\bveg\b|vegetarian/.test(text)) dietTags.push('Veg');
  if (/sugar ?free|no added sugar/.test(text)) dietTags.push('Sugar Free');
  if (/gluten ?free/.test(text)) dietTags.push('Gluten Free');
  if (/organic/.test(text)) dietTags.push('Organic');
  if (/cruelty ?free/.test(text)) dietTags.push('Cruelty Free');

  return {
    success: true,
    source: 'fallback-parser',
    vertical: 'wellness',
    brand: scraped.brand || null,
    title: scraped.title || null,
    images: scraped.images || [],
    category,
    productType,
    form,
    netQuantity: qty ? `${qty[1]} ${qty[2]}` : '',
    keyIngredients: [],
    concerns: concerns.slice(0, 4),
    dietTags,
    price: typeof scraped.price === 'number' ? scraped.price : null,
    retailer,
    description: scraped.description || '',
    tags: scraped.tags && scraped.tags.length > 0 ? scraped.tags : [],
  };
}

/** Maps free text onto the wellness taxonomy (category + product type). */
function detectWellnessCategoryAndType(text: string): { category: string; productType: string } {
  const t = text.toLowerCase();
  const rules: [RegExp, string, string][] = [
    [/whey|isolate|protein powder/,            'Supplements & Sports Nutrition', 'Whey Protein'],
    [/mass gainer|weight gainer/,              'Supplements & Sports Nutrition', 'Mass Gainer'],
    [/multivitamin|vitamin [abcdek]\b/,        'Supplements & Sports Nutrition', 'Multivitamin'],
    [/omega|fish oil/,                         'Supplements & Sports Nutrition', 'Omega & Fish Oil'],
    [/pre.?workout/,                           'Supplements & Sports Nutrition', 'Pre-Workout'],
    [/creatine/,                               'Supplements & Sports Nutrition', 'Creatine'],
    [/collagen/,                               'Supplements & Sports Nutrition', 'Collagen'],
    [/ashwagandha|shilajit|adaptogen/,         'Ayurveda & Herbal',              'Ashwagandha & Adaptogens'],
    [/chyawanprash/,                           'Ayurveda & Herbal',              'Chyawanprash'],
    [/churna|powder ayurved/,                  'Ayurveda & Herbal',              'Ayurvedic Churna'],
    [/amla juice|aloe juice|herbal juice/,     'Ayurveda & Herbal',              'Herbal Juice'],
    [/ayurved|herbal/,                         'Ayurveda & Herbal',              'Herbal Tablets'],
    [/lab test|blood test|diagnostic/,         'Health Care & Diagnostics',      'Lab Test Package'],
    [/full body checkup|health checkup/,       'Health Care & Diagnostics',      'Full Body Checkup'],
    [/thermometer|oximeter|bp monitor|glucomet/, 'Health Care & Diagnostics',    'Health Device'],
    [/medicine|tablet strip|pharmacy/,         'Health Care & Diagnostics',      'OTC Medicine'],
    [/sunscreen|spf/,                          'Skin Care',                      'Sunscreen'],
    [/face serum|serum/,                       'Skin Care',                      'Face Serum'],
    [/face wash|cleanser/,                     'Skin Care',                      'Face Wash'],
    [/moistur|day cream|night cream/,          'Skin Care',                      'Moisturiser'],
    [/face mask|sheet mask/,                   'Skin Care',                      'Face Mask'],
    [/body lotion/,                            'Skin Care',                      'Body Lotion'],
    [/toner/,                                  'Skin Care',                      'Toner'],
    [/lipstick|foundation|kajal|mascara|makeup/, 'Skin Care',                    'Makeup'],
    [/shampoo/,                                'Hair & Grooming',                'Shampoo'],
    [/conditioner/,                            'Hair & Grooming',                'Conditioner'],
    [/hair oil/,                               'Hair & Grooming',                'Hair Oil'],
    [/hair serum|hair growth/,                 'Hair & Grooming',                'Hair Serum'],
    [/beard/,                                  'Hair & Grooming',                'Beard Care'],
    [/hair colou?r|hair dye/,                  'Hair & Grooming',                'Hair Colour'],
    [/wax|pomade|hair gel|styling/,            'Hair & Grooming',                'Styling'],
    [/body wash|shower gel/,                   'Body Care & Hygiene',            'Body Wash'],
    [/\bsoap\b/,                               'Body Care & Hygiene',            'Soap'],
    [/deodorant|deo spray|perfume/,            'Body Care & Hygiene',            'Deodorant'],
    [/intimate|menstrual|period|sanitary/,     'Body Care & Hygiene',            'Intimate Hygiene'],
    [/toothpaste|toothbrush|oral|floss/,       'Body Care & Hygiene',            'Oral Care'],
    [/condom|lubricant|sexual/,                'Body Care & Hygiene',            'Sexual Wellness'],
    [/baby|infant|diaper/,                     'Body Care & Hygiene',            'Baby Care'],
    [/detergent|floor cleaner|dishwash/,       'Body Care & Hygiene',            'Home Hygiene'],
    [/coffee|green tea|\btea\b/,               'Nutrition & Foods',              'Coffee & Tea'],
    [/almond|cashew|walnut|dry fruit|makhana/, 'Nutrition & Foods',              'Dry Fruits & Nuts'],
    [/muesli|granola|oats|cereal|breakfast/,   'Nutrition & Foods',              'Breakfast & Cereal'],
    [/protein bar|energy bar|protein snack/,   'Nutrition & Foods',              'Protein Snack'],
    [/health drink|electrolyte|hydration/,     'Nutrition & Foods',              'Health Drink'],
    [/gum\b/,                                  'Nutrition & Foods',              'Functional Gum'],
    [/masala|spice|ghee|honey|oil pack/,       'Nutrition & Foods',              'Cooking Essentials'],
    [/superfood|chia|flax|moringa|spirulina/,  'Nutrition & Foods',              'Superfood'],
    [/gummies|gummy/,                          'Supplements & Sports Nutrition', 'Gummies'],
  ];
  for (const [re, category, productType] of rules) {
    if (re.test(t)) return { category, productType };
  }
  return { category: 'Nutrition & Foods', productType: 'Superfood' };
}

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

async function convertUrlToAffiliate(url: string): Promise<{ affiliateUrl: string; affiliateGenerated: boolean }> {
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
    if (response.ok && data.success && data.data) {
      return { affiliateUrl: data.data, affiliateGenerated: true };
    }
  } catch (err: any) {
    console.error('[convertUrlToAffiliate] Error:', err?.message);
  }
  return { affiliateUrl: url, affiliateGenerated: false };
}

// ─── Admin: Bulk Import Products from URL list ───────────────
// POST /api/admin/bulk-import
// Accepts { urls: string[] } — scrapes, curates, AND saves each product server-side.
// Returns per-URL status: { url, savedId?, duplicate?, noAffiliate?, error? }
// This avoids N concurrent POST /api/products calls from the frontend.

function detectSegmentAndType(title: string, category: string, subCategory: string): { productSegment: string; productType: string } {
  const text = `${title || ''} ${category || ''} ${subCategory || ''}`.toLowerCase();
  let productSegment = 'Upperwear';
  let productType = 'T-Shirt';
  if (text.match(/jeans|trouser|pant|cargo|chino|shorts/)) {
    productSegment = 'Bottomwear';
    productType = text.includes('jeans') ? 'Jeans' : text.includes('cargo') ? 'Cargo Pants' : text.includes('jogger') ? 'Joggers' : text.includes('chino') ? 'Chinos' : text.includes('shorts') ? 'Shorts' : 'Trousers';
  } else if (text.match(/shoe|sneaker|boot|loafer/)) {
    productSegment = 'Footwear';
    productType = text.includes('sneaker') ? 'Sneakers' : text.includes('boot') ? 'Boots' : text.includes('loafer') ? 'Loafers' : 'Formal Shoes';
  } else if (text.match(/hoodie|sweatshirt|jacket|overshirt/)) {
    productSegment = 'Outerwear';
    productType = text.includes('hoodie') ? 'Hoodie' : text.includes('sweatshirt') ? 'Sweatshirt' : text.includes('overshirt') ? 'Overshirt' : 'Jacket';
  } else if (text.match(/kurta|nehru/)) {
    productSegment = 'Ethnic Wear';
    productType = text.includes('set') ? 'Kurta Set' : text.includes('nehru') ? 'Nehru Jacket' : 'Kurta';
  } else if (text.match(/belt|cap|wallet|socks/)) {
    productSegment = 'Accessories';
    productType = text.includes('belt') ? 'Belt' : text.includes('cap') ? 'Cap' : text.includes('wallet') ? 'Wallet' : 'Socks';
  } else {
    productType = text.includes('polo') ? 'Polo' : text.includes('henley') ? 'Henley' : text.includes('shirt') ? 'Shirt' : 'T-Shirt';
  }
  return { productSegment, productType };
}

function getSizeOptionsServer(segment: string): string[] {
  if (segment === 'Footwear') return ['UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];
  if (segment === 'Bottomwear') return ['30', '32', '34', '36', '38'];
  return ['M', 'L', 'XL', 'XXL', '3XL'];
}

function mapCuratedDataToCategories(category: string): string[] {
  if (category === 'Ethnic Wear') return ['Ethnic Wear'];
  if (category === 'Formals') return ['Formal Wear', 'Business Casual'];
  if (category === 'Streetwear') return ['Streetwear', 'Casual Wear'];
  return ['Casual Wear'];
}

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
    const apiKey = process.env.GEMINI_API_KEY;

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

      // ── Step 1: Scrape ─────────────────────────────────────
      let scraped: any = {};
      let retailerName = 'Retailer';
      try {
        const importer = ImporterFactory.getImporter(parsedUrl.href);
        scraped = await importer.importProduct(parsedUrl.href);
        retailerName = importer.retailerName;
      } catch (err: any) {
        console.warn(`[BulkImport] Scraper failed for ${url}:`, err?.message);
      }

      // ── Step 2: Block page detection ───────────────────────
      const isBlocked = !scraped.title ||
        scraped.title.toLowerCase().includes('something went wrong') ||
        scraped.title.toLowerCase().includes('oops') ||
        scraped.title.toLowerCase().includes('access denied') ||
        scraped.title.toLowerCase().includes('cloudflare') ||
        scraped.title.toLowerCase().includes('attention required') ||
        scraped.title.toLowerCase().includes('robot check');

      if (isBlocked) {
        const urlMetadata = parseMetadataFromUrl(parsedUrl.href);
        scraped = {
          ...scraped,
          title: urlMetadata.title || scraped.title || (vertical === 'wellness' ? 'Curated Wellness Product' : 'Curated Tall Garment'),
          brand: urlMetadata.brand || scraped.brand || 'Brand',
          retailer: retailerName,
          isScrapeBlocked: true
        };
      }

      // ── Step 3: Curate (Gemini or fallback) ───────────────
      let curated: any = null;
      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = buildCurationPrompt(vertical, scraped, parsedUrl.href);

          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
          });
          const text = response.text || '';
          curated = JSON.parse(text.trim());
          if (scraped.images && scraped.images.length > 0) {
            curated.images = scraped.images;
          }
        } catch (err: any) {
          console.warn(`[BulkImport] Gemini failed for ${url}, using fallback:`, err?.message);
        }
      }

      if (!curated) {
        try {
          curated = vertical === 'wellness'
            ? runWellnessFallbackParser(scraped, parsedUrl.href, retailerName)
            : runFallbackParser(scraped, parsedUrl.href, retailerName);
        } catch (err: any) {
          results.push({ url, success: false, error: err?.message ?? 'Failed to parse product data.' });
          continue;
        }
      }

      // ── Step 4: Affiliate conversion ───────────────────────
      const affiliateInfo = await convertUrlToAffiliate(url);

      // ── Step 5: Build and save product ────────────────────
      try {
        const isWellness = vertical === 'wellness';

        // Wellness rows carry the wellness taxonomy in the same segment/type
        // columns fashion uses, so no extra tables are needed.
        const wellnessCategory = isWellness
          ? (WELLNESS_CATEGORY_NAMES.includes(curated.category)
              ? curated.category
              : detectWellnessCategoryAndType(`${curated.title || ''} ${curated.category || ''} ${curated.productType || ''}`).category)
          : '';

        const { productSegment, productType } = isWellness
          ? {
              productSegment: wellnessCategory,
              productType: curated.productType
                || detectWellnessCategoryAndType(`${curated.title || ''} ${curated.category || ''}`).productType,
            }
          : detectSegmentAndType(
              curated.title || '',
              curated.category || '',
              curated.subCategory || ''
            );
        // A polo/tee/jeans etc. is versatile enough to suit almost every
        // category and occasion — union the smart defaults with whatever
        // Gemini/the fallback parser returned instead of trusting one bucket.
        const versatility = isWellness ? null : getGarmentVersatilityDefaults(productType);
        const categories = isWellness
          ? [wellnessCategory]
          : [...new Set([...(versatility?.categories ?? []), ...mapCuratedDataToCategories(curated.category || '')])];
        const sizes = isWellness ? [] : getSizeOptionsServer(productSegment).slice(0, 4);
        const mergedOccasions = [...new Set([...(versatility?.occasions ?? []), ...(curated.occasions || [])])];
        const mergedSeasons = [...new Set([...(versatility?.seasons ?? []), ...(curated.seasons || [])])];
        const slugId = (curated.title || 'product')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 55);

        const newProduct: any = {
          id: `${slugId}-${Date.now().toString().slice(-5)}`,
          vertical,
          brand: curated.brand || scraped.brand || 'Brand',
          title: curated.title || scraped.title || 'Imported Product',
          category: isWellness ? wellnessCategory : (curated.category || 'Casuals'),
          categories,
          subCategory: isWellness ? (curated.productType || '') : (curated.subCategory || ''),
          productSegment,
          productType,
          images: curated.images || [],
          occasions: isWellness ? [] : (mergedOccasions.length > 0 ? mergedOccasions : ['Daily Wear']),
          seasons: isWellness ? [] : (mergedSeasons.length > 0 ? mergedSeasons : ['All Season']),
          colors: isWellness ? [] : (curated.colors || []),
          sizes,
          fitType: isWellness ? '' : 'Regular Tall',
          retailer: curated.retailer || retailerName,
          affiliateUrl: affiliateInfo.affiliateUrl || url,
          priceAtRetailer: curated.price || 0,
          merchantLinks: [{ store: curated.retailer || retailerName, url, price: curated.price || 0 }],
          verdicts: [],
          verifiedTier: 'community',
          description: curated.description || '',
          tags: curated.tags || (isWellness ? [] : ['tall-friendly']),
          material: curated.material || '',
          tallFriendly: isWellness ? false : (curated.tallFit?.tallFriendly ?? true),
          heightRanges: isWellness ? [] : (curated.tallFit?.recommendedHeightRanges || []),
          bodyTypes: isWellness ? [] : (curated.tallFit?.bodyTypes || ['Athletic']),
          fitHighlights: isWellness ? [] : (curated.tallFit?.highlights || []),
          // Wellness-only attributes
          form: isWellness ? (curated.form || '') : '',
          netQuantity: isWellness ? (curated.netQuantity || '') : '',
          concerns: isWellness ? (curated.concerns || []) : [],
          keyIngredients: isWellness ? (curated.keyIngredients || []) : [],
          dietTags: isWellness ? (curated.dietTags || []) : [],
          isFeatured: false,
          reviewsCount: 0,
          averageRating: 0,
          outOfStock: false,
          verificationBadges: [],
          measurements: {},
          merchantLinks2: undefined,
        };
        // Remove undefined merchantLinks2 hack
        delete newProduct.merchantLinks2;

        const saveResult = await productService.create(newProduct);
        if (saveResult.error) {
          // Could be a title+brand duplicate discovered at DB level
          const isDup = saveResult.error.includes('already exists');
          results.push({ url, success: isDup ? false : false, duplicate: isDup, error: saveResult.error });
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


