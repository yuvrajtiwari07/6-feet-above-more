// src/controllers/catalogController.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireAdmin } from '../middleware/adminMiddleware';
import { catalogCategoryService } from '../services/catalogCategoryService';
import { catalogService } from '../services/catalogService';

const router = Router();

// ── Catalog Categories ────────────────────────────────────────

// GET /api/catalogs/categories — public, list all active
router.get('/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await catalogCategoryService.getAll();
    res.json({ success: true, categories });
  } catch (err: any) {
    console.error('[CatalogController] GET /categories error:', err);
    res.status(500).json({ error: 'Failed to fetch catalog categories' });
  }
});

// POST /api/catalogs/categories — admin only
router.post('/categories', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, error } = await catalogCategoryService.create(req.body);
    if (error) return res.status(400).json({ error });
    res.status(201).json({ success: true, category });
  } catch (err: any) {
    console.error('[CatalogController] POST /categories error:', err);
    res.status(500).json({ error: 'Failed to create catalog category' });
  }
});

// PUT /api/catalogs/categories/:id — admin only
router.put('/categories/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { category, error } = await catalogCategoryService.update(req.params.id, req.body);
    if (error) return res.status(404).json({ error });
    res.json({ success: true, category });
  } catch (err: any) {
    console.error('[CatalogController] PUT /categories/:id error:', err);
    res.status(500).json({ error: 'Failed to update catalog category' });
  }
});

// DELETE /api/catalogs/categories/:id — admin only
router.delete('/categories/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { success, error } = await catalogCategoryService.delete(req.params.id);
    if (!success) return res.status(404).json({ error });
    res.json({ success: true, message: 'Category deleted' });
  } catch (err: any) {
    console.error('[CatalogController] DELETE /categories/:id error:', err);
    res.status(500).json({ error: 'Failed to delete catalog category' });
  }
});

// ── Catalogs ──────────────────────────────────────────────────

// GET /api/catalogs — public, list published (optional ?category=X)
// GET /api/catalogs?admin=true — admin, list all (auth required)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const catalogs = await catalogService.getAll({ category: category as string | undefined });
    res.json({ success: true, catalogs });
  } catch (err: any) {
    console.error('[CatalogController] GET /catalogs error:', err);
    res.status(500).json({ error: 'Failed to fetch catalogs' });
  }
});

// GET /api/catalogs/admin — admin only, list all (published + draft)
router.get('/admin', requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const catalogs = await catalogService.getAllForAdmin();
    res.json({ success: true, catalogs });
  } catch (err: any) {
    console.error('[CatalogController] GET /catalogs/admin error:', err);
    res.status(500).json({ error: 'Failed to fetch catalogs' });
  }
});

// GET /api/catalogs/:id — public, single catalog + resolved products
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { catalog, products, error } = await catalogService.getById(req.params.id);
    if (error) return res.status(404).json({ error });
    res.json({ success: true, catalog, products });
  } catch (err: any) {
    console.error('[CatalogController] GET /catalogs/:id error:', err);
    res.status(500).json({ error: 'Failed to fetch catalog' });
  }
});

// POST /api/catalogs — admin only
router.post('/', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { catalog, error } = await catalogService.create(req.body);
    if (error) return res.status(400).json({ error });
    res.status(201).json({ success: true, catalog });
  } catch (err: any) {
    console.error('[CatalogController] POST /catalogs error:', err);
    res.status(500).json({ error: 'Failed to create catalog' });
  }
});

// PUT /api/catalogs/:id — admin only
router.put('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { catalog, error } = await catalogService.update(req.params.id, req.body);
    if (error) return res.status(404).json({ error });
    res.json({ success: true, catalog });
  } catch (err: any) {
    console.error('[CatalogController] PUT /catalogs/:id error:', err);
    res.status(500).json({ error: 'Failed to update catalog' });
  }
});

// DELETE /api/catalogs/:id — admin only
router.delete('/:id', requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { success, error } = await catalogService.delete(req.params.id);
    if (!success) return res.status(404).json({ error });
    res.json({ success: true, message: 'Catalog deleted' });
  } catch (err: any) {
    console.error('[CatalogController] DELETE /catalogs/:id error:', err);
    res.status(500).json({ error: 'Failed to delete catalog' });
  }
});

export default router;
