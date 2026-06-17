// src/lib/importers/MyntraImporter.ts
// Imports product data from Myntra product pages.
// Strategy: Extract from embedded window.__DATA__ JSON blob in the initial HTML.

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class MyntraImporter extends BaseImporter {
  readonly retailerName = 'Myntra';

  canHandle(url: string): boolean {
    return url.includes('myntra.com');
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);

    // Strategy 1: Extract from embedded window.__DATA__ JSON
    const embedded = this.extractEmbeddedState(html, [
      /window\.__myx\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__DATA__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /"pdpData"\s*:\s*(\{.+?\})\s*,\s*"seoData"/s,
    ]);

    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }

    // Strategy 2: JSON-LD
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd) {
      return this.parseJsonLd(jsonLd, url);
    }

    // Strategy 3: Meta tags + DOM fallback
    return this.parseDom(html, url);
  }

  private parseEmbeddedData(data: any, url: string): ImportedProduct {
    // Navigate through common Myntra embedded data structures
    const pdp = data?.pdpData ?? data?.product ?? data;
    const media = pdp?.media ?? pdp?.images ?? {};
    const pricing = pdp?.price ?? pdp?.priceInfo ?? {};
    const sizes = pdp?.sizes ?? pdp?.sizeChartDetail ?? [];

    const images: string[] = [];
    if (Array.isArray(media?.albums)) {
      media.albums.forEach((album: any) => {
        if (Array.isArray(album.images)) {
          album.images.forEach((img: any) => {
            let src = img?.secureSrc || img?.imageURL || img?.src;
            if (src && typeof src === 'string') {
              if (src.includes('($height)')) {
                src = src
                  .replace('($height)', '1080')
                  .replace('($width)', '810')
                  .replace('($qualityPercentage)', '90');
              }
              images.push(src);
            }
          });
        }
      });
    }

    if (images.length === 0) {
      const rawImages = media?.images ?? media?.albumMedia ?? [];
      for (const img of rawImages) {
        let src = img?.secureSrc ?? img?.imageURL ?? img?.src ?? img?.url;
        if (src && typeof src === 'string') {
          if (src.includes('($height)')) {
            src = src
              .replace('($height)', '1080')
              .replace('($width)', '810')
              .replace('($qualityPercentage)', '90');
          }
          images.push(src);
        }
      }
    }

    const sizeList = sizes
      .map((s: any) => s?.label ?? s?.size ?? s?.displayValue)
      .filter(Boolean);

    const name = pdp?.name ?? pdp?.productDisplayName ?? '';
    const brandName = pdp?.brand?.name ?? pdp?.brandName ?? '';

    return {
      brand: brandName || undefined,
      title: name || undefined,
      description: this.stripHtml(pdp?.description ?? pdp?.productDescriptors?.description?.value),
      price: this.parsePrice(String(pricing?.discounted ?? pricing?.salePrice ?? pricing?.mrp ?? '')),
      originalPrice: this.parsePrice(String(pricing?.mrp ?? '')),
      discountPercent: pricing?.discountPercent ?? undefined,
      images: images.length > 0 ? images : undefined,
      sizes: sizeList.length > 0 ? sizeList : undefined,
      colors: pdp?.colours ? [pdp.colours] : undefined,
      material: pdp?.fabric ?? pdp?.material ?? undefined,
      careInstructions: pdp?.careInfo ?? undefined,
      averageRating: pdp?.ratings?.averageRating ?? undefined,
      reviewsCount: pdp?.ratings?.totalCount ?? undefined,
      retailer: 'Myntra',
      retailerUrl: url,
    };
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image)
      ? data.image
      : data.image ? [data.image] : [];

    return {
      brand: data.brand?.name ?? data.brand ?? undefined,
      title: data.name ?? undefined,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      colors: data.color ? [data.color] : undefined,
      material: data.material ?? undefined,
      averageRating: data.aggregateRating?.ratingValue ?? undefined,
      reviewsCount: data.aggregateRating?.reviewCount ?? undefined,
      retailer: 'Myntra',
      retailerUrl: url,
    };
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);
    const price = this.extractPriceFromDom(html);
    const images = this.extractImagesFromDom(html, url);

    return {
      title: (meta['og:title'] ?? $('h1').first().text().trim()) || undefined,
      description: meta['og:description'] ?? undefined,
      price,
      images: images.length > 0 ? images : undefined,
      retailer: 'Myntra',
      retailerUrl: url,
    };
  }
}
