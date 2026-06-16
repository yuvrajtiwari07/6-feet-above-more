// server.ts — LAMBA Full-Stack Server
// Express + Vite dev server (SPA fallback in production)
// Routes: /api/products, /api/users, /api/categories, /api/health

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
dotenv.config();

import productRouter from './src/controllers/productController';
import userRouter from './src/controllers/userController';

let __dirname = '';
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  __dirname = process.cwd();
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // ── Body Parsing ──────────────────────────────────────────
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Security Headers ──────────────────────────────────────
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ── API Routes ────────────────────────────────────────────

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({
      status:    'ok',
      brand:     'LAMBA',
      version:   '2.0.0',
      database:  'supabase-postgres',
      timestamp: new Date().toISOString(),
    });
  });

  // Static category definitions (no DB needed)
  app.get('/api/categories', (_req, res) => {
    res.json([
      { name: 'Ethnic Wear',  theme: 'ethnic',    tags: ['Wedding', 'Festive', 'Haldi', 'Sangeet'] },
      { name: 'Formals',      theme: 'formals',   tags: ['Office', 'Boardroom', 'Interviews', 'Corporate'] },
      { name: 'Streetwear',   theme: 'streetwear',tags: ['Hypebeast', 'Oversized', 'Skate', 'Concert'] },
      { name: 'Casuals',      theme: 'casuals',   tags: ['Weekend', 'Lounge', 'Everyday', 'Comfort'] },
      { name: 'Summer',       theme: 'summer',    tags: ['Beach', 'Brunch', 'Linen', 'Vacation'] },
      { name: 'Winter',       theme: 'winter',    tags: ['Overcoats', 'Layering', 'Warm Luxury', 'Knitted'] },
      { name: 'Sneakers',     theme: 'default',   tags: ['Big Sizes', 'UK 12-15', 'Flat Arches'] },
    ]);
  });

  // Products CRUD (admin-protected mutations)
  app.use('/api/products', productRouter);

  // Affiliate click tracker (also under products/track but kept standalone for legacy)
  app.post('/api/track', (_req, res) => {
    // Redirect to the proper endpoint — backward compat
    res.redirect(307, '/api/products/track');
  });

  // User profile (authenticated)
  app.use('/api/users', userRouter);

  // ── Vite / Static Serving ─────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server:  { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ── Start ─────────────────────────────────────────────────
  app.listen(PORT, '0.0.0.0', () => {
    console.log('═══════════════════════════════════════════════');
    console.log('   LAMBA Server v2.0  —  Supabase Backend');
    console.log(`   URL   : http://localhost:${PORT}`);
    console.log(`   DB    : Supabase PostgreSQL`);
    console.log(`   Auth  : Supabase OAuth (Google)`);
    console.log('═══════════════════════════════════════════════');
  });
}

startServer().catch((err) => {
  console.error('FATAL: Failed to boot LAMBA server', err);
  process.exit(1);
});
