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
      return this.parseJsonLd(jsonLd, url, html);
    }

    // Strategy 2: Embedded window state
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__APP_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /__NEXT_DATA__['"]\s*type="application\/json"\s*>\s*(\{.+?\})\s*<\/script>/s,
    ]);

    if (embedded) {
      return this.parseEmbeddedData(embedded, url, html);
    }

    // Strategy 3: DOM + meta tags
    return this.parseDom(html, url);
  }

  private parseJsonLd(data: any, url: string, html: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    let images = Array.isArray(data.image)
      ? data.image.filter((i: any) => typeof i === 'string')
      : data.image ? [data.image] : [];

    if (images.length === 0) {
      images = this.extractImagesFromDom(html, url);
    }

    const sizes: string[] = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer: any) => {
        if (offer.itemOffered?.size) sizes.push(offer.itemOffered.size);
      });
    }

    const description = this.stripHtml(data.description) || this.extractDescriptionFromDom(html);

    return {
      brand: data.brand?.name ?? data.brand ?? undefined,
      title: data.name ?? undefined,
      description,
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

  private parseEmbeddedData(data: any, url: string, html: string): ImportedProduct {
    // AJIO often stores data in props.pageProps or window.__INITIAL_STATE__
    let productData =
      data?.props?.pageProps?.product ??
      data?.product ??
      data?.pageData?.product ??
      data;

    // Handle AJIO's dictionary nesting in initial state
    if (productData && productData.productDetails) {
      const keys = Object.keys(productData.productDetails);
      if (keys.length > 0) {
        productData = productData.productDetails[keys[0]];
      }
    }

    let images = (productData?.images ?? productData?.media ?? [])
      .map((img: any) => img?.url ?? img?.src ?? img)
      .filter((src: any) => typeof src === 'string' && src.startsWith('http'));

    if (images.length === 0) {
      images = this.extractImagesFromDom(html, url);
    }

    // AJIO prices are nested objects: e.g. price: { value: 1299, formattedValue: "Rs. 1,299" }
    const priceVal = productData?.price?.value ?? productData?.salePrice ?? productData?.price;
    const mrpVal = productData?.wasPriceData?.value ?? productData?.mrp ?? productData?.wasPriceData;

    const price = priceVal != null ? this.parsePrice(String(priceVal)) : undefined;
    const originalPrice = mrpVal != null ? this.parsePrice(String(mrpVal)) : undefined;

    // Extract sizes from sizeVariants: e.g. [{ size: "32", scCode: "..." }]
    const sizes: string[] = (productData?.sizeVariants ?? [])
      .map((v: any) => String(v?.size ?? ''))
      .filter(Boolean);

    const description = this.stripHtml(productData?.description) || this.extractDescriptionFromDom(html);

    return {
      brand: productData?.brandName ?? productData?.brand ?? undefined,
      title: productData?.name ?? productData?.productName ?? undefined,
      description,
      price,
      originalPrice,
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
      colors: productData?.colour ? [productData.colour] : undefined,
      material: productData?.fabric ?? productData?.material ?? undefined,
      retailer: 'AJIO',
      retailerUrl: url,
    };
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    const title =
      $('.prod-name').first().text().trim() ||
      meta['og:title'] ||
      $('h1').first().text().trim() ||
      undefined;

    const price = this.extractPriceFromDom(html);
    const images = this.extractImagesFromDom(html, url);
    const description = this.extractDescriptionFromDom(html);

    return {
      title,
      price,
      description,
      images: images.length > 0 ? images : undefined,
      retailer: 'AJIO',
      retailerUrl: url,
    };
  }
}
