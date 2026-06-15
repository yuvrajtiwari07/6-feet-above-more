import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

// Since we compile server.ts with esbuild into commonjs sometimes, let's handle ESM/CJS compatibility
let __dirname = '';
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  __dirname = __dirname || process.cwd();
}

// Inline mock data for backend to remain decoupled and lightning-fast
const PRODUCTS_SEED = [
  { id: 'eth-1', brand: 'Manyavar', title: 'Emerald Green Draped Chikankari Kurta', category: 'Ethnic Wear', subCategory: 'Kurtas', priceAtRetailer: 3999, retailer: 'Myntra' },
  { id: 'eth-2', brand: 'Westside', title: 'Ivory Royal Linen Nehru Jacket & Kurta Set', category: 'Ethnic Wear', subCategory: 'Kurtas', priceAtRetailer: 4599, retailer: 'Tata CLiQ' },
  { id: 'eth-3', brand: 'Fabindia', title: 'Indigo Indigo Ikat Cotton Long Kurta', category: 'Ethnic Wear', subCategory: 'Kurtas', priceAtRetailer: 2499, retailer: 'Ajio' },
  { id: 'form-1', brand: 'Zara', title: 'Premium Structured Navy Suit Blazer', category: 'Formals', subCategory: 'Blazers', priceAtRetailer: 8990, retailer: 'Zara India' },
  { id: 'form-2', brand: 'H&M', title: 'Easy-Iron Tall Oxford Shirt - Ice Blue', category: 'Formals', subCategory: 'Shirts', priceAtRetailer: 1999, retailer: 'H&M India' },
  { id: 'form-3', brand: 'Raymond', title: 'Executive Steel-Grey Professional Trousers', category: 'Formals', subCategory: 'Trousers', priceAtRetailer: 2999, retailer: 'Myntra' },
  { id: 'street-1', brand: 'Zara', title: 'Distressed Heavyweight Charcoal Oversized Tee', category: 'Streetwear', subCategory: 'Oversized Tees', priceAtRetailer: 2290, retailer: 'Zara India' },
  { id: 'street-2', brand: 'H&M', title: 'Hypebeast Multi-Pocket Utility Cargo Pants', category: 'Streetwear', subCategory: 'Cargo Pants', priceAtRetailer: 3499, retailer: 'H&M India' },
  { id: 'street-3', brand: 'Bewakoof Heavy', title: 'Graphic Print Heavy Knit Hood - Cobalt Blue', category: 'Streetwear', subCategory: 'Hoodies', priceAtRetailer: 2199, retailer: 'Ajio' },
  { id: 'summ-1', brand: 'Zara', title: 'Relaxed Fit Pastel Sage Linen Shirt', category: 'Summer', subCategory: 'Shirts', priceAtRetailer: 3290, retailer: 'Zara India' },
  { id: 'summ-2', brand: 'Westside', title: 'Breezy Oatmeal Linen Blend Drawstring Chinos', category: 'Summer', subCategory: 'Chinos', priceAtRetailer: 1899, retailer: 'Tata CLiQ' },
  { id: 'summ-3', brand: 'Uniqlo', title: 'Supima Cotton Crew Neck Tee - Lemon Yellow', category: 'Summer', subCategory: 'T-Shirts', priceAtRetailer: 1290, retailer: 'Uniqlo India' },
  { id: 'wint-1', brand: 'Zara', title: 'Italian Wool Blend Double-Breasted Trench Coat', category: 'Winter', subCategory: 'Jackets', priceAtRetailer: 14990, retailer: 'Zara India' },
  { id: 'wint-2', brand: 'H&M', title: 'Merino Wool Tall Turtleneck Sweater', category: 'Winter', subCategory: 'Hoodies', priceAtRetailer: 3999, retailer: 'H&M India' },
  { id: 'foot-1', brand: 'Adidas', title: 'Samba OG Classic Sneakers (Big Sizes 11-14)', category: 'Sneakers', subCategory: 'Sneakers', priceAtRetailer: 10999, retailer: 'Adidas India' },
  { id: 'foot-2', brand: 'Nike', title: 'Air Jordan 1 High OG (Big Sizes up to UK 15)', category: 'Sneakers', subCategory: 'Sneakers', priceAtRetailer: 16995, retailer: 'Nike India' }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // 1. API Endpoints
  
  // Healthcheck endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', brand: 'LAMBA', active: true });
  });

  // GET /api/categories - Curates themes for individual categories
  app.get('/api/categories', (req, res) => {
    res.json([
      { name: 'Ethnic Wear', theme: 'ethnic', tags: ['Wedding', 'Festive', 'Haldi', 'Sangeet'] },
      { name: 'Formals', theme: 'formals', tags: ['Office', 'Boardroom', 'Interviews', 'Corporate'] },
      { name: 'Streetwear', theme: 'streetwear', tags: ['Hypebeast', 'Oversized', 'Skate', 'Concert'] },
      { name: 'Summer', theme: 'summer', tags: ['Beach', 'Brunch', 'Linen', 'Vacation'] },
      { name: 'Winter', theme: 'winter', tags: ['Overcoats', 'Layering', 'Warm Luxury', 'Knitted'] },
      { name: 'Sneakers', theme: 'default', tags: ['Big Sizes', 'UK 12-15', 'Flat Arches'] }
    ]);
  });

  // GET /api/products - Lists and filters catalog
  app.get('/api/products', (req, res) => {
    const { category, brand, search } = req.query;
    let filtered = [...PRODUCTS_SEED];

    if (category) {
      filtered = filtered.filter(p => p.category.toLowerCase() === String(category).toLowerCase());
    }
    if (brand) {
      filtered = filtered.filter(p => p.brand.toLowerCase() === String(brand).toLowerCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(q) || 
        p.brand.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, count: filtered.length, products: filtered });
  });

  // POST /api/track - Click tracker for affiliate monetization logs
  app.post('/api/track', (req, res) => {
    const { productId, retailer, affiliateUrl } = req.body;
    
    // Log click event safely in backend terminal outputs
    console.log(`[AFFILIATE TRACK] Redirect logged at ${new Date().toISOString()}:`);
    console.log(`  - Product ID: ${productId}`);
    console.log(`  - Destination Retailer: ${retailer}`);
    console.log(`  - URL: ${affiliateUrl}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Click tracking event logged successfully',
      redirectTarget: affiliateUrl,
      timestamp: new Date().toISOString()
    });
  });

  // Handle Vite Asset Serving & Fallback Routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets dynamically
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`   LAMBA Full-Stack Dev Server Running Online!`);
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`===============================================`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Failed to boot LAMBA full-stack server", err);
});
