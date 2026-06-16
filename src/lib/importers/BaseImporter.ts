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
}
