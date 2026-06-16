// src/lib/importers/FlipkartImporter.ts
// Imports product data from Flipkart product pages.
// Strategy: window.__INITIAL_STATE__ embedded JSON → JSON-LD → DOM fallback

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class FlipkartImporter extends BaseImporter {
  readonly retailerName = 'Flipkart';

  canHandle(url: string): boolean {
    return url.includes('flipkart.com');
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);

    // Strategy 1: Flipkart embeds product data as window.__INITIAL_STATE__
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s,
      /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s,
    ]);

    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }

    // Strategy 2: JSON-LD
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }

    // Strategy 3: DOM
    return this.parseDom(html, url);
  }

  private parseEmbeddedData(data: any, url: string): ImportedProduct {
    // Navigate common Flipkart state tree
    const pdp = this.deepFind(data, (node: any) =>
      node && typeof node === 'object' && (node.productName || node.title)
    );

    if (!pdp) return { retailer: 'Flipkart', retailerUrl: url };

    const images: string[] = (pdp?.images ?? [])
      .map((img: any) => img?.url ?? img?.src ?? (typeof img === 'string' ? img : null))
      .filter((s: any): s is string => typeof s === 'string' && s.startsWith('http'));

    const sizes = (pdp?.sizes ?? []).map((s: any) => s?.displayId ?? s?.id ?? s).filter(Boolean);

    return {
      brand: pdp?.brandName ?? pdp?.brand ?? undefined,
      title: pdp?.productName ?? pdp?.title ?? undefined,
      description: this.stripHtml(pdp?.description ?? pdp?.productDescription),
      price: this.parsePrice(String(pdp?.price?.finalPrice ?? pdp?.finalPrice ?? '')),
      originalPrice: this.parsePrice(String(pdp?.price?.mrp ?? pdp?.mrp ?? '')),
      discountPercent: pdp?.price?.discountPercentage ?? undefined,
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      colors: pdp?.colour ? [pdp.colour] : undefined,
      material: pdp?.fabric ?? undefined,
      averageRating: pdp?.overallRating ? Number(pdp.overallRating) : undefined,
      reviewsCount: pdp?.totalReviewCount ?? undefined,
      retailer: 'Flipkart',
      retailerUrl: url,
    };
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];

    return {
      brand: data.brand?.name ?? data.brand ?? undefined,
      title: data.name ?? undefined,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      material: data.material ?? undefined,
      averageRating: data.aggregateRating?.ratingValue
        ? Number(data.aggregateRating.ratingValue)
        : undefined,
      reviewsCount: data.aggregateRating?.reviewCount
        ? Number(data.aggregateRating.reviewCount)
        : undefined,
      retailer: 'Flipkart',
      retailerUrl: url,
    };
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    const title = $('span.B_NuCI').text().trim() || meta['og:title'] || undefined;
    const price = this.parsePrice($('div._30jeq3._16Jk6d').first().text() || meta['product:price:amount']);
    const brand = $('span.G6XhRU').text().trim() || undefined;
    const images = meta['og:image'] ? [meta['og:image']] : [];

    return {
      brand,
      title,
      price,
      description: meta['og:description'] ?? undefined,
      images: images.length > 0 ? images : undefined,
      retailer: 'Flipkart',
      retailerUrl: url,
    };
  }

  /** Deep searches an object tree for the first node matching a predicate */
  private deepFind(obj: any, predicate: (node: any) => boolean, depth = 0): any {
    if (depth > 8 || !obj || typeof obj !== 'object') return null;
    if (predicate(obj)) return obj;
    for (const val of Object.values(obj)) {
      const found = this.deepFind(val, predicate, depth + 1);
      if (found) return found;
    }
    return null;
  }
}
