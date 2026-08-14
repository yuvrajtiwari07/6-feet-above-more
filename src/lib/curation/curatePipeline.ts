// src/lib/curation/curatePipeline.ts
// Shared scrape → Gemini-curate → build-product pipeline.
// Used by the single-URL import, bulk-import, and AI discovery/retag job
// endpoints in expressApp.ts so all four entry points stay in sync instead
// of drifting apart as separate copies.

import { GoogleGenAI } from '@google/genai';
import { ImporterFactory } from '../importers/ImporterFactory';
import { getGarmentVersatilityDefaults } from '../garmentVersatility';
import {
  WELLNESS_CATEGORY_NAMES,
  WELLNESS_CONCERNS,
  WELLNESS_DIET_TAGS,
  WELLNESS_FORMS,
  wellnessTypesFor,
} from '../../data/wellness';
import { Vertical } from '../../types';

// "-latest" alias so this always tracks Google's current recommended
// flash-lite model instead of pinning to a dated version that later gets
// deprecated out from under existing API keys (confirmed via a live call —
// see PR notes). Override with GEMINI_MODEL if you want a specific pin.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';

export function normalizeVertical(value: any): Vertical {
  return value === 'wellness' ? 'wellness' : 'fashion';
}

/**
 * The curation prompt differs per vertical: fashion is graded on tall fit,
 * wellness on what the product is made of and what concern it solves.
 */
export function buildCurationPrompt(vertical: Vertical, scraped: any, url: string): string {
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

/** Re-classification prompt for a product already in the catalog (retag) — no scraping, works off stored data. */
export function buildRetagPrompt(vertical: Vertical, existing: any): string {
  const scrapedLike = {
    title: existing.title,
    brand: existing.brand,
    description: existing.description,
    category: existing.category,
    subCategory: existing.subCategory,
    material: existing.material,
    price: existing.priceAtRetailer,
    images: existing.images,
  };
  const base = buildCurationPrompt(vertical, scrapedLike, existing.affiliateUrl || '');
  return `You are re-classifying a product that is ALREADY LIVE in the catalog — this is a cleanup pass, not a fresh import. Use only the given data; do not invent facts not implied by it.\n\n${base}`;
}

/** Maps free text onto the wellness taxonomy (category + product type). */
export function detectWellnessCategoryAndType(text: string): { category: string; productType: string } {
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

/** Keyword classifier used when Gemini is unavailable for a wellness import. */
export function runWellnessFallbackParser(scraped: any, url: string, detectedRetailer: string): any {
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

export function runFallbackParser(scraped: any, url: string, detectedRetailer: string): any {
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

  let category = 'Casuals';
  if (combinedText.match(/kurta|sherwani|nehru|ethnic/)) category = 'Ethnic Wear';
  else if (combinedText.match(/formal|blazer|suit|office/)) category = 'Formals';
  else if (combinedText.match(/street|graphic|oversized|hoodie/)) category = 'Streetwear';

  return {
    success: true,
    source: 'fallback-parser',
    vertical: 'fashion',
    brand: scraped.brand || null,
    title: scraped.title || null,
    images: scraped.images || [],
    category,
    subCategory: scraped.subCategory || '',
    material: scraped.material || null,
    price: typeof scraped.price === 'number' ? scraped.price : null,
    retailer,
    occasions: [],
    seasons: [],
    colors: scraped.colors || [],
    tags: scraped.tags && scraped.tags.length > 0 ? scraped.tags : ['tall-friendly'],
    tallFit: {
      tallFriendly: true,
      recommendedHeightRanges: [],
      bodyTypes: ['Athletic'],
      highlights: [],
    },
  };
}

export function parseMetadataFromUrl(urlStr: string): { brand?: string; title?: string; category?: string } {
  try {
    const url = new URL(urlStr);
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return {};

    let titleRaw = '';
    let brandRaw = '';
    const categoryRaw = '';

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

export async function convertUrlToAffiliate(url: string): Promise<{ affiliateUrl: string; affiliateGenerated: boolean }> {
  try {
    const apiToken = process.env.EARNKARO_API_KEY;
    if (!apiToken) return { affiliateUrl: url, affiliateGenerated: false };

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

export function detectSegmentAndType(title: string, category: string, subCategory: string): { productSegment: string; productType: string } {
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

export function getSizeOptionsServer(segment: string): string[] {
  if (segment === 'Footwear') return ['UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'];
  if (segment === 'Bottomwear') return ['30', '32', '34', '36', '38'];
  return ['M', 'L', 'XL', 'XXL', '3XL'];
}

export function mapCuratedDataToCategories(category: string): string[] {
  if (category === 'Ethnic Wear') return ['Ethnic Wear'];
  if (category === 'Formals') return ['Formal Wear', 'Business Casual'];
  if (category === 'Streetwear') return ['Streetwear', 'Casual Wear'];
  return ['Casual Wear'];
}

export interface ScrapeAndCurateResult {
  scraped: any;
  curated: any;
  retailerName: string;
  isBlocked: boolean;
  source: 'gemini' | 'fallback-parser';
}

/** Scrape a product URL, then curate it with Gemini (or the rule-based fallback if unavailable/failing). */
export async function scrapeAndCurate(url: string, vertical: Vertical): Promise<ScrapeAndCurateResult> {
  const parsedUrl = new URL(url);

  let scraped: any = {};
  let retailerName = 'Retailer';
  try {
    const importer = ImporterFactory.getImporter(parsedUrl.href);
    scraped = await importer.importProduct(parsedUrl.href);
    retailerName = importer.retailerName;
  } catch (err: any) {
    console.warn(`[curatePipeline] Scraper failed for ${url}:`, err?.message);
  }

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

  const apiKey = process.env.GEMINI_API_KEY;
  let curated: any = null;
  let source: 'gemini' | 'fallback-parser' = 'fallback-parser';
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildCurationPrompt(vertical, scraped, parsedUrl.href);
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      const text = response.text || '';
      curated = JSON.parse(text.trim());
      if (scraped.images && scraped.images.length > 0) {
        curated.images = scraped.images;
      }
      source = 'gemini';
    } catch (err: any) {
      console.warn(`[curatePipeline] Gemini failed for ${url}, using fallback:`, err?.message);
    }
  }

  if (!curated) {
    curated = vertical === 'wellness'
      ? runWellnessFallbackParser(scraped, parsedUrl.href, retailerName)
      : runFallbackParser(scraped, parsedUrl.href, retailerName);
    source = 'fallback-parser';
  }

  return { scraped, curated, retailerName, isBlocked, source };
}

/** Re-classifies an existing catalog product (no scraping) via Gemini. Returns null if Gemini is unavailable/fails — caller should skip rather than guess. */
export async function curateExistingProduct(vertical: Vertical, existing: any): Promise<any | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildRetagPrompt(vertical, existing);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    const text = response.text || '';
    const curated = JSON.parse(text.trim());
    curated.images = existing.images || [];
    return curated;
  } catch (err: any) {
    console.warn(`[curatePipeline] Retag curation failed for product ${existing.id}:`, err?.message);
    return null;
  }
}

/** Assembles the DB-ready product object from a curation result. Does not save. */
export function buildProductFromCuration(
  curated: any,
  scraped: any,
  url: string,
  vertical: Vertical,
  retailerName: string,
  affiliateInfo: { affiliateUrl: string; affiliateGenerated: boolean }
): any {
  const isWellness = vertical === 'wellness';

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

  return {
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
  };
}
