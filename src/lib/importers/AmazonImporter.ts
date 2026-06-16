// src/lib/importers/AmazonImporter.ts
// Imports product data from Amazon (amazon.in, amazon.com) product pages.
// Amazon embeds rich product data in HTML, making Cheerio highly effective.

import * as cheerio from 'cheerio';
import { BaseImporter } from './BaseImporter.js';
import type { ImportedProduct } from './types.js';

export class AmazonImporter extends BaseImporter {
  readonly retailerName = 'Amazon';

  canHandle(url: string): boolean {
    return /amazon\.(in|com|co\.uk|de|fr|ca|com\.au)/.test(url);
  }

  async importProduct(url: string): Promise<ImportedProduct> {
    const html = await this.fetchPage(url);
    const $ = cheerio.load(html);

    // Strategy 1: JSON-LD
    const jsonLd = this.extractJsonLd(html, 'Product');
    if (jsonLd?.name) {
      const base = this.parseJsonLd(jsonLd, url);
      // Augment with DOM data (Amazon's JSON-LD is often sparse)
      return this.augmentWithDom($, base, url);
    }

    // Strategy 2: Amazon-specific DOM selectors
    return this.parseDom($, html, url);
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
      retailer: 'Amazon',
      retailerUrl: url,
    };
  }

  private augmentWithDom($: cheerio.CheerioAPI, base: ImportedProduct, url: string): ImportedProduct {
    // Amazon stores additional images in a JSON blob in the page
    if (!base.images || base.images.length === 0) {
      const imgData = this.extractAmazonImages($);
      if (imgData.length > 0) base.images = imgData;
    }

    if (!base.brand) {
      base.brand = $('#bylineInfo').text().replace('Brand: ', '').trim() || undefined;
    }

    if (!base.price) {
      base.price = this.parsePrice($('.a-price .a-offscreen').first().text());
    }

    return base;
  }

  private parseDom($: cheerio.CheerioAPI, html: string, url: string): ImportedProduct {
    const meta = this.extractMetaTags(html);

    // Title
    const title =
      $('#productTitle').text().trim() ||
      meta['og:title'] ||
      undefined;

    // Brand
    const brand =
      $('#bylineInfo').text().replace(/^(Brand:|Visit the|Store)[\s]+/i, '').trim() ||
      meta['og:brand'] ||
      undefined;

    // Price
    const priceRaw =
      $('.a-price .a-offscreen').first().text() ||
      meta['product:price:amount'] ||
      '';
    const price = this.parsePrice(priceRaw);

    // Description
    const description =
      $('#feature-bullets').text().replace(/\n+/g, ' ').trim() ||
      meta['og:description'] ||
      undefined;

    // Rating
    const ratingText = $('#acrPopover').attr('title') ?? '';
    const averageRating = parseFloat(ratingText) || undefined;
    const reviewsText = $('#acrCustomerReviewText').text();
    const reviewsCount = parseInt(reviewsText.replace(/[^\d]/g, '')) || undefined;

    // Images
    const images = this.extractAmazonImages($);
    const ogImage = meta['og:image'];
    if (ogImage && !images.includes(ogImage)) images.unshift(ogImage);

    // Sizes (Amazon variation table)
    const sizes: string[] = [];
    $('[id*="size_name"] .selection').each((_, el) => {
      const size = $(el).text().trim();
      if (size) sizes.push(size);
    });

    // Colors
    const colors: string[] = [];
    $('[id*="color_name"] .selection, [id*="colour_name"] .selection').each((_, el) => {
      const color = $(el).text().trim();
      if (color) colors.push(color);
    });

    // Material from product details table
    let material: string | undefined;
    $('table.a-keyvalue tr').each((_, row) => {
      const label = $('td.a-span3, th', row).text().toLowerCase();
      const value = $('td.a-span9, td:last-child', row).text().trim();
      if (label.includes('fabric') || label.includes('material')) {
        material = value;
      }
    });

    return {
      brand,
      title,
      description,
      price,
      images: images.length > 0 ? images : undefined,
      sizes: sizes.length > 0 ? sizes : undefined,
      colors: colors.length > 0 ? colors : undefined,
      material,
      averageRating,
      reviewsCount,
      retailer: 'Amazon',
      retailerUrl: url,
    };
  }

  /** Extracts the large image URLs from Amazon's embedded image JSON */
  private extractAmazonImages($: cheerio.CheerioAPI): string[] {
    const images: string[] = [];

    // Amazon stores images in a JSON blob inside the page scripts
    $('script').each((_, el) => {
      const content = $(el).html() ?? '';
      if (content.includes("'colorImages'") || content.includes('"colorImages"')) {
        const match = content.match(/"hiRes"\s*:\s*"(https:[^"]+)"/g);
        if (match) {
          match.forEach((m) => {
            const url = m.match(/"hiRes"\s*:\s*"(https:[^"]+)"/)?.[1];
            if (url && !images.includes(url)) images.push(url);
          });
        }
      }
    });

    return images;
  }
}
