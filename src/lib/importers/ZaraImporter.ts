// src/lib/importers/ZaraImporter.ts
// Imports product data from Zara (zara.com) product pages.
// Strategy: JSON-LD → embedded API data JSON → meta tags → DOM fallback

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class ZaraImporter extends BaseImporter {
  readonly retailerName = 'Zara';

  canHandle(url: string): boolean {
    return url.includes('zara.com');
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);

    // Strategy 1: JSON-LD
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }

    // Strategy 2: Zara embeds product data as window.Zara.cfg or __NEXT_DATA__
    const embedded = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s,
      /window\.Zara\.cfg\s*=\s*(\{.+?\});\s*<\/script>/s,
    ]);

    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }

    // Strategy 3: Zara API fallback (extract product ID and call internal API)
    const apiProduct = await this.tryZaraApi(url);
    if (apiProduct) return apiProduct;

    // Strategy 4: DOM + meta
    return this.parseDom(html, url);
  }

  private parseJsonLd(data: any, url: string): ImportedProduct {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];

    const colors: string[] = [];
    if (data.color) colors.push(data.color);

    const sizes: string[] = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((o: any) => {
        const size = o.itemOffered?.size ?? o.size;
        if (size) sizes.push(size);
      });
    }

    return {
      brand: 'Zara',
      title: data.name ?? undefined,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      colors: colors.length > 0 ? colors : undefined,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
      material: data.material ?? undefined,
      retailer: 'Zara',
      retailerUrl: url,
    };
  }

  private parseEmbeddedData(data: any, url: string): ImportedProduct {
    // Handle __NEXT_DATA__ structure
    const product =
      data?.props?.pageProps?.product ??
      data?.props?.pageProps?.initialProduct ??
      data?.product ??
      data;

    const detail = product?.detail ?? product;

    const colors: string[] = (detail?.colors ?? [])
      .map((c: any) => c?.name ?? c?.label)
      .filter(Boolean);

    const sizes: string[] = (detail?.sizes ?? detail?.variants ?? [])
      .map((s: any) => s?.name ?? s?.displaySize ?? s?.label)
      .filter(Boolean);

    // Zara images often use xmedia format
    const images: string[] = [];
    (detail?.media ?? detail?.xmedia ?? []).forEach((media: any) => {
      (media?.xmedia ?? [media]).forEach((img: any) => {
        if (img?.url) {
          const src = img.url.startsWith('http') ? img.url : `https:${img.url}`;
          images.push(src);
        }
      });
    });

    const price = detail?.price != null
      ? (typeof detail.price === 'number' ? detail.price / 100 : this.parsePrice(String(detail.price)))
      : undefined;

    return {
      brand: 'Zara',
      title: detail?.name ?? product?.name ?? undefined,
      description: this.stripHtml(detail?.description ?? product?.description),
      price,
      images: images.length > 0 ? images : undefined,
      colors: colors.length > 0 ? colors : undefined,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : undefined,
      retailer: 'Zara',
      retailerUrl: url,
    };
  }

  /** Zara has a public API — try fetching structured JSON directly */
  private async tryZaraApi(pageUrl: string): Promise<ImportedProduct | null> {
    try {
      // Extract product ID from URL (e.g., /en-in/12345678.html)
      const match = pageUrl.match(/\b(\d{7,10})\.html/);
      if (!match) return null;

      const productId = match[1];
      const locale = pageUrl.includes('/en-in/') ? 'en_IN' : 'en_US';
      const apiUrl = `https://www.zara.com/itxrest/3/catalog/store/25009456/product/category/0/detail?productId=${productId}&locale=${locale}`;

      const response = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;
      const data = await response.json();

      return this.parseEmbeddedData(data, pageUrl);
    } catch {
      return null;
    }
  }

  private parseDom(html: string, url: string): ImportedProduct {
    const $ = cheerio.load(html);
    const meta = this.extractMetaTags(html);

    const title = (meta['og:title'] ?? $('h1').first().text().trim()) || undefined;
    const price = this.parsePrice(meta['product:price:amount'] || $('.price__amount-current').first().text());
    const images = meta['og:image'] ? [meta['og:image']] : [];

    return {
      brand: 'Zara',
      title,
      price,
      description: meta['og:description'] ?? undefined,
      images: images.length > 0 ? images : undefined,
      retailer: 'Zara',
      retailerUrl: url,
    };
  }
}
