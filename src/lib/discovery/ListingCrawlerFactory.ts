// src/lib/discovery/ListingCrawlerFactory.ts
import { ListingCrawler } from './ListingCrawler';
import { MyntraListingCrawler } from './MyntraListingCrawler';
import { AjioListingCrawler } from './AjioListingCrawler';
import { FlipkartListingCrawler } from './FlipkartListingCrawler';

const crawlers: ListingCrawler[] = [
  new MyntraListingCrawler(),
  new AjioListingCrawler(),
  new FlipkartListingCrawler(),
];

export const ListingCrawlerFactory = {
  getCrawler(url: string): ListingCrawler {
    const crawler = crawlers.find(c => c.canHandle(url));
    if (!crawler) {
      throw new Error('Unsupported listing page. Supported retailers: Myntra, Ajio, Flipkart.');
    }
    return crawler;
  },

  isSupported(url: string): boolean {
    return crawlers.some(c => c.canHandle(url));
  },
};
