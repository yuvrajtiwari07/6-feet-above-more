// src/lib/discovery/AjioListingCrawler.ts
// Ajio search/category listing pages, e.g.
// https://www.ajio.com/men-shirts/c/830216002?page=1
// Product PDP links follow the `/p/<numericId>` pattern used by AjioImporter.

import { ListingCrawler, ListingPageResult } from './ListingCrawler';

const PRODUCT_HREF = /\/p\/\d+(\?|$)/;
const PAGE_PARAM = 'page';

export class AjioListingCrawler extends ListingCrawler {
  readonly retailerName = 'Ajio';

  canHandle(url: string): boolean {
    return url.includes('ajio.com');
  }

  async discoverProductUrls(listingUrl: string): Promise<ListingPageResult> {
    const html = await this.fetchPage(listingUrl);
    if (this.isBlockedPage(html)) {
      return { urls: [], nextPageUrl: null, blocked: true };
    }

    let urls = this.extractJsonLdItemListUrls(html, PRODUCT_HREF);
    if (urls.length === 0) {
      urls = this.extractProductLinks(html, listingUrl, PRODUCT_HREF);
    }
    if (urls.length === 0) {
      return { urls: [], nextPageUrl: null, blocked: false };
    }

    const currentPage = this.getPageParam(listingUrl, PAGE_PARAM, 1);
    const nextPageUrl = this.withPageParam(listingUrl, PAGE_PARAM, currentPage + 1);
    return { urls, nextPageUrl, blocked: false };
  }
}
