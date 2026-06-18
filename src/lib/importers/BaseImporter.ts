// src/lib/importers/BaseImporter.ts
// Abstract base class with shared fetch/parse utilities for all retailer importers.
// All importers extend this class and override importProduct().

import * as cheerio from 'cheerio';
import type { ImportedProduct, ProductImporter } from './types.js';

export abstract class BaseImporter implements ProductImporter {
  abstract readonly retailerName: string;
  abstract canHandle(url: string): boolean;
  abstract importProduct(url: string): Promise<ImportedProduct>;

  // ─── Shared Fetch Utility ────────────────────────────────────────────────

  /**
   * Fetches the raw HTML of a page, mimicking a real browser request.
   */
  protected async fetchPage(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }

    return response.text();
  }

  // ─── JSON-LD Extraction ──────────────────────────────────────────────────

  /**
   * Extracts the first matching JSON-LD object from <script type="application/ld+json"> tags.
   * Returns null if nothing useful is found.
   */
  protected extractJsonLd(html: string, type?: string): Record<string, any> | null {
    const $ = cheerio.load(html);
    const results: Record<string, any>[] = [];

    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '{}');
        const items = Array.isArray(data) ? data : [data];
        results.push(...items);
      } catch {
        // Invalid JSON — skip
      }
    });

    if (!results.length) return null;

    if (type) {
      return results.find(
        (r) => r['@type'] === type || (Array.isArray(r['@type']) && r['@type'].includes(type))
      ) ?? null;
    }

    // Prefer Product type, then first result
    return (
      results.find((r) => r['@type'] === 'Product') ??
      results[0] ??
      null
    );
  }

  // ─── Meta Tag Extraction ─────────────────────────────────────────────────

  /**
   * Extracts OpenGraph and standard meta tag values from the page.
   */
  protected extractMetaTags(html: string): Record<string, string> {
    const $ = cheerio.load(html);
    const meta: Record<string, string> = {};

    $('meta').each((_, el) => {
      const property = $(el).attr('property') || $(el).attr('name');
      const content = $(el).attr('content');
      if (property && content) {
        meta[property] = content;
      }
    });

    return meta;
  }

  // ─── Embedded Window State Extraction ───────────────────────────────────

  /**
   * Extracts JSON data embedded in <script> tags as window variables.
   * Many SPAs (Myntra, AJIO, Flipkart) embed full product state in the initial HTML.
   *
   * @param html - Raw HTML string
   * @param patterns - Array of regex patterns to try; first successful match wins
   */
  protected extractEmbeddedState(
    html: string,
    patterns: RegExp[]
  ): Record<string, any> | null {
    for (const pattern of patterns) {
      try {
        const match = html.match(pattern);
        if (match && match[1]) {
          return JSON.parse(match[1]);
        }
      } catch {
        // Pattern matched but JSON was malformed — try next
      }
    }
    return null;
  }

  // ─── Shared Parsing Helpers ──────────────────────────────────────────────

  /**
   * Cleans a price string like "₹1,299" → 1299
   */
  protected parsePrice(raw: string | undefined | null): number | undefined {
    if (!raw) return undefined;
    const clean = raw.replace(/[^\d.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Parses a comma or pipe separated string into a clean string array.
   */
  protected splitList(raw: string | undefined | null, sep = /[,|]/): string[] {
    if (!raw) return [];
    return raw
      .split(sep)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /**
   * Strips HTML tags from a string.
   */
  protected stripHtml(raw: string | undefined | null): string {
    if (!raw) return '';
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalizes a JSON-LD offer block into price + discount.
   */
  protected parseJsonLdOffer(offer: any): { price?: number; originalPrice?: number; discountPercent?: number } {
    if (!offer) return {};

    const offers = Array.isArray(offer) ? offer[0] : offer;
    const price = this.parsePrice(String(offers.price ?? ''));
    const highPrice = this.parsePrice(String(offers.highPrice ?? ''));

    let discountPercent: number | undefined;
    if (price && highPrice && highPrice > price) {
      discountPercent = Math.round(((highPrice - price) / highPrice) * 100);
    }

    return { price, originalPrice: highPrice, discountPercent };
  }

  /**
   * Robust fallback to find all product images in a page's HTML
   */
  protected extractImagesFromDom(html: string, urlStr: string): string[] {
    const $ = cheerio.load(html);
    const images: string[] = [];
    const meta = this.extractMetaTags(html);

    // 1. Gather from OpenGraph and Twitter cards
    const metaKeys = ['og:image', 'og:image:secure_url', 'twitter:image', 'og:image:url'];
    for (const key of metaKeys) {
      if (meta[key] && !images.includes(meta[key])) {
        images.push(meta[key]);
      }
    }

    // Helper to parse srcset and get highest res
    const parseSrcset = (srcsetStr: string): string => {
      const parts = srcsetStr.split(',').map(p => p.trim());
      if (parts.length === 0) return '';
      // Find the last item in srcset, which is usually the highest resolution
      const lastPart = parts[parts.length - 1];
      return lastPart.split(' ')[0] || '';
    };

    const imageElements: string[] = [];

    // 2. Scan all img and picture source elements for high-quality product images
    $('img, picture source, source').each((_, el) => {
      const srcAttr = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-zoom-src') || $(el).attr('data-original') || $(el).attr('data-lazy-src') || $(el).attr('data-lazy');
      const srcsetAttr = $(el).attr('srcset') || $(el).attr('data-srcset');

      let rawSrc = '';
      if (srcsetAttr) {
        rawSrc = parseSrcset(srcsetAttr);
      } else if (srcAttr) {
        rawSrc = srcAttr.trim();
      }

      if (!rawSrc) return;

      const cleanSrc = rawSrc.split(' ')[0];
      if (!cleanSrc.startsWith('http') && !cleanSrc.startsWith('//')) return;
      const fullSrc = cleanSrc.startsWith('//') ? `https:${cleanSrc}` : cleanSrc;

      if (images.includes(fullSrc) || imageElements.includes(fullSrc)) return;

      // Filter out tiny UI elements, icons, logos, trackers, stars
      const low = fullSrc.toLowerCase();
      if (low.includes('logo') || low.includes('icon') || low.includes('tracker') || low.includes('star') || low.includes('banner') || low.includes('badge') || low.includes('placeholder')) {
        return;
      }

      // Domain specific logic (loosened filters)
      if (urlStr.includes('myntra.com') && low.includes('myntassets.com')) {
        imageElements.push(fullSrc);
      } else if (urlStr.includes('ajio.com') && (low.includes('ajio.com') || low.includes('ajio'))) {
        imageElements.push(fullSrc);
      } else if (urlStr.includes('snitch.co') && (low.includes('cdn.shopify.com') || low.includes('snitch'))) {
        imageElements.push(fullSrc);
      } else if (urlStr.includes('hm.com') && (low.includes('hm.com') || low.includes('hm'))) {
        imageElements.push(fullSrc);
      } else if (urlStr.includes('zara.com') && (low.includes('zara.net') || low.includes('zara.com'))) {
        imageElements.push(fullSrc);
      } else if (low.includes('cdn') || low.includes('product') || low.includes('image') || low.includes('media') || low.includes('upload')) {
        if (!low.includes('avatar') && !low.includes('profile')) {
          imageElements.push(fullSrc);
        }
      }
    });

    return [...images, ...imageElements];
  }

  /**
   * Robust fallback to find price in a page's HTML
   */
  protected extractPriceFromDom(html: string): number | undefined {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    // 1. Look for price meta tags
    const priceMetaKeys = [
      'product:price:amount',
      'og:price:amount',
      'price',
      'product:sale_price:amount',
      'twitter:data1'
    ];

    for (const key of priceMetaKeys) {
      if (meta[key]) {
        const val = this.parsePrice(meta[key]);
        if (val && val > 0) return val;
      }
    }

    // 2. Scan DOM elements for price content
    const priceSelectors = [
      '.pdp-price', '.pdp-sp', '.price', '.sale-price', 
      '[itemprop="price"]', '.product-price', '.current-price'
    ];

    for (const selector of priceSelectors) {
      const text = $(selector).first().text();
      const val = this.parsePrice(text);
      if (val && val > 0) return val;
    }

    // 3. Regex match for Rs. or ₹ in text (last resort)
    const textContent = $('body').text().slice(0, 10000);
    const match = textContent.match(/(?:Rs\.?|₹)\s*([\d,]+(?:\.\d{2})?)/i);
    if (match && match[1]) {
      const val = this.parsePrice(match[1]);
      if (val && val > 0) return val;
    }

    return undefined;
  }

  /**
   * Robust fallback to find product description in a page's HTML
   */
  protected extractDescriptionFromDom(html: string): string | undefined {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    // 1. Look in meta tags (avoid short generic text)
    const descMetaKeys = [
      'og:description',
      'twitter:description',
      'description'
    ];

    for (const key of descMetaKeys) {
      const val = meta[key];
      if (val && val.length > 30 && !val.includes('online at') && !val.includes('Buy') && !val.includes('free shipping')) {
        return this.stripHtml(val);
      }
    }

    // 2. Scan DOM elements for description content
    const descriptionSelectors = [
      '.prod-desc', '.prod-list', '.product-description-content',
      '.pdp-product-description-content', '.pdp-details-common',
      '.product-description', '.product-single__description',
      '.description-block', '[itemprop="description"]',
      '.pdp-desc-section', '#description', '.details-attributes-list',
      '.product-details__description', '.product-detail-info',
      '.desc-container', '.prod-detail-list', '.product-detail-container',
      'div[data-testid="product-description"]', '.item-description'
    ];

    for (const selector of descriptionSelectors) {
      const el = $(selector);
      if (el.length > 0) {
        // If it's a list (like AJIO bullet points), serialize list items to text
        if (el.is('ul') || el.find('li').length > 0) {
          const items: string[] = [];
          el.find('li').each((_, li) => {
            const txt = $(li).text().trim();
            if (txt) items.push(txt);
          });
          if (items.length > 0) {
            return items.join(' | ');
          }
        }
        
        const text = el.text().trim();
        if (text.length > 20) {
          return this.stripHtml(text);
        }
      }
    }

    // Fallback to og:description if nothing else found
    if (meta['og:description']) {
      return this.stripHtml(meta['og:description']);
    }

    return undefined;
  }
}

