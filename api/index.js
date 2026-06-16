// src/expressApp.ts
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// src/controllers/productController.ts
import { Router } from "express";

// src/lib/db.ts
import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
var poolInstance = null;
function getPool() {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("[DB] DATABASE_URL environment variable is required but was not found.");
    }
    poolInstance = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
        // Required for Supabase hosted Postgres
      },
      max: 4,
      // Reduced for serverless to prevent connection exhaustion
      idleTimeoutMillis: 15e3,
      connectionTimeoutMillis: 5e3
    });
    poolInstance.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });
  }
  return poolInstance;
}
async function query(text, params) {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}
async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

// src/repositories/productRepository.ts
function rowToProduct(row) {
  return {
    id: row.id,
    brand: row.brand,
    title: row.title,
    category: row.category,
    subCategory: row.sub_category,
    description: row.description,
    fitType: row.fit_type,
    retailer: row.retailer,
    affiliateUrl: row.affiliate_url,
    priceAtRetailer: Number(row.price_at_retailer),
    images: row.images ?? [],
    occasions: row.occasions ?? [],
    seasons: row.seasons ?? [],
    colors: row.colors ?? [],
    sizes: row.sizes ?? [],
    verifiedTier: row.verified_tier,
    outOfStock: row.out_of_stock,
    verificationBadges: row.verification_badges ?? [],
    merchantLinks: row.merchant_links ?? [],
    customReviews: row.custom_reviews ?? [],
    reviewsCount: row.reviews_count,
    averageRating: Number(row.average_rating),
    measurements: row.measurements ?? {},
    verdicts: row.verdicts ?? [],
    // New expanded fields
    material: row.material,
    careInstructions: row.care_instructions,
    weightGrams: row.weight_grams,
    countryOfOrigin: row.country_of_origin,
    tags: row.tags ?? [],
    discountPercent: Number(row.discount_percent ?? 0),
    isFeatured: row.is_featured,
    skuCode: row.sku_code
  };
}
var productRepository = {
  async findAll(filters) {
    let text = "SELECT * FROM products WHERE 1=1";
    const params = [];
    let idx = 1;
    if (filters?.category) {
      text += ` AND LOWER(category) = LOWER($${idx++})`;
      params.push(filters.category);
    }
    if (filters?.brand) {
      text += ` AND LOWER(brand) = LOWER($${idx++})`;
      params.push(filters.brand);
    }
    if (filters?.search) {
      text += ` AND (LOWER(title) LIKE $${idx} OR LOWER(brand) LIKE $${idx} OR LOWER(category) LIKE $${idx})`;
      params.push(`%${filters.search.toLowerCase()}%`);
      idx++;
    }
    if (filters?.isFeatured !== void 0) {
      text += ` AND is_featured = $${idx++}`;
      params.push(filters.isFeatured);
    }
    text += " ORDER BY created_at DESC";
    const rows = await query(text, params);
    return rows.map(rowToProduct);
  },
  async findById(id) {
    const row = await queryOne(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );
    return row ? rowToProduct(row) : null;
  },
  async create(p) {
    const text = `
      INSERT INTO products (
        id, brand, title, category, sub_category, description, fit_type,
        retailer, affiliate_url, price_at_retailer, images, occasions,
        seasons, colors, sizes, verified_tier, out_of_stock,
        verification_badges, merchant_links, custom_reviews, reviews_count,
        average_rating, measurements, verdicts,
        material, care_instructions, weight_grams, country_of_origin,
        tags, discount_percent, is_featured, sku_code
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32
      )
      ON CONFLICT (id) DO UPDATE SET
        brand = EXCLUDED.brand, title = EXCLUDED.title,
        updated_at = NOW()
      RETURNING *
    `;
    const params = [
      p.id,
      p.brand,
      p.title,
      p.category,
      p.subCategory ?? null,
      p.description ?? null,
      p.fitType,
      p.retailer,
      p.affiliateUrl,
      p.priceAtRetailer,
      p.images,
      p.occasions,
      p.seasons,
      p.colors,
      p.sizes ?? [],
      p.verifiedTier,
      p.outOfStock ?? false,
      p.verificationBadges ?? [],
      JSON.stringify(p.merchantLinks ?? []),
      JSON.stringify(p.customReviews ?? []),
      p.reviewsCount ?? 0,
      p.averageRating ?? 5,
      JSON.stringify(p.measurements ?? {}),
      JSON.stringify(p.verdicts ?? []),
      p.material ?? null,
      p.careInstructions ?? null,
      p.weightGrams ?? null,
      p.countryOfOrigin ?? "India",
      p.tags ?? [],
      p.discountPercent ?? 0,
      p.isFeatured ?? false,
      p.skuCode ?? null
    ];
    const rows = await query(text, params);
    return rowToProduct(rows[0]);
  },
  async update(id, partial) {
    const fieldMap = {
      brand: "brand",
      title: "title",
      category: "category",
      subCategory: "sub_category",
      description: "description",
      fitType: "fit_type",
      retailer: "retailer",
      affiliateUrl: "affiliate_url",
      priceAtRetailer: "price_at_retailer",
      images: "images",
      occasions: "occasions",
      seasons: "seasons",
      colors: "colors",
      sizes: "sizes",
      verifiedTier: "verified_tier",
      outOfStock: "out_of_stock",
      verificationBadges: "verification_badges",
      merchantLinks: "merchant_links",
      customReviews: "custom_reviews",
      reviewsCount: "reviews_count",
      averageRating: "average_rating",
      measurements: "measurements",
      verdicts: "verdicts",
      material: "material",
      careInstructions: "care_instructions",
      weightGrams: "weight_grams",
      countryOfOrigin: "country_of_origin",
      tags: "tags",
      discountPercent: "discount_percent",
      isFeatured: "is_featured",
      skuCode: "sku_code"
    };
    const jsonbFields = /* @__PURE__ */ new Set(["merchantLinks", "customReviews", "measurements", "verdicts"]);
    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in partial) {
        const val = partial[key];
        setClauses.push(`${col} = $${idx++}`);
        params.push(jsonbFields.has(key) ? JSON.stringify(val) : val);
      }
    }
    if (setClauses.length === 0) return this.findById(id);
    setClauses.push(`updated_at = NOW()`);
    params.push(id);
    const text = `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`;
    const rows = await query(text, params);
    return rows.length > 0 ? rowToProduct(rows[0]) : null;
  },
  async delete(id) {
    const rows = await query("DELETE FROM products WHERE id = $1 RETURNING id", [id]);
    return rows.length > 0;
  }
};

// src/services/productService.ts
function validateProduct(p) {
  if (!p.id || typeof p.id !== "string" || !/^[a-z0-9_-]+$/i.test(p.id)) {
    return "Product ID must be alphanumeric with hyphens/underscores only";
  }
  if (!p.brand?.trim()) return "Brand is required";
  if (!p.title?.trim()) return "Title is required";
  if (!p.category?.trim()) return "Category is required";
  if (typeof p.priceAtRetailer !== "number" || p.priceAtRetailer < 0) {
    return "Price must be a non-negative number";
  }
  const validTiers = ["verified", "friendly", "community"];
  if (p.verifiedTier && !validTiers.includes(p.verifiedTier)) {
    return `verifiedTier must be one of: ${validTiers.join(", ")}`;
  }
  const discountPercent = p.discountPercent;
  if (discountPercent !== void 0 && (discountPercent < 0 || discountPercent > 100)) {
    return "discountPercent must be between 0 and 100";
  }
  return null;
}
function sanitizeProduct(p) {
  return {
    ...p,
    id: p.id.trim().toLowerCase(),
    brand: p.brand.trim(),
    title: p.title.trim(),
    category: p.category.trim(),
    subCategory: p.subCategory?.trim(),
    description: p.description?.trim(),
    retailer: p.retailer?.trim() ?? "",
    affiliateUrl: p.affiliateUrl?.trim() || "https://6feetabove.com/redirect",
    // Sanitize arrays
    images: (p.images ?? []).filter(Boolean),
    occasions: (p.occasions ?? []).filter(Boolean),
    seasons: (p.seasons ?? []).filter(Boolean),
    colors: (p.colors ?? []).filter(Boolean),
    sizes: (p.sizes ?? []).filter(Boolean),
    // Computed
    reviewsCount: p.customReviews?.length ?? 0,
    averageRating: p.customReviews && p.customReviews.length > 0 ? Number(
      (p.customReviews.reduce((acc, r) => acc + r.rating, 0) / p.customReviews.length).toFixed(1)
    ) : 5
  };
}
var productService = {
  async getAll(filters) {
    return productRepository.findAll(filters);
  },
  async getById(id) {
    if (!id) return null;
    return productRepository.findById(id.trim().toLowerCase());
  },
  async create(data) {
    const error = validateProduct(data);
    if (error) return { error };
    const sanitized = sanitizeProduct(data);
    const existing = await productRepository.findById(sanitized.id);
    if (existing) {
      return { error: `Product with ID "${sanitized.id}" already exists. Use update instead.` };
    }
    const product = await productRepository.create(sanitized);
    return { product };
  },
  async update(id, data) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      return { error: `Product "${id}" not found` };
    }
    if (data.priceAtRetailer !== void 0 && data.priceAtRetailer < 0) {
      return { error: "Price must be non-negative" };
    }
    const product = await productRepository.update(id, data);
    return { product: product ?? void 0 };
  },
  async delete(id) {
    const existing = await productRepository.findById(id);
    if (!existing) {
      return { success: false, error: `Product "${id}" not found` };
    }
    const deleted = await productRepository.delete(id);
    return { success: deleted };
  }
};

// src/middleware/authMiddleware.ts
import { createClient } from "@supabase/supabase-js";
import dotenv2 from "dotenv";
dotenv2.config();
var ADMIN_EMAILS = [
  "ytiwari@argusoft.com",
  "yuvrajtiwari0710@gmail.com"
];
var _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("[AuthMiddleware] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required.");
    }
    _supabaseAdmin = createClient(url, key);
  }
  return _supabaseAdmin;
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }
  const token = authHeader.slice(7);
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = {
      uid: data.user.id,
      email: data.user.email ?? "",
      isAdmin: ADMIN_EMAILS.includes(data.user.email ?? "")
    };
    next();
  } catch (err) {
    console.error("[Auth] Token verification failed:", err);
    return res.status(401).json({ error: "Token verification failed" });
  }
}

// src/middleware/adminMiddleware.ts
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!req.user.isAdmin) {
    return res.status(403).json({
      error: "Forbidden: Admin privileges required for this operation",
      hint: "Only whitelisted admin accounts can create, update, or delete products."
    });
  }
  next();
}

// src/controllers/productController.ts
var router = Router();
router.get("/", async (req, res) => {
  try {
    const { category, brand, search, featured } = req.query;
    const products = await productService.getAll({
      category,
      brand,
      search,
      isFeatured: featured === "true" ? true : void 0
    });
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    console.error("[ProductController] GET /products error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const product = await productService.getById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error("[ProductController] GET /products/:id error:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { product, error } = await productService.create(req.body);
    if (error) {
      return res.status(400).json({ error });
    }
    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error("[ProductController] POST /products error:", err);
    res.status(500).json({ error: "Failed to create product" });
  }
});
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { product, error } = await productService.update(req.params.id, req.body);
    if (error) {
      return res.status(404).json({ error });
    }
    res.json({ success: true, product });
  } catch (err) {
    console.error("[ProductController] PUT /products/:id error:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
});
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { success, error } = await productService.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error });
    }
    res.json({ success: true, message: `Product ${req.params.id} deleted` });
  } catch (err) {
    console.error("[ProductController] DELETE /products/:id error:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});
router.post("/track", async (req, res) => {
  const { productId, retailer, affiliateUrl } = req.body;
  if (!productId || !retailer) {
    return res.status(400).json({ error: "productId and retailer are required" });
  }
  try {
    await query(
      `INSERT INTO affiliate_clicks (product_id, retailer, affiliate_url, user_id)
       VALUES ($1, $2, $3, $4)`,
      [productId, retailer, affiliateUrl ?? "", req.user?.uid ?? null]
    );
    console.log(`[AFFILIATE TRACK] ${(/* @__PURE__ */ new Date()).toISOString()} | Product: ${productId} | Retailer: ${retailer}`);
    res.json({
      success: true,
      message: "Click logged",
      redirectTarget: affiliateUrl,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (err) {
    console.warn("[ProductController] Affiliate tracking failed:", err.message);
    res.json({ success: true, message: "Click noted (logging unavailable)" });
  }
});
var productController_default = router;

// src/controllers/userController.ts
import { Router as Router2 } from "express";

// src/repositories/userRepository.ts
function rowToUser(row) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    isAdmin: row.is_admin,
    height: row.height,
    bodyType: row.body_type,
    cardSize: row.card_size,
    savedProductIds: row.saved_product_ids ?? [],
    savedFitIds: row.saved_fit_ids ?? [],
    preferences: row.preferences ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
var ADMIN_EMAILS2 = [
  "ytiwari@argusoft.com",
  "yuvrajtiwari0710@gmail.com"
];
var userRepository = {
  async findByUserId(userId) {
    const row = await queryOne(
      "SELECT * FROM users WHERE user_id = $1",
      [userId]
    );
    return row ? rowToUser(row) : null;
  },
  async upsert(userId, email, data) {
    const isAdmin = ADMIN_EMAILS2.includes(email);
    const text = `
      INSERT INTO users (user_id, email, is_admin, height, body_type, card_size, saved_product_ids, saved_fit_ids, preferences)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        email              = EXCLUDED.email,
        is_admin           = $3,
        height             = COALESCE($4, users.height),
        body_type          = COALESCE($5, users.body_type),
        card_size          = COALESCE($6, users.card_size),
        saved_product_ids  = COALESCE($7, users.saved_product_ids),
        saved_fit_ids      = COALESCE($8, users.saved_fit_ids),
        preferences        = COALESCE($9, users.preferences),
        updated_at         = NOW()
      RETURNING *
    `;
    const params = [
      userId,
      email,
      isAdmin,
      data.height ?? null,
      data.bodyType ?? null,
      data.cardSize ?? null,
      data.savedProductIds ?? null,
      data.savedFitIds ?? null,
      data.preferences ? JSON.stringify(data.preferences) : null
    ];
    const rows = await query(text, params);
    return rowToUser(rows[0]);
  },
  async updateProfile(userId, data) {
    const fieldMap = {
      height: "height",
      bodyType: "body_type",
      cardSize: "card_size",
      savedProductIds: "saved_product_ids",
      savedFitIds: "saved_fit_ids",
      preferences: "preferences"
    };
    const jsonFields = /* @__PURE__ */ new Set(["preferences"]);
    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) {
        const val = data[key];
        setClauses.push(`${col} = $${idx++}`);
        params.push(jsonFields.has(key) ? JSON.stringify(val) : val);
      }
    }
    if (setClauses.length === 0) return this.findByUserId(userId);
    setClauses.push(`updated_at = NOW()`);
    params.push(userId);
    const text = `UPDATE users SET ${setClauses.join(", ")} WHERE user_id = $${idx} RETURNING *`;
    const rows = await query(text, params);
    return rows.length > 0 ? rowToUser(rows[0]) : null;
  }
};

// src/controllers/userController.ts
var router2 = Router2();
router2.get("/profile", requireAuth, async (req, res) => {
  try {
    const profile = await userRepository.findByUserId(req.user.uid);
    if (!profile) {
      const created = await userRepository.upsert(
        req.user.uid,
        req.user.email,
        {}
      );
      return res.json({ success: true, profile: created });
    }
    res.json({ success: true, profile });
  } catch (err) {
    console.error("[UserController] GET /profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});
router2.put("/profile", requireAuth, async (req, res) => {
  try {
    const allowedFields = [
      "height",
      "bodyType",
      "cardSize",
      "savedProductIds",
      "savedFitIds",
      "preferences"
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (field in req.body) {
        updates[field] = req.body[field];
      }
    }
    await userRepository.upsert(req.user.uid, req.user.email, {});
    const profile = await userRepository.updateProfile(req.user.uid, updates);
    res.json({ success: true, profile });
  } catch (err) {
    console.error("[UserController] PUT /profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});
var userController_default = router2;

// src/expressApp.ts
var __dirname = "";
try {
  __dirname = path.dirname(fileURLToPath(import.meta.url));
} catch (e) {
  __dirname = process.cwd();
}
var app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    brand: "6FeetnAbove",
    version: "2.0.0",
    database: "supabase-postgres",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/categories", (_req, res) => {
  res.json([
    { name: "Ethnic Wear", theme: "ethnic", tags: ["Wedding", "Festive", "Haldi", "Sangeet"] },
    { name: "Formals", theme: "formals", tags: ["Office", "Boardroom", "Interviews", "Corporate"] },
    { name: "Streetwear", theme: "streetwear", tags: ["Hypebeast", "Oversized", "Skate", "Concert"] },
    { name: "Casuals", theme: "casuals", tags: ["Weekend", "Lounge", "Everyday", "Comfort"] },
    { name: "Summer", theme: "summer", tags: ["Beach", "Brunch", "Linen", "Vacation"] },
    { name: "Winter", theme: "winter", tags: ["Overcoats", "Layering", "Warm Luxury", "Knitted"] },
    { name: "Sneakers", theme: "default", tags: ["Big Sizes", "UK 12-15", "Flat Arches"] }
  ]);
});
app.use("/api/products", productController_default);
app.post("/api/track", (_req, res) => {
  res.redirect(307, "/api/products/track");
});
app.use("/api/users", userController_default);
var expressApp_default = app;

// api/_index.ts
var index_default = expressApp_default;
export {
  index_default as default
};
