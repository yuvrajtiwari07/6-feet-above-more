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

  // A handful of realistic desktop UAs, rotated per request. This does nothing
  // against real bot-detection (Akamai/PerimeterX, which key off far more than
  // the UA string and largely block by *datacenter IP range* — the reason
  // scraping from a cloud host behaves differently than from a home IP), but
  // it's a free, harmless improvement against basic UA-sniffing rate limits.
  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ];

  /**
   * Fetches the raw HTML of a page, mimicking a real browser request.
   */
  protected async fetchPage(url: string): Promise<string> {
    const userAgent = BaseImporter.USER_AGENTS[Math.floor(Math.random() * BaseImporter.USER_AGENTS.length)];
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept':
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Upgrade-Insecure-Requests': '1',
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
   * Some sites (esp. AggregateOffer) never set `price`, only `lowPrice`/`highPrice`,
   * or nest the real offer one level down in an `offers` array — check all of them.
   */
  protected parseJsonLdOffer(offer: any): { price?: number; originalPrice?: number; discountPercent?: number } {
    if (!offer) return {};

    let offers = Array.isArray(offer) ? offer[0] : offer;
    if (Array.isArray(offers?.offers)) offers = offers.offers[0] ?? offers;

    const price = this.parsePrice(
      String(offers.price ?? offers.lowPrice ?? offers.offers?.[0]?.price ?? '')
    );
    const highPrice = this.parsePrice(String(offers.highPrice ?? ''));

    let discountPercent: number | undefined;
    if (price && highPrice && highPrice > price) {
      discountPercent = Math.round(((highPrice - price) / highPrice) * 100);
    }

    return { price, originalPrice: highPrice, discountPercent };
  }

  /**
   * Merges images pulled from structured data (JSON-LD/embedded state) with a
   * DOM gallery scan, deduped, capped to a sane count.
   *
   * Structured data on many sites (Shopify JSON-LD in particular) only exposes
   * the single "featured image", not the full gallery — merging instead of only
   * falling back when structured data is completely empty is what actually
   * recovers the rest of the product photos.
   */
  protected mergeImages(structured: string[], html: string, urlStr: string, max = 12): string[] {
    const domImages = this.extractImagesFromDom(html, urlStr);
    const merged = [...new Set([...structured, ...domImages])];
    return merged.slice(0, max);
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

      // Filter out tiny UI elements, icons, logos, trackers, stars.
      // Product photography is essentially never SVG on any of these sites —
      // SVG is what nav/header icon sprites use (e.g. Flipkart's whole
      // static-assets-web.flixcart.com icon set: cart, gifts, help, rewards…
      // matched the old generic "contains 'image'" rule since it's served
      // from a path literally called /p/images/).
      const low = fullSrc.toLowerCase();
      if (
        low.includes('logo') || low.includes('icon') || low.includes('tracker') ||
        low.includes('star') || low.includes('banner') || low.includes('badge') ||
        low.includes('placeholder') || /\.svg(\?|$)/.test(low)
      ) {
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
      } else if (urlStr.includes('flipkart.com') && low.includes('rukminim')) {
        // Flipkart's actual product-photo CDN (rukminim1/2/3.flixcart.com) —
        // scoped explicitly so its separate UI-asset CDN never qualifies.
        imageElements.push(fullSrc);
      } else if (urlStr.includes('flipkart.com')) {
        // Any other flixcart/flipkart-hosted asset on a PDP is UI chrome, not
        // a product photo — skip rather than falling into the generic rule.
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
      '.pdp-price', '.pdp-sp', '.price', '.sale-price', '.selling-price',
      '.final-price', '.offer-price', '.discounted-price', '.current-price',
      '[itemprop="price"]', '[data-price]', '[data-product-price]', '.product-price',
    ];

    for (const selector of priceSelectors) {
      const el = $(selector).first();
      const val = this.parsePrice(el.attr('content') || el.attr('data-price') || el.text());
      if (val && val > 0) return val;
    }

    // 3. Scan inline <script> JSON blobs for a plausible "price" key — many
    // React/Next.js storefronts embed their state as JSON even when there is
    // no dedicated __NEXT_DATA__ tag we recognize (custom hydration setups).
    let scriptPrice: number | undefined;
    $('script').each((_, el) => {
      if (scriptPrice) return;
      const content = $(el).html() ?? '';
      if (content.length > 200000) return; // skip huge bundles, not data blobs
      const m = content.match(/"(?:sellingPrice|salePrice|finalPrice|discountedPrice|price)"\s*:\s*"?(\d{2,7}(?:\.\d{1,2})?)"?/);
      if (m && m[1]) {
        const val = this.parsePrice(m[1]);
        if (val && val > 0) scriptPrice = val;
      }
    });
    if (scriptPrice) return scriptPrice;

    // 4. Regex match for Rs. or ₹ in visible text (last resort)
    const textContent = $('body').text().slice(0, 10000);
    const match = textContent.match(/(?:Rs\.?|₹|INR)\s*([\d,]+(?:\.\d{2})?)/i);
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

