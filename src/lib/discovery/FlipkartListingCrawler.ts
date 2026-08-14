// src/lib/discovery/FlipkartListingCrawler.ts
// Flipkart search/category listing pages, e.g.
// https://www.flipkart.com/search?q=shirts+for+men&page=1
// Product PDP links follow the `/p/itm<id>` pattern used by FlipkartImporter.

import { ListingCrawler, ListingPageResult } from './ListingCrawler';

const PRODUCT_HREF = /\/p\/itm[a-z0-9]+(\?|$)/i;
const PAGE_PARAM = 'page';

export class FlipkartListingCrawler extends ListingCrawler {
  readonly retailerName = 'Flipkart';

  canHandle(url: string): boolean {
    return url.includes('flipkart.com');
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
