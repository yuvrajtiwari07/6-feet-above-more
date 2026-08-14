// src/controllers/aiJobsController.ts
// AI discovery crawl jobs (listing URL -> candidate products -> review queue)
// and bulk retag jobs (re-classify existing products with Gemini), plus the
// shared "tick" worker that advances whichever job is next in line.
//
// Mounted at /api/admin — see expressApp.ts.

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { ListingCrawlerFactory } from '../lib/discovery/ListingCrawlerFactory';
import { aiJobRepository, AiJob } from '../repositories/aiJobRepository';
import { productRepository } from '../repositories/productRepository';
import { productService } from '../services/productService';
import {
  normalizeVertical,
  scrapeAndCurate,
  buildProductFromCuration,
  curateExistingProduct,
  convertUrlToAffiliate,
  detectSegmentAndType,
  mapCuratedDataToCategories,
} from '../lib/curation/curatePipeline';
import { getGarmentVersatilityDefaults } from '../lib/garmentVersatility';

const router = Router();

const DISCOVERY_PAGE_SIZE = 8; // product URLs discovered per listing-page fetch
const CURATION_BATCH_SIZE = 6; // items curated with Gemini per tick
const GEMINI_DAILY_LIMIT = Number(process.env.GEMINI_DAILY_LIMIT || 900); // buffer under the ~1000/day free tier cap

// ── Auth: the scheduled GitHub Actions tick uses a shared secret; the
// admin UI's manual "Run now" button uses a normal admin session. ──
function requireCronOrAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization;
  if (secret && authHeader === `Bearer ${secret}`) {
    return next();
  }
  requireAuth(req, res, () => requireAdmin(req, res, next));
}

// ═══════════════════════════════════════════════════════════════
//  Discovery jobs
// ═══════════════════════════════════════════════════════════════

// POST /api/admin/discovery/jobs — start a new listing-page crawl
router.post('/discovery/jobs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { sourceUrl } = req.body as { sourceUrl?: string };
  const vertical = normalizeVertical((req.body as any)?.vertical);

  if (!sourceUrl || typeof sourceUrl !== 'string') {
    return res.status(400).json({ success: false, error: 'A listing/search page URL is required.' });
  }
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid URL format.' });
  }
  if (!ListingCrawlerFactory.isSupported(parsed.href)) {
    return res.status(400).json({ success: false, error: 'Unsupported retailer. Supported: Myntra, Ajio, Flipkart.' });
  }

  const crawler = ListingCrawlerFactory.getCrawler(parsed.href);
  const job = await aiJobRepository.createJob({
    jobType: 'discovery',
    vertical,
    retailer: crawler.retailerName,
    sourceUrl: parsed.href,
    createdBy: req.user?.email ?? null,
  });
  res.json({ success: true, job });
});

// GET /api/admin/discovery/jobs — list crawl jobs
router.get('/discovery/jobs', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const jobs = await aiJobRepository.listJobs('discovery');
  res.json({ success: true, jobs });
});

// GET /api/admin/discovery/jobs/:id/items?status=pending_review
router.get('/discovery/jobs/:id/items', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const status = req.query.status as any;
  const items = await aiJobRepository.listItems(req.params.id, status);
  res.json({ success: true, items });
});

// POST /api/admin/discovery/jobs/:id/items/:itemId/approve
router.post('/discovery/jobs/:id/items/:itemId/approve', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const job = await aiJobRepository.getJob(req.params.id);
  const item = await aiJobRepository.getItem(req.params.itemId);
  if (!job || !item || item.jobId !== job.id) {
    return res.status(404).json({ success: false, error: 'Job or item not found.' });
  }
  if (item.status !== 'pending_review') {
    return res.status(400).json({ success: false, error: `Item is not pending review (status: ${item.status}).` });
  }
  const curated = item.curatedJson;
  if (!curated || !item.productUrl) {
    return res.status(400).json({ success: false, error: 'Item has no curated data to approve.' });
  }

  try {
    const affiliateInfo = await convertUrlToAffiliate(item.productUrl);
    const newProduct = buildProductFromCuration(curated.curated, curated.scraped, item.productUrl, job.vertical as any, curated.retailerName, affiliateInfo);
    const saveResult = await productService.create(newProduct);
    if (saveResult.error) {
      await aiJobRepository.updateItem(item.id, { status: 'duplicate', curatedJson: curated, rejectReason: saveResult.error });
      await aiJobRepository.updateJobCounters(job.id, { urlsDuplicate: 1 });
      return res.status(400).json({ success: false, error: saveResult.error });
    }
    await aiJobRepository.updateItem(item.id, { status: 'approved', curatedJson: curated, approvedProductId: saveResult.product!.id });
    res.json({ success: true, product: saveResult.product });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? 'Failed to approve item.' });
  }
});

// POST /api/admin/discovery/jobs/:id/items/:itemId/reject
router.post('/discovery/jobs/:id/items/:itemId/reject', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const item = await aiJobRepository.getItem(req.params.itemId);
  if (!item || item.jobId !== req.params.id) {
    return res.status(404).json({ success: false, error: 'Item not found.' });
  }
  await aiJobRepository.updateItem(item.id, { status: 'rejected_admin', curatedJson: item.curatedJson, rejectReason: (req.body as any)?.reason || 'Rejected by admin' });
  res.json({ success: true });
});

// POST /api/admin/discovery/jobs/:id/approve-all — bulk-approve everything pending_review
router.post('/discovery/jobs/:id/approve-all', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const job = await aiJobRepository.getJob(req.params.id);
  if (!job) return res.status(404).json({ success: false, error: 'Job not found.' });

  const items = await aiJobRepository.listItems(job.id, 'pending_review');
  const results: { itemId: string; success: boolean; error?: string }[] = [];
  for (const item of items) {
    const curated = item.curatedJson;
    if (!curated || !item.productUrl) {
      results.push({ itemId: item.id, success: false, error: 'No curated data.' });
      continue;
    }
    try {
      const affiliateInfo = await convertUrlToAffiliate(item.productUrl);
      const newProduct = buildProductFromCuration(curated.curated, curated.scraped, item.productUrl, job.vertical as any, curated.retailerName, affiliateInfo);
      const saveResult = await productService.create(newProduct);
      if (saveResult.error) {
        await aiJobRepository.updateItem(item.id, { status: 'duplicate', curatedJson: curated, rejectReason: saveResult.error });
        results.push({ itemId: item.id, success: false, error: saveResult.error });
      } else {
        await aiJobRepository.updateItem(item.id, { status: 'approved', curatedJson: curated, approvedProductId: saveResult.product!.id });
        results.push({ itemId: item.id, success: true });
      }
    } catch (err: any) {
      results.push({ itemId: item.id, success: false, error: err?.message });
    }
  }
  res.json({ success: true, results });
});

// POST /api/admin/discovery/jobs/:id/pause | /resume | /cancel
router.post('/discovery/jobs/:id/pause', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await aiJobRepository.setStatus(req.params.id, 'paused');
  res.json({ success: true });
});
router.post('/discovery/jobs/:id/resume', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await aiJobRepository.setStatus(req.params.id, 'queued');
  res.json({ success: true });
});
router.post('/discovery/jobs/:id/cancel', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  await aiJobRepository.setStatus(req.params.id, 'cancelled');
  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
//  Retag jobs — bulk re-classify existing products with Gemini
// ═══════════════════════════════════════════════════════════════

// POST /api/admin/retag/jobs — { productIds: string[] | 'all', vertical? }
router.post('/retag/jobs', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const { productIds, vertical: verticalFilter } = req.body as { productIds?: string[] | 'all'; vertical?: string };

  let ids: string[];
  if (productIds === 'all') {
    const { products } = await productRepository.findAll({ vertical: verticalFilter, limit: 5000 });
    ids = products.map(p => p.id);
  } else if (Array.isArray(productIds) && productIds.length > 0) {
    ids = productIds;
  } else {
    return res.status(400).json({ success: false, error: 'productIds (array or "all") is required.' });
  }

  const job = await aiJobRepository.createJob({
    jobType: 'retag',
    vertical: verticalFilter || 'fashion',
    createdBy: req.user?.email ?? null,
  });
  await aiJobRepository.insertRetagItems(job.id, ids);
  await aiJobRepository.updateJobCounters(job.id, { urlsDiscovered: ids.length });
  res.json({ success: true, job, itemCount: ids.length });
});

// GET /api/admin/retag/jobs
router.get('/retag/jobs', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  const jobs = await aiJobRepository.listJobs('retag');
  res.json({ success: true, jobs });
});

// GET /api/admin/retag/jobs/:id/items — includes previous/curated diff
router.get('/retag/jobs/:id/items', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  const items = await aiJobRepository.listItems(req.params.id);
  res.json({ success: true, items });
});

// ═══════════════════════════════════════════════════════════════
//  Tick worker — advances one job by a bounded amount of work.
//  Called by the GitHub Actions schedule (every ~10 min) or the
//  admin UI's manual "Run now" button. Must stay well under
//  Vercel's ~30s Hobby-plan function timeout.
// ═══════════════════════════════════════════════════════════════

router.post('/ai-jobs/tick', requireCronOrAdmin, async (_req: Request, res: Response) => {
  const usedToday = await aiJobRepository.getTodayUsage();
  if (usedToday >= GEMINI_DAILY_LIMIT) {
    return res.json({ success: true, skipped: 'budget', usedToday });
  }

  const job = await aiJobRepository.claimNextRunnableJob();
  if (!job) {
    return res.json({ success: true, skipped: 'no-runnable-jobs' });
  }

  try {
    if (job.jobType === 'discovery') {
      await tickDiscoveryJob(job, GEMINI_DAILY_LIMIT - usedToday);
    } else {
      await tickRetagJob(job, GEMINI_DAILY_LIMIT - usedToday);
    }
    const refreshed = await aiJobRepository.getJob(job.id);
    res.json({ success: true, job: refreshed });
  } catch (err: any) {
    await aiJobRepository.setStatus(job.id, 'failed', err?.message ?? 'Unknown error');
    res.status(500).json({ success: false, error: err?.message ?? 'Tick failed.' });
  }
});

async function tickDiscoveryJob(job: AiJob, remainingBudget: number): Promise<void> {
  const pendingCount = await aiJobRepository.countPending(job.id);

  // Phase 1: discover one more listing page if there's still a cursor and no backlog to work through yet.
  if (job.nextPageUrl && pendingCount === 0) {
    const crawler = ListingCrawlerFactory.getCrawler(job.nextPageUrl);
    const result = await crawler.discoverProductUrls(job.nextPageUrl);
    if (result.blocked) {
      await aiJobRepository.setStatus(job.id, 'paused', `Listing page appears blocked by ${crawler.retailerName}. Resume once you've verified the URL still works, or try a fresh search URL.`);
      return;
    }
    const inserted = await aiJobRepository.insertItems(job.id, result.urls.slice(0, DISCOVERY_PAGE_SIZE));
    await aiJobRepository.updateJobCounters(job.id, { urlsDiscovered: inserted }, result.nextPageUrl);
    // A page with no next cursor, no links at all, or — importantly — a page
    // that only re-served URLs we already have (some filtered/faceted search
    // URLs don't actually honor the page param and just repeat page 1
    // forever) all mean pagination is effectively done.
    if (!result.nextPageUrl || result.urls.length === 0 || inserted === 0) {
      await aiJobRepository.updateJobCounters(job.id, {}, null);
    }
    await aiJobRepository.setStatus(job.id, 'curating');
    return;
  }

  // Phase 2: curate a batch of pending items.
  const batchSize = Math.max(0, Math.min(CURATION_BATCH_SIZE, remainingBudget));
  const items = await aiJobRepository.claimPendingItems(job.id, batchSize);

  for (const item of items) {
    if (!item.productUrl) continue;
    try {
      const dup = await productRepository.findByUrl(item.productUrl);
      if (dup) {
        await aiJobRepository.updateItem(item.id, { status: 'duplicate', rejectReason: `Already in catalog (ID: ${dup.id})` });
        await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsDuplicate: 1 });
        continue;
      }

      const { scraped, curated, retailerName } = await scrapeAndCurate(item.productUrl, job.vertical as any);
      await aiJobRepository.incrementUsage(1);

      const tallFriendly = curated?.tallFit?.tallFriendly;
      if (job.vertical === 'fashion' && tallFriendly === false) {
        await aiJobRepository.updateItem(item.id, { status: 'rejected_ai', curatedJson: { curated, scraped, retailerName }, rejectReason: 'AI determined this is not tall-fit friendly.' });
        await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsRejected: 1 });
        continue;
      }

      const similar = await productRepository.findSimilarByTitle(curated.title || scraped.title || '', curated.brand || scraped.brand || '');
      if (similar.length > 0) {
        await aiJobRepository.updateItem(item.id, { status: 'duplicate', curatedJson: { curated, scraped, retailerName }, rejectReason: `Looks similar to existing product "${similar[0].title}" (ID: ${similar[0].id})` });
        await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsDuplicate: 1 });
        continue;
      }

      await aiJobRepository.updateItem(item.id, { status: 'pending_review', curatedJson: { curated, scraped, retailerName } });
      await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsImported: 1 });
    } catch (err: any) {
      await aiJobRepository.updateItem(item.id, { status: 'failed', rejectReason: err?.message ?? 'Curation failed' });
      await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsFailed: 1 });
    }
  }

  const stillPending = await aiJobRepository.countPending(job.id);
  const refreshed = await aiJobRepository.getJob(job.id);
  if (stillPending === 0 && !refreshed?.nextPageUrl) {
    await aiJobRepository.setStatus(job.id, 'completed');
  }
}

async function tickRetagJob(job: AiJob, remainingBudget: number): Promise<void> {
  const batchSize = Math.max(0, Math.min(CURATION_BATCH_SIZE, remainingBudget));
  const items = await aiJobRepository.claimPendingItems(job.id, batchSize);

  for (const item of items) {
    if (!item.productId) continue;
    try {
      const existing = await productRepository.findById(item.productId);
      if (!existing) {
        await aiJobRepository.updateItem(item.id, { status: 'failed', rejectReason: 'Product no longer exists.' });
        await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsFailed: 1 });
        continue;
      }

      const curated = await curateExistingProduct(job.vertical as any, existing);
      await aiJobRepository.incrementUsage(1);
      if (!curated) {
        await aiJobRepository.updateItem(item.id, { status: 'failed', rejectReason: 'Gemini unavailable or curation failed.' });
        await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsFailed: 1 });
        continue;
      }

      const previousJson = {
        category: existing.category, categories: existing.categories, subCategory: existing.subCategory,
        tags: existing.tags, tallFriendly: existing.tallFriendly, heightRanges: existing.heightRanges,
        bodyTypes: existing.bodyTypes, fitHighlights: existing.fitHighlights,
        concerns: existing.concerns, dietTags: existing.dietTags, form: existing.form,
      };

      const isWellness = job.vertical === 'wellness';
      const { productSegment, productType } = isWellness
        ? { productSegment: existing.productSegment, productType: curated.productType || existing.productType }
        : detectSegmentAndType(curated.title || existing.title, curated.category || existing.category, curated.subCategory || existing.subCategory || '');
      const versatility = isWellness ? null : getGarmentVersatilityDefaults(productType);
      const categories = isWellness
        ? existing.categories
        : [...new Set([...(versatility?.categories ?? []), ...mapCuratedDataToCategories(curated.category || existing.category)])];

      const patch: any = {
        category: isWellness ? existing.category : (curated.category || existing.category),
        categories,
        subCategory: curated.subCategory || existing.subCategory,
        productSegment,
        productType,
        tags: curated.tags && curated.tags.length > 0 ? curated.tags : existing.tags,
        material: curated.material || existing.material,
        description: curated.description || existing.description,
      };
      if (!isWellness) {
        patch.tallFriendly = curated.tallFit?.tallFriendly ?? existing.tallFriendly;
        patch.heightRanges = curated.tallFit?.recommendedHeightRanges?.length ? curated.tallFit.recommendedHeightRanges : existing.heightRanges;
        patch.bodyTypes = curated.tallFit?.bodyTypes?.length ? curated.tallFit.bodyTypes : existing.bodyTypes;
        patch.fitHighlights = curated.tallFit?.highlights?.length ? curated.tallFit.highlights : existing.fitHighlights;
        patch.colors = curated.colors?.length ? curated.colors : existing.colors;
        patch.occasions = curated.occasions?.length ? curated.occasions : existing.occasions;
        patch.seasons = curated.seasons?.length ? curated.seasons : existing.seasons;
      } else {
        patch.form = curated.form || existing.form;
        patch.concerns = curated.concerns?.length ? curated.concerns : existing.concerns;
        patch.keyIngredients = curated.keyIngredients?.length ? curated.keyIngredients : existing.keyIngredients;
        patch.dietTags = curated.dietTags?.length ? curated.dietTags : existing.dietTags;
      }

      await productRepository.update(existing.id, patch);
      await aiJobRepository.updateItem(item.id, { status: 'approved', curatedJson: curated, previousJson, approvedProductId: existing.id });
      await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsImported: 1 });
    } catch (err: any) {
      await aiJobRepository.updateItem(item.id, { status: 'failed', rejectReason: err?.message ?? 'Retag failed' });
      await aiJobRepository.updateJobCounters(job.id, { urlsProcessed: 1, urlsFailed: 1 });
    }
  }

  const stillPending = await aiJobRepository.countPending(job.id);
  if (stillPending === 0) {
    await aiJobRepository.setStatus(job.id, 'completed');
  }
}

export default router;
