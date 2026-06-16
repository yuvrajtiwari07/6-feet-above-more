// server.ts — Local development and production entry point
// Boots the Express listener + Vite middle-ware dev runner

import express from 'express';
import app from './src/expressApp';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

let __dirname = '';
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  __dirname = process.cwd();
}

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

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
    console.log('   6FeetnAbove Server v2.0  —  Supabase Backend');
    console.log(`   URL   : http://localhost:${PORT}`);
    console.log(`   DB    : Supabase PostgreSQL`);
    console.log(`   Auth  : Supabase OAuth (Google)`);
    console.log('═══════════════════════════════════════════════');
  });
}

startServer().catch((err) => {
  console.error('FATAL: Failed to boot 6FeetnAbove server', err);
  process.exit(1);
});
