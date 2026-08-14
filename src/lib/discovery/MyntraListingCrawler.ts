// src/lib/discovery/MyntraListingCrawler.ts
// Myntra search/category listing pages, e.g.
// https://www.myntra.com/shirts?p=1&f=Gender%3Amen
// Product PDP links on a listing page follow the same `/buy` suffix pattern
// used by MyntraImporter's own PDP URLs (see ImporterFactory).

import { ListingCrawler, ListingPageResult } from './ListingCrawler';

const PRODUCT_HREF = /\/\d+\/buy(\?|$)/;
const PAGE_PARAM = 'p';

export class MyntraListingCrawler extends ListingCrawler {
  readonly retailerName = 'Myntra';

  canHandle(url: string): boolean {
    return url.includes('myntra.com');
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
