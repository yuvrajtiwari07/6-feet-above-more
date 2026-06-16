// src/lib/importers/HmImporter.ts
// Imports product data from H&M (hm.com, h2.com) product pages.
// Strategy: JSON-LD → OpenGraph meta → DOM fallback

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class HmImporter extends BaseImporter {
  readonly retailerName = 'H&M';

  canHandle(url: string): boolean {
    return url.includes('hm.com') || url.includes('h2.com') || url.includes('h&m.com');
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);

    // Strategy 1: JSON-LD — H&M uses structured data reliably
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }

    // Strategy 2: __NEXT_DATA__ (H&M's site is built on Next.js)
    const nextData = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s,
    ]);
    if (nextData) {
      return this.parseNextData(nextData, url);
    }

    // Strategy 3: DOM + meta
    return this.parseDom(html, url);
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);

    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];

    // Extract sizes from offers
    const sizes: string[] = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer: any) => {
        const size = offer.itemOffered?.size ?? offer.size;
        if (size) sizes.push(size);
      });
    }

    // Extract colors from offers
    const colors: string[] = [];
    if (data.color) colors.push(data.color);
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer: any) => {
        const color = offer.itemOffered?.color ?? offer.color;
        if (color && !colors.includes(color)) colors.push(color);
      });
    }

    return {
      brand: 'H&M',
      title: data.name ?? undefined,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
      colors: colors.length > 0 ? [...new Set(colors)] : undefined,
      material: data.material ?? undefined,
      averageRating: data.aggregateRating?.ratingValue
        ? Number(data.aggregateRating.ratingValue)
        : undefined,
      reviewsCount: data.aggregateRating?.reviewCount
        ? Number(data.aggregateRating.reviewCount)
        : undefined,
      retailer: 'H&M',
      retailerUrl: url,
    };
  }

  private parseNextData(data: any, url: string): ImportedProduct {
    const product =
      data?.props?.pageProps?.product ??
      data?.props?.pageProps?.initialData?.product ??
      data;

    const images: string[] = (product?.images ?? product?.galleryImages ?? [])
      .map((img: any) => {
        const src = img?.url ?? img?.src ?? img?.baseUrl;
        return src?.startsWith('http') ? src : src ? `https:${src}` : null;
      })
      .filter(Boolean);

    const sizes = (product?.variants ?? product?.sizes ?? [])
      .map((v: any) => v?.size ?? v?.value ?? v?.label)
      .filter(Boolean);

    return {
      brand: 'H&M',
      title: product?.name ?? product?.title ?? undefined,
      description: this.stripHtml(product?.description ?? product?.longDescription),
      price: this.parsePrice(String(product?.price?.value ?? product?.salePrice ?? '')),
      originalPrice: this.parsePrice(String(product?.price?.originalValue ?? '')),
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      colors: product?.color ? [product.color] : undefined,
      material: product?.material ?? product?.fabric ?? undefined,
      retailer: 'H&M',
      retailerUrl: url,
    };
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    const title = (meta['og:title'] ?? $('h1').first().text().trim()) || undefined;
    const price = this.parsePrice(meta['product:price:amount'] || $('.price-value').first().text());
    const images = meta['og:image'] ? [meta['og:image']] : [];

    return {
      brand: 'H&M',
      title,
      price,
      description: meta['og:description'] ?? undefined,
      images: images.length > 0 ? images : undefined,
      retailer: 'H&M',
      retailerUrl: url,
    };
  }
}
