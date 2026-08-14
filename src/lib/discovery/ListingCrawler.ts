// src/lib/discovery/ListingCrawler.ts
// Abstract base for retailer listing/search-results page crawlers.
// Different concern from BaseImporter (which scrapes one *product* page):
// this scrapes a *listing* page for product links + a next-page cursor.
//
// NOTE: the per-retailer selectors below are based on each site's publicly
// documented URL conventions, not a live-verified scrape (this environment
// has no network access to fetch a real listing page). Expect to tune the
// href-pattern regexes after running the first real discovery job — the
// self-terminating "zero links found -> no next page" behavior means a bad
// selector fails safe (job just discovers nothing) rather than looping.

import * as cheerio from 'cheerio';

export interface ListingPageResult {
  /** Deduped absolute product-page URLs found on this listing page. */
  urls: string[];
  /** URL of the next listing page, or null if this looks like the last page (or blocked). */
  nextPageUrl: string | null;
  /** True if the page looks bot-blocked (so the job can stop instead of looping on garbage). */
  blocked: boolean;
}

export abstract class ListingCrawler {
  abstract readonly retailerName: string;
  abstract canHandle(url: string): boolean;
  abstract discoverProductUrls(listingUrl: string): Promise<ListingPageResult>;

  private static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  ];

  protected async fetchPage(url: string): Promise<string> {
    const userAgent = ListingCrawler.USER_AGENTS[Math.floor(Math.random() * ListingCrawler.USER_AGENTS.length)];
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
    return response.text();
  }

  protected isBlockedPage(html: string): boolean {
    const head = html.slice(0, 3000).toLowerCase();
    return (
      head.includes('access denied') ||
      head.includes('attention required') ||
      head.includes('robot check') ||
      head.includes('cloudflare') ||
      head.length < 500
    );
  }

  /** Scans all `<a href>` on the page for links matching `hrefPattern`, resolved to absolute URLs and deduped. */
  protected extractProductLinks(html: string, baseUrl: string, hrefPattern: RegExp): string[] {
    const $ = cheerio.load(html);
    const found = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || !hrefPattern.test(href)) return;
      try {
        const abs = new URL(href, baseUrl).href.split('#')[0];
        found.add(abs);
      } catch {
        // ignore malformed hrefs
      }
    });
    return [...found];
  }

  /**
   * Many storefronts (confirmed on Myntra) render listing/search-results
   * pages as a client-side SPA whose initial HTML has almost no real
   * `<a href>` product links — the actual product URLs only exist inside a
   * `<script type="application/ld+json">` ItemList block, there for SEO.
   * Try this first; it's far more reliable than DOM anchor scanning where
   * it exists.
   */
  protected extractJsonLdItemListUrls(html: string, hrefPattern: RegExp): string[] {
    const $ = cheerio.load(html);
    const found = new Set<string>();
    $('script[type="application/ld+json"]').each((_, el) => {
      let data: any;
      try {
        data = JSON.parse($(el).html() || '{}');
      } catch {
        return;
      }
      const lists = Array.isArray(data) ? data : [data];
      for (const item of lists) {
        if (item?.['@type'] !== 'ItemList' || !Array.isArray(item.itemListElement)) continue;
        for (const entry of item.itemListElement) {
          const url = entry?.url || entry?.item?.url;
          if (typeof url === 'string' && hrefPattern.test(url)) {
            found.add(url.split('#')[0]);
          }
        }
      }
    });
    return [...found];
  }

  /** Sets (or replaces) a numeric query param and returns the resulting URL string. */
  protected withPageParam(listingUrl: string, param: string, page: number): string {
    const u = new URL(listingUrl);
    u.searchParams.set(param, String(page));
    return u.toString();
  }

  protected getPageParam(listingUrl: string, param: string, fallback = 1): number {
    try {
      const u = new URL(listingUrl);
      const raw = u.searchParams.get(param);
      const n = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(n) && n > 0 ? n : fallback;
    } catch {
      return fallback;
    }
  }
}
