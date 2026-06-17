// src/lib/importers/GenericImporter.ts
// Universal fallback importer — handles any URL not matched by a specific importer.
// Uses JSON-LD → OpenGraph meta → DOM extraction chain.
// Also handles: Urbanic, Bewakoof, Snitch, Rare Rabbit, and future unsupported retailers.

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class GenericImporter extends BaseImporter {
  readonly retailerName = 'Retailer';

  // Handles everything — always returns true (last resort)
  canHandle(_url: string): boolean {
    return true;
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);
    const meta = this.extractMetaTags(html);
    const retailerName = this.detectRetailerName(url, meta);

    // Strategy 1: JSON-LD Product
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      return {
        ...this.parseJsonLd(jsonLd, url),
        retailer: retailerName,
        retailerUrl: url,
      };
    }

    // Strategy 2: __NEXT_DATA__ (many modern e-commerce sites use Next.js)
    const nextData = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s,
    ]);
    if (nextData) {
      const parsed = this.parseNextData(nextData, url, retailerName);
      if (parsed.title || parsed.price || (parsed.images?.length ?? 0) > 0) {
        return parsed;
      }
    }

    // Strategy 3: OpenGraph + general DOM
    return this.parseFromMeta(meta, html, url, retailerName);
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];

    const sizes: string[] = [];
    const colors: string[] = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((o: any) => {
        const size = o.itemOffered?.size ?? o.size;
        const color = o.itemOffered?.color ?? o.color;
        if (size) sizes.push(size);
        if (color && !colors.includes(color)) colors.push(color);
      });
    }
    if (data.color && !colors.includes(data.color)) colors.push(data.color);

    return {
      brand: data.brand?.name ?? data.brand ?? undefined,
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
    };
  }

  private parseNextData(data: any, url: string, retailerName: string): ImportedProduct {
    // Common Next.js pageProps structures
    const product =
      data?.props?.pageProps?.product ??
      data?.props?.pageProps?.data?.product ??
      data?.props?.pageProps?.productDetails ??
      data?.props?.pageProps?.initialData?.product;

    if (!product) return { retailer: retailerName, retailerUrl: url };

    const images: string[] = (product?.images ?? product?.media ?? product?.gallery ?? [])
      .map((img: any) => {
        const src = img?.url ?? img?.src ?? img?.imageURL ?? (typeof img === 'string' ? img : null);
        if (!src) return null;
        return src.startsWith('http') ? src : src.startsWith('//') ? `https:${src}` : null;
      })
      .filter(Boolean);

    return {
      brand: product?.brand?.name ?? product?.brandName ?? product?.brand ?? undefined,
      title: product?.name ?? product?.title ?? product?.productName ?? undefined,
      description: this.stripHtml(product?.description ?? product?.shortDescription),
      price: this.parsePrice(String(product?.price?.value ?? product?.salePrice ?? product?.price ?? '')),
      originalPrice: this.parsePrice(String(product?.originalPrice ?? product?.mrp ?? product?.price?.originalValue ?? '')),
      images: images.length > 0 ? images : undefined,
      colors: product?.color ? [product.color] : product?.colours ? [product.colours] : undefined,
      material: product?.material ?? product?.fabric ?? undefined,
      retailer: retailerName,
      retailerUrl: url,
    };
  }

  private parseFromMeta(
    meta: Record<string, string>,
    html: string,
    url: string,
    retailerName: string
  ): ImportedProduct {
    const $ = cheerio.load(html);

    const title = (meta['og:title'] ?? $('h1').first().text().trim()) || undefined;
    const description = meta['og:description'] ?? $('meta[name="description"]').attr('content') ?? undefined;
    
    const price = this.extractPriceFromDom(html);
    const images = this.extractImagesFromDom(html, url);

    const brand = meta['og:brand'] ?? meta['product:brand'] ?? undefined;

    return {
      brand,
      title,
      description,
      price,
      images: images.length > 0 ? images : undefined,
      retailer: retailerName,
      retailerUrl: url,
    };
  }

  /** Detects a human-readable retailer name from the domain or site meta. */
  private detectRetailerName(url: string, meta: Record<string, string>): string {
    // Check og:site_name first
    if (meta['og:site_name']) return meta['og:site_name'];

    // Known retailers not covered by dedicated importers
    const known: Record<string, string> = {
      'urbanic.com': 'Urbanic',
      'bewakoof.com': 'Bewakoof',
      'snitchofficial.com': 'Snitch',
      'snitch.co.in': 'Snitch',
      'rarerabbit.in': 'Rare Rabbit',
      'tatacliq.com': 'Tata CLiQ',
      'nykaa.com': 'Nykaa Fashion',
      'nykaafashion.com': 'Nykaa Fashion',
      'meesho.com': 'Meesho',
      'limeroad.com': 'LimeRoad',
      'craftsvilla.com': 'Craftsvilla',
      'manyavar.com': 'Manyavar',
      'fabindia.com': 'FabIndia',
      'westside.com': 'Westside',
      'wrogn.com': 'Wrogn',
      'uniqlo.com': 'Uniqlo',
    };

    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      for (const [pattern, name] of Object.entries(known)) {
        if (hostname.includes(pattern)) return name;
      }
      // Capitalize domain name as fallback
      return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
    } catch {
      return 'Retailer';
    }
  }
}
