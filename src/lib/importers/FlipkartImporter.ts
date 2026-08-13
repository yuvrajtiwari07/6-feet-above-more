// src/lib/importers/FlipkartImporter.ts
// Imports product data from Flipkart product pages.
//
// Flipkart ships NO JSON-LD Product data (verified against live PDP pages),
// and window.__INITIAL_STATE__ only contains nav/widget state — its top
// nodes are `multiWidgetState` (header/category-nav) and `additionalInfo`,
// with no real product object anywhere in the tree for a typical listing.
// A loose "find any node with a .title" deep search reliably matches junk
// like `{"title":"Electronics","targetUrl":"/categories/electronics"}` from
// the top-nav category strip before it ever finds real data — which is
// exactly what was shipping as the product's title.
//
// og:title / og:image, by contrast, are reliably correct (Flipkart sets them
// for SEO), so they're the trusted baseline here. Embedded state and JSON-LD
// are kept only as enrichment (price/sizes/rating), gated behind a much
// stricter check (`productName` specifically, not generic `.title`) so a
// nav tile can never satisfy it.

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
    const meta = this.extractMetaTags(html);
    const $ = cheerio.load(html);

    const { title: metaTitle, brand: metaBrand } = this.parseFlipkartTitle(meta['og:title']);

    const structuredImages = meta['og:image'] ? [meta['og:image']] : [];
    const images = this.mergeImages(structuredImages, html, url);

    const domPrice = this.extractPriceFromDom(html);
    const description = this.extractDescriptionFromDom(html);

    // Enrichment only — never the source of truth for title/brand.
    const pdp = this.findRealPdpNode(html);
    const jsonLd = this.extractJsonLd(html, 'Product');
    const jsonLdOffers = jsonLd ? this.parseJsonLdOffer(jsonLd.offers) : {};

    const price =
      domPrice ??
      jsonLdOffers.price ??
      this.parsePrice(String(pdp?.price?.finalPrice ?? pdp?.finalPrice ?? ''));

    const sizes = (pdp?.sizes ?? [])
      .map((s: any) => s?.displayId ?? s?.id ?? s)
      .filter((s: any): s is string => typeof s === 'string');

    return {
      brand: metaBrand ?? pdp?.brandName ?? (jsonLd?.brand?.name ?? jsonLd?.brand) ?? undefined,
      title: metaTitle ?? pdp?.productName ?? jsonLd?.name ?? $('h1').first().text().trim() ?? undefined,
      description: description || this.stripHtml(pdp?.description ?? pdp?.productDescription) || this.stripHtml(jsonLd?.description) || undefined,
      price,
      originalPrice: jsonLdOffers.originalPrice ?? this.parsePrice(String(pdp?.price?.mrp ?? pdp?.mrp ?? '')),
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

  /**
   * Flipkart's <title>/og:title is consistently formatted as
   * "{Product Title} - Buy {Product Title} Online at Best Prices in India | Flipkart.com".
   * Strips the marketing boilerplate, and lifts a leading ALL-CAPS run
   * (Flipkart lists most brand names in caps, e.g. "METRONAUT Men…") as the
   * brand. Returns nothing rather than guessing wrong for lowercase/mixed
   * case brand names — the admin fills those in manually, same as today.
   */
  private parseFlipkartTitle(raw?: string): { title?: string; brand?: string } {
    if (!raw) return {};
    const title = raw.split(/\s+-\s+Buy\s+/i)[0].trim();
    if (!title) return {};
    const brandMatch = title.match(/^([A-Z0-9&]+(?:\s[A-Z0-9&]+){0,2})\s+(?=[A-Z][a-z])/);
    return { title, brand: brandMatch?.[1] };
  }

  /**
   * Looks for a genuine PDP object in window.__INITIAL_STATE__ — requires
   * `productName` specifically (not the generic `.title` key that nav/widget
   * tiles also use) so a category-nav entry can never match.
   */
  private findRealPdpNode(html: string): any {
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s,
      /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s,
    ]);
    if (!embedded) return null;
    return this.deepFind(
      embedded,
      (node: any) =>
        node && typeof node === 'object' &&
        typeof node.productName === 'string' &&
        (node.price || node.sizes || node.pageUrl)
    );
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
