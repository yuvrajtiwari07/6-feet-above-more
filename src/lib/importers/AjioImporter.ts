// src/lib/importers/AjioImporter.ts
// Imports product data from AJIO product pages.
// Strategy: JSON-LD → embedded state → meta tags → DOM cheerio fallback

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class AjioImporter extends BaseImporter {
  readonly retailerName = 'AJIO';

  canHandle(url: string): boolean {
    return url.includes('ajio.com');
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);

    // Strategy 1: JSON-LD structured data
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }

    // Strategy 2: Embedded window state
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__APP_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /__NEXT_DATA__['"]\s*type="application\/json"\s*>\s*(\{.+?\})\s*<\/script>/s,
    ]);

    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }

    // Strategy 3: DOM + meta tags
    return this.parseDom(html, url);
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image)
      ? data.image.filter((i: any) => typeof i === 'string')
      : data.image ? [data.image] : [];

    const sizes: string[] = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer: any) => {
        if (offer.itemOffered?.size) sizes.push(offer.itemOffered.size);
      });
    }

    return {
      brand: data.brand?.name ?? data.brand ?? undefined,
      title: data.name ?? undefined,
      description: this.stripHtml(data.description),
      ...offers,
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
      colors: data.color ? [data.color] : undefined,
      material: data.material ?? undefined,
      averageRating: data.aggregateRating?.ratingValue
        ? Number(data.aggregateRating.ratingValue)
        : undefined,
      reviewsCount: data.aggregateRating?.reviewCount
        ? Number(data.aggregateRating.reviewCount)
        : undefined,
      retailer: 'AJIO',
      retailerUrl: url,
    };
  }

  private parseEmbeddedData(data: any, url: string): ImportedProduct {
    // AJIO often stores data in props.pageProps or similar Next.js structure
    const productData =
      data?.props?.pageProps?.product ??
      data?.product ??
      data?.pageData?.product ??
      data;

    const images = (productData?.images ?? productData?.media ?? [])
      .map((img: any) => img?.url ?? img?.src ?? img)
      .filter((src: any) => typeof src === 'string' && src.startsWith('http'));

    return {
      brand: productData?.brandName ?? productData?.brand ?? undefined,
      title: productData?.name ?? productData?.productName ?? undefined,
      description: this.stripHtml(productData?.description),
      price: this.parsePrice(String(productData?.price ?? productData?.salePrice ?? '')),
      originalPrice: this.parsePrice(String(productData?.mrp ?? '')),
      images: images.length > 0 ? images : undefined,
      colors: productData?.colour ? [productData.colour] : undefined,
      material: productData?.fabric ?? productData?.material ?? undefined,
      retailer: 'AJIO',
      retailerUrl: url,
    };
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    // AJIO often has product title in .prod-name
    const title =
      $('.prod-name').first().text().trim() ||
      meta['og:title'] ||
      $('h1').first().text().trim() ||
      undefined;

    const price = this.extractPriceFromDom(html);
    const images = this.extractImagesFromDom(html, url);

    return {
      title,
      price,
      description: meta['og:description'] ?? undefined,
      images: images.length > 0 ? images : undefined,
      retailer: 'AJIO',
      retailerUrl: url,
    };
  }
}
