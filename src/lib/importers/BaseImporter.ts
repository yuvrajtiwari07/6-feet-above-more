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

    // 2. Scan all img elements for high-quality product images
    $('img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-zoom-src') || $(el).attr('data-srcset');
      if (!src) return;

      const cleanSrc = src.trim().split(' ')[0]; // Split srcset potential formats
      if (!cleanSrc.startsWith('http') && !cleanSrc.startsWith('//')) return;
      const fullSrc = cleanSrc.startsWith('//') ? `https:${cleanSrc}` : cleanSrc;

      if (images.includes(fullSrc)) return;

      // Filter out tiny UI elements, icons, logos, trackers, stars
      const low = fullSrc.toLowerCase();
      if (low.includes('logo') || low.includes('icon') || low.includes('tracker') || low.includes('star') || low.includes('banner') || low.includes('badge') || low.includes('placeholder')) {
        return;
      }

      // Domain specific logic
      if (urlStr.includes('myntra.com') && (low.includes('myntassets.com') && (low.includes('assets/images/') || low.includes('h_')))) {
        images.push(fullSrc);
      } else if (urlStr.includes('ajio.com') && (low.includes('ajio.com') && (low.includes('prd-images') || low.includes('500x500') || low.includes('1000x1000')))) {
        images.push(fullSrc);
      } else if (urlStr.includes('snitch.co') && (low.includes('cdn.shopify.com') || low.includes('snitch'))) {
        images.push(fullSrc);
      } else if (urlStr.includes('hm.com') && low.includes('hm.com')) {
        images.push(fullSrc);
      } else if (urlStr.includes('zara.com') && low.includes('zara.net')) {
        images.push(fullSrc);
      } else if (low.includes('cdn') || low.includes('product') || low.includes('image') || low.includes('media') || low.includes('upload')) {
        if (!low.includes('avatar') && !low.includes('profile')) {
          images.push(fullSrc);
        }
      }
    });

    return images;
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
}
