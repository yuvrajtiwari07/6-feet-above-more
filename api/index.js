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
    categories: row.categories ?? [],
    subCategory: row.sub_category,
    productSegment: row.product_segment ?? "Upperwear",
    productType: row.product_type ?? "T-Shirt",
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
    reviewsCount: row.reviews_count,
    averageRating: Number(row.average_rating),
    measurements: row.measurements ?? {},
    verdicts: row.verdicts ?? [],
    material: row.material,
    tags: row.tags ?? [],
    discountPercent: Number(row.discount_percent ?? 0),
    isFeatured: row.is_featured,
    // Tall-fit curation fields
    tallFriendly: row.tall_friendly ?? true,
    heightRanges: row.height_ranges ?? [],
    bodyTypes: row.body_types ?? [],
    fitHighlights: row.fit_highlights ?? []
  };
}
var productRepository = {
  async findAll(filters) {
    let text = "SELECT * FROM products WHERE 1=1";
    const params = [];
    let idx = 1;
    if (filters?.category) {
      text += ` AND (LOWER(category) = LOWER($${idx}) OR $${idx} = ANY(SELECT LOWER(unnest(categories))))`;
      params.push(filters.category);
      idx++;
    }
    if (filters?.brand) {
      text += ` AND LOWER(brand) = LOWER($${idx++})`;
      params.push(filters.brand);
    }
    if (filters?.search) {
      text += ` AND (LOWER(title) LIKE $${idx} OR LOWER(brand) LIKE $${idx} OR LOWER(category) LIKE $${idx} OR LOWER(product_segment) LIKE $${idx} OR LOWER(product_type) LIKE $${idx})`;
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
        id, brand, title, category, categories, sub_category, product_segment, product_type,
        description, fit_type, retailer, affiliate_url, price_at_retailer,
        images, occasions, seasons, colors, sizes, verified_tier, out_of_stock,
        verification_badges, merchant_links, reviews_count,
        average_rating, measurements, verdicts,
        material, tags, discount_percent, is_featured,
        tall_friendly, height_ranges, body_types, fit_highlights
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34
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
      p.categories ?? [],
      p.subCategory ?? null,
      p.productSegment,
      p.productType,
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
      p.reviewsCount ?? 0,
      p.averageRating ?? 0,
      JSON.stringify(p.measurements ?? {}),
      JSON.stringify(p.verdicts ?? []),
      p.material ?? null,
      p.tags ?? [],
      p.discountPercent ?? 0,
      p.isFeatured ?? false,
      p.tallFriendly ?? true,
      p.heightRanges ?? [],
      p.bodyTypes ?? [],
      p.fitHighlights ?? []
    ];
    const rows = await query(text, params);
    return rowToProduct(rows[0]);
  },
  async update(id, partial) {
    const fieldMap = {
      brand: "brand",
      title: "title",
      category: "category",
      categories: "categories",
      subCategory: "sub_category",
      productSegment: "product_segment",
      productType: "product_type",
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
      reviewsCount: "reviews_count",
      averageRating: "average_rating",
      measurements: "measurements",
      verdicts: "verdicts",
      material: "material",
      tags: "tags",
      discountPercent: "discount_percent",
      isFeatured: "is_featured",
      tallFriendly: "tall_friendly",
      heightRanges: "height_ranges",
      bodyTypes: "body_types",
      fitHighlights: "fit_highlights"
    };
    const jsonbFields = /* @__PURE__ */ new Set(["merchantLinks", "measurements", "verdicts"]);
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
  if (!p.productSegment?.trim()) return "Product Segment is required";
  if (!p.productType?.trim()) return "Product Type is required";
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
    categories: (p.categories ?? []).filter(Boolean),
    subCategory: p.subCategory?.trim(),
    productSegment: p.productSegment.trim(),
    productType: p.productType.trim(),
    description: p.description?.trim(),
    retailer: p.retailer?.trim() ?? "",
    affiliateUrl: p.affiliateUrl?.trim() || "https://6feetabove.com/redirect",
    // Sanitize arrays
    images: (p.images ?? []).filter(Boolean),
    occasions: (p.occasions ?? []).filter(Boolean),
    seasons: (p.seasons ?? []).filter(Boolean),
    colors: (p.colors ?? []).filter(Boolean),
    sizes: (p.sizes ?? []).filter(Boolean),
    tags: (p.tags ?? []).filter(Boolean),
    heightRanges: (p.heightRanges ?? []).filter(Boolean),
    bodyTypes: (p.bodyTypes ?? []).filter(Boolean),
    fitHighlights: (p.fitHighlights ?? []).filter(Boolean)
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

// src/repositories/reviewRepository.ts
function rowToReview(row) {
  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    userEmail: row.user_email,
    rating: Number(row.rating),
    height: row.height,
    weight: row.weight,
    bodyType: row.body_type,
    reviewText: row.review_text,
    createdAt: row.created_at?.toISOString?.() ?? row.created_at
  };
}
var reviewRepository = {
  async findByProductId(productId) {
    const rows = await query(
      "SELECT * FROM reviews WHERE product_id = $1 ORDER BY created_at DESC",
      [productId]
    );
    return rows.map(rowToReview);
  },
  async create(review) {
    const text = `
      INSERT INTO reviews (product_id, user_id, user_email, rating, height, weight, body_type, review_text)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      review.productId,
      review.userId ?? null,
      review.userEmail ?? null,
      review.rating,
      review.height ?? null,
      review.weight ?? null,
      review.bodyType ?? null,
      review.reviewText ?? null
    ];
    const rows = await query(text, params);
    return rowToReview(rows[0]);
  },
  async getAggregateRating(productId) {
    const row = await queryOne(
      "SELECT COUNT(*)::int as count, COALESCE(ROUND(AVG(rating)::numeric, 1), 0) as average FROM reviews WHERE product_id = $1",
      [productId]
    );
    return {
      count: row?.count ?? 0,
      average: Number(row?.average ?? 0)
    };
  },
  async hasUserReviewed(productId, userId) {
    const row = await queryOne(
      "SELECT 1 FROM reviews WHERE product_id = $1 AND user_id = $2 LIMIT 1",
      [productId, userId]
    );
    return !!row;
  }
};

// src/services/reviewService.ts
var reviewService = {
  async getByProductId(productId) {
    if (!productId) return [];
    return reviewRepository.findByProductId(productId);
  },
  async create(data) {
    if (!data.productId?.trim()) return { error: "Product ID is required" };
    if (!data.rating || data.rating < 1 || data.rating > 5) return { error: "Rating must be between 1 and 5" };
    if (data.reviewText && data.reviewText.length > 1e3) return { error: "Review text must be under 1000 characters" };
    if (data.userId) {
      const alreadyReviewed = await reviewRepository.hasUserReviewed(data.productId, data.userId);
      if (alreadyReviewed) {
        return { error: "You have already reviewed this product" };
      }
    }
    const review = await reviewRepository.create(data);
    await query("SELECT refresh_product_rating($1)", [data.productId]);
    return { review };
  },
  async getAggregateRating(productId) {
    return reviewRepository.getAggregateRating(productId);
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
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviews = await reviewService.getByProductId(req.params.id);
    const aggregate = await reviewService.getAggregateRating(req.params.id);
    res.json({ success: true, reviews, ...aggregate });
  } catch (err) {
    console.error("[ProductController] GET /reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});
router.post("/:id/reviews", requireAuth, async (req, res) => {
  try {
    const user = req.user;
    const { review, error } = await reviewService.create({
      productId: req.params.id,
      userId: user?.uid,
      userEmail: user?.email,
      rating: req.body.rating,
      height: req.body.height,
      weight: req.body.weight,
      bodyType: req.body.bodyType,
      reviewText: req.body.reviewText
    });
    if (error) {
      return res.status(400).json({ error });
    }
    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error("[ProductController] POST /reviews error:", err);
    res.status(500).json({ error: "Failed to submit review" });
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

// src/lib/importers/MyntraImporter.ts
import * as cheerio2 from "cheerio";

// src/lib/importers/BaseImporter.ts
import * as cheerio from "cheerio";
var BaseImporter = class {
  // ─── Shared Fetch Utility ────────────────────────────────────────────────
  /**
   * Fetches the raw HTML of a page, mimicking a real browser request.
   */
  async fetchPage(url) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15e3)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} fetching ${url}`);
    }
    return response.text();
  }
  // ─── JSON-LD Extraction ──────────────────────────────────────────────────
  /**
   * Extracts the first matching JSON-LD object from <script type="application/ld+json"> tags.
   * Returns null if nothing useful is found.
   */
  extractJsonLd(html, type) {
    const $ = cheerio.load(html);
    const results = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || "{}");
        const items = Array.isArray(data) ? data : [data];
        results.push(...items);
      } catch {
      }
    });
    if (!results.length) return null;
    if (type) {
      return results.find(
        (r) => r["@type"] === type || Array.isArray(r["@type"]) && r["@type"].includes(type)
      ) ?? null;
    }
    return results.find((r) => r["@type"] === "Product") ?? results[0] ?? null;
  }
  // ─── Meta Tag Extraction ─────────────────────────────────────────────────
  /**
   * Extracts OpenGraph and standard meta tag values from the page.
   */
  extractMetaTags(html) {
    const $ = cheerio.load(html);
    const meta = {};
    $("meta").each((_, el) => {
      const property = $(el).attr("property") || $(el).attr("name");
      const content = $(el).attr("content");
      if (property && content) {
        meta[property] = content;
      }
    });
    return meta;
  }
  // ─── Embedded Window State Extraction ───────────────────────────────────
  /**
   * Extracts JSON data embedded in <script> tags as window variables.
   * Many SPAs (Myntra, AJIO, Flipkart) embed full product state in the initial HTML.
   *
   * @param html - Raw HTML string
   * @param patterns - Array of regex patterns to try; first successful match wins
   */
  extractEmbeddedState(html, patterns) {
    for (const pattern of patterns) {
      try {
        const match = html.match(pattern);
        if (match && match[1]) {
          return JSON.parse(match[1]);
        }
      } catch {
      }
    }
    return null;
  }
  // ─── Shared Parsing Helpers ──────────────────────────────────────────────
  /**
   * Cleans a price string like "₹1,299" → 1299
   */
  parsePrice(raw) {
    if (!raw) return void 0;
    const clean = raw.replace(/[^\d.]/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? void 0 : num;
  }
  /**
   * Parses a comma or pipe separated string into a clean string array.
   */
  splitList(raw, sep = /[,|]/) {
    if (!raw) return [];
    return raw.split(sep).map((s) => s.trim()).filter(Boolean);
  }
  /**
   * Strips HTML tags from a string.
   */
  stripHtml(raw) {
    if (!raw) return "";
    return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  /**
   * Normalizes a JSON-LD offer block into price + discount.
   */
  parseJsonLdOffer(offer) {
    if (!offer) return {};
    const offers = Array.isArray(offer) ? offer[0] : offer;
    const price = this.parsePrice(String(offers.price ?? ""));
    const highPrice = this.parsePrice(String(offers.highPrice ?? ""));
    let discountPercent;
    if (price && highPrice && highPrice > price) {
      discountPercent = Math.round((highPrice - price) / highPrice * 100);
    }
    return { price, originalPrice: highPrice, discountPercent };
  }
};

// src/lib/importers/MyntraImporter.ts
var MyntraImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "Myntra";
  }
  canHandle(url) {
    return url.includes("myntra.com");
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const embedded = this.extractEmbeddedState(html, [
      /window\.__DATA__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /"pdpData"\s*:\s*(\{.+?\})\s*,\s*"seoData"/s
    ]);
    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd) {
      return this.parseJsonLd(jsonLd, url);
    }
    return this.parseDom(html, url);
  }
  parseEmbeddedData(data, url) {
    const pdp = data?.pdpData ?? data?.product ?? data;
    const media = pdp?.media ?? pdp?.images ?? {};
    const pricing = pdp?.price ?? pdp?.priceInfo ?? {};
    const sizes = pdp?.sizes ?? pdp?.sizeChartDetail ?? [];
    const images = [];
    const rawImages = media?.images ?? media?.albumMedia ?? [];
    for (const img of rawImages) {
      const src = img?.src ?? img?.imageURL ?? img?.url;
      if (src && typeof src === "string") images.push(src);
    }
    const sizeList = sizes.map((s) => s?.label ?? s?.size ?? s?.displayValue).filter(Boolean);
    const name = pdp?.name ?? pdp?.productDisplayName ?? "";
    const brandName = pdp?.brand?.name ?? pdp?.brandName ?? "";
    return {
      brand: brandName || void 0,
      title: name || void 0,
      description: this.stripHtml(pdp?.description ?? pdp?.productDescriptors?.description?.value),
      price: this.parsePrice(String(pricing?.discounted ?? pricing?.salePrice ?? pricing?.mrp ?? "")),
      originalPrice: this.parsePrice(String(pricing?.mrp ?? "")),
      discountPercent: pricing?.discountPercent ?? void 0,
      images: images.length > 0 ? images : void 0,
      sizes: sizeList.length > 0 ? sizeList : void 0,
      colors: pdp?.colours ? [pdp.colours] : void 0,
      material: pdp?.fabric ?? pdp?.material ?? void 0,
      careInstructions: pdp?.careInfo ?? void 0,
      averageRating: pdp?.ratings?.averageRating ?? void 0,
      reviewsCount: pdp?.ratings?.totalCount ?? void 0,
      retailer: "Myntra",
      retailerUrl: url
    };
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    return {
      brand: data.brand?.name ?? data.brand ?? void 0,
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      colors: data.color ? [data.color] : void 0,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ?? void 0,
      reviewsCount: data.aggregateRating?.reviewCount ?? void 0,
      retailer: "Myntra",
      retailerUrl: url
    };
  }
  parseDom(html, url) {
    const $ = cheerio2.load(html);
    const meta = this.extractMetaTags(html);
    return {
      title: (meta["og:title"] ?? $("h1").first().text().trim()) || void 0,
      description: meta["og:description"] ?? void 0,
      images: meta["og:image"] ? [meta["og:image"]] : void 0,
      retailer: "Myntra",
      retailerUrl: url
    };
  }
};

// src/lib/importers/AjioImporter.ts
import * as cheerio3 from "cheerio";
var AjioImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "AJIO";
  }
  canHandle(url) {
    return url.includes("ajio.com");
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /window\.__APP_STATE__\s*=\s*(\{.+?\});?\s*<\/script>/s,
      /__NEXT_DATA__['"]\s*type="application\/json"\s*>\s*(\{.+?\})\s*<\/script>/s
    ]);
    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }
    return this.parseDom(html, url);
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image.filter((i) => typeof i === "string") : data.image ? [data.image] : [];
    const sizes = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer) => {
        if (offer.itemOffered?.size) sizes.push(offer.itemOffered.size);
      });
    }
    return {
      brand: data.brand?.name ?? data.brand ?? void 0,
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images: images.length > 0 ? images : void 0,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : void 0,
      colors: data.color ? [data.color] : void 0,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : void 0,
      reviewsCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : void 0,
      retailer: "AJIO",
      retailerUrl: url
    };
  }
  parseEmbeddedData(data, url) {
    const productData = data?.props?.pageProps?.product ?? data?.product ?? data?.pageData?.product ?? data;
    const images = (productData?.images ?? productData?.media ?? []).map((img) => img?.url ?? img?.src ?? img).filter((src) => typeof src === "string" && src.startsWith("http"));
    return {
      brand: productData?.brandName ?? productData?.brand ?? void 0,
      title: productData?.name ?? productData?.productName ?? void 0,
      description: this.stripHtml(productData?.description),
      price: this.parsePrice(String(productData?.price ?? productData?.salePrice ?? "")),
      originalPrice: this.parsePrice(String(productData?.mrp ?? "")),
      images: images.length > 0 ? images : void 0,
      colors: productData?.colour ? [productData.colour] : void 0,
      material: productData?.fabric ?? productData?.material ?? void 0,
      retailer: "AJIO",
      retailerUrl: url
    };
  }
  parseDom(html, url) {
    const $ = cheerio3.load(html);
    const meta = this.extractMetaTags(html);
    const title = $(".prod-name").first().text().trim() || meta["og:title"] || $("h1").first().text().trim() || void 0;
    const priceText = $(".prod-sp").first().text() || meta["product:price:amount"];
    const images = meta["og:image"] ? [meta["og:image"]] : [];
    return {
      title,
      price: this.parsePrice(priceText),
      description: meta["og:description"] ?? void 0,
      images: images.length > 0 ? images : void 0,
      retailer: "AJIO",
      retailerUrl: url
    };
  }
};

// src/lib/importers/AmazonImporter.ts
import * as cheerio4 from "cheerio";
var AmazonImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "Amazon";
  }
  canHandle(url) {
    return /amazon\.(in|com|co\.uk|de|fr|ca|com\.au)/.test(url);
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const $ = cheerio4.load(html);
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      const base = this.parseJsonLd(jsonLd, url);
      return this.augmentWithDom($, base, url);
    }
    return this.parseDom($, html, url);
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    return {
      brand: data.brand?.name ?? data.brand ?? void 0,
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : void 0,
      reviewsCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : void 0,
      retailer: "Amazon",
      retailerUrl: url
    };
  }
  augmentWithDom($, base, url) {
    if (!base.images || base.images.length === 0) {
      const imgData = this.extractAmazonImages($);
      if (imgData.length > 0) base.images = imgData;
    }
    if (!base.brand) {
      base.brand = $("#bylineInfo").text().replace("Brand: ", "").trim() || void 0;
    }
    if (!base.price) {
      base.price = this.parsePrice($(".a-price .a-offscreen").first().text());
    }
    return base;
  }
  parseDom($, html, url) {
    const meta = this.extractMetaTags(html);
    const title = $("#productTitle").text().trim() || meta["og:title"] || void 0;
    const brand = $("#bylineInfo").text().replace(/^(Brand:|Visit the|Store)[\s]+/i, "").trim() || meta["og:brand"] || void 0;
    const priceRaw = $(".a-price .a-offscreen").first().text() || meta["product:price:amount"] || "";
    const price = this.parsePrice(priceRaw);
    const description = $("#feature-bullets").text().replace(/\n+/g, " ").trim() || meta["og:description"] || void 0;
    const ratingText = $("#acrPopover").attr("title") ?? "";
    const averageRating = parseFloat(ratingText) || void 0;
    const reviewsText = $("#acrCustomerReviewText").text();
    const reviewsCount = parseInt(reviewsText.replace(/[^\d]/g, "")) || void 0;
    const images = this.extractAmazonImages($);
    const ogImage = meta["og:image"];
    if (ogImage && !images.includes(ogImage)) images.unshift(ogImage);
    const sizes = [];
    $('[id*="size_name"] .selection').each((_, el) => {
      const size = $(el).text().trim();
      if (size) sizes.push(size);
    });
    const colors = [];
    $('[id*="color_name"] .selection, [id*="colour_name"] .selection').each((_, el) => {
      const color = $(el).text().trim();
      if (color) colors.push(color);
    });
    let material;
    $("table.a-keyvalue tr").each((_, row) => {
      const label = $("td.a-span3, th", row).text().toLowerCase();
      const value = $("td.a-span9, td:last-child", row).text().trim();
      if (label.includes("fabric") || label.includes("material")) {
        material = value;
      }
    });
    return {
      brand,
      title,
      description,
      price,
      images: images.length > 0 ? images : void 0,
      sizes: sizes.length > 0 ? sizes : void 0,
      colors: colors.length > 0 ? colors : void 0,
      material,
      averageRating,
      reviewsCount,
      retailer: "Amazon",
      retailerUrl: url
    };
  }
  /** Extracts the large image URLs from Amazon's embedded image JSON */
  extractAmazonImages($) {
    const images = [];
    $("script").each((_, el) => {
      const content = $(el).html() ?? "";
      if (content.includes("'colorImages'") || content.includes('"colorImages"')) {
        const match = content.match(/"hiRes"\s*:\s*"(https:[^"]+)"/g);
        if (match) {
          match.forEach((m) => {
            const url = m.match(/"hiRes"\s*:\s*"(https:[^"]+)"/)?.[1];
            if (url && !images.includes(url)) images.push(url);
          });
        }
      }
    });
    return images;
  }
};

// src/lib/importers/FlipkartImporter.ts
import * as cheerio5 from "cheerio";
var FlipkartImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "Flipkart";
  }
  canHandle(url) {
    return url.includes("flipkart.com");
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const embedded = this.extractEmbeddedState(html, [
      /window\.__INITIAL_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s,
      /window\.__PRELOADED_STATE__\s*=\s*(\{.+?\});\s*<\/script>/s
    ]);
    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }
    return this.parseDom(html, url);
  }
  parseEmbeddedData(data, url) {
    const pdp = this.deepFind(
      data,
      (node) => node && typeof node === "object" && (node.productName || node.title)
    );
    if (!pdp) return { retailer: "Flipkart", retailerUrl: url };
    const images = (pdp?.images ?? []).map((img) => img?.url ?? img?.src ?? (typeof img === "string" ? img : null)).filter((s) => typeof s === "string" && s.startsWith("http"));
    const sizes = (pdp?.sizes ?? []).map((s) => s?.displayId ?? s?.id ?? s).filter(Boolean);
    return {
      brand: pdp?.brandName ?? pdp?.brand ?? void 0,
      title: pdp?.productName ?? pdp?.title ?? void 0,
      description: this.stripHtml(pdp?.description ?? pdp?.productDescription),
      price: this.parsePrice(String(pdp?.price?.finalPrice ?? pdp?.finalPrice ?? "")),
      originalPrice: this.parsePrice(String(pdp?.price?.mrp ?? pdp?.mrp ?? "")),
      discountPercent: pdp?.price?.discountPercentage ?? void 0,
      images: images.length > 0 ? images : void 0,
      sizes: sizes.length > 0 ? sizes : void 0,
      colors: pdp?.colour ? [pdp.colour] : void 0,
      material: pdp?.fabric ?? void 0,
      averageRating: pdp?.overallRating ? Number(pdp.overallRating) : void 0,
      reviewsCount: pdp?.totalReviewCount ?? void 0,
      retailer: "Flipkart",
      retailerUrl: url
    };
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    return {
      brand: data.brand?.name ?? data.brand ?? void 0,
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : void 0,
      reviewsCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : void 0,
      retailer: "Flipkart",
      retailerUrl: url
    };
  }
  parseDom(html, url) {
    const $ = cheerio5.load(html);
    const meta = this.extractMetaTags(html);
    const title = $("span.B_NuCI").text().trim() || meta["og:title"] || void 0;
    const price = this.parsePrice($("div._30jeq3._16Jk6d").first().text() || meta["product:price:amount"]);
    const brand = $("span.G6XhRU").text().trim() || void 0;
    const images = meta["og:image"] ? [meta["og:image"]] : [];
    return {
      brand,
      title,
      price,
      description: meta["og:description"] ?? void 0,
      images: images.length > 0 ? images : void 0,
      retailer: "Flipkart",
      retailerUrl: url
    };
  }
  /** Deep searches an object tree for the first node matching a predicate */
  deepFind(obj, predicate, depth = 0) {
    if (depth > 8 || !obj || typeof obj !== "object") return null;
    if (predicate(obj)) return obj;
    for (const val of Object.values(obj)) {
      const found = this.deepFind(val, predicate, depth + 1);
      if (found) return found;
    }
    return null;
  }
};

// src/lib/importers/HmImporter.ts
import * as cheerio6 from "cheerio";
var HmImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "H&M";
  }
  canHandle(url) {
    return url.includes("hm.com") || url.includes("h2.com") || url.includes("h&m.com");
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }
    const nextData = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s
    ]);
    if (nextData) {
      return this.parseNextData(nextData, url);
    }
    return this.parseDom(html, url);
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    const sizes = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer) => {
        const size = offer.itemOffered?.size ?? offer.size;
        if (size) sizes.push(size);
      });
    }
    const colors = [];
    if (data.color) colors.push(data.color);
    if (Array.isArray(data.offers)) {
      data.offers.forEach((offer) => {
        const color = offer.itemOffered?.color ?? offer.color;
        if (color && !colors.includes(color)) colors.push(color);
      });
    }
    return {
      brand: "H&M",
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : void 0,
      colors: colors.length > 0 ? [...new Set(colors)] : void 0,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : void 0,
      reviewsCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : void 0,
      retailer: "H&M",
      retailerUrl: url
    };
  }
  parseNextData(data, url) {
    const product = data?.props?.pageProps?.product ?? data?.props?.pageProps?.initialData?.product ?? data;
    const images = (product?.images ?? product?.galleryImages ?? []).map((img) => {
      const src = img?.url ?? img?.src ?? img?.baseUrl;
      return src?.startsWith("http") ? src : src ? `https:${src}` : null;
    }).filter(Boolean);
    const sizes = (product?.variants ?? product?.sizes ?? []).map((v) => v?.size ?? v?.value ?? v?.label).filter(Boolean);
    return {
      brand: "H&M",
      title: product?.name ?? product?.title ?? void 0,
      description: this.stripHtml(product?.description ?? product?.longDescription),
      price: this.parsePrice(String(product?.price?.value ?? product?.salePrice ?? "")),
      originalPrice: this.parsePrice(String(product?.price?.originalValue ?? "")),
      images: images.length > 0 ? images : void 0,
      sizes: sizes.length > 0 ? sizes : void 0,
      colors: product?.color ? [product.color] : void 0,
      material: product?.material ?? product?.fabric ?? void 0,
      retailer: "H&M",
      retailerUrl: url
    };
  }
  parseDom(html, url) {
    const $ = cheerio6.load(html);
    const meta = this.extractMetaTags(html);
    const title = (meta["og:title"] ?? $("h1").first().text().trim()) || void 0;
    const price = this.parsePrice(meta["product:price:amount"] || $(".price-value").first().text());
    const images = meta["og:image"] ? [meta["og:image"]] : [];
    return {
      brand: "H&M",
      title,
      price,
      description: meta["og:description"] ?? void 0,
      images: images.length > 0 ? images : void 0,
      retailer: "H&M",
      retailerUrl: url
    };
  }
};

// src/lib/importers/ZaraImporter.ts
import * as cheerio7 from "cheerio";
var ZaraImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "Zara";
  }
  canHandle(url) {
    return url.includes("zara.com");
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      return this.parseJsonLd(jsonLd, url);
    }
    const embedded = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s,
      /window\.Zara\.cfg\s*=\s*(\{.+?\});\s*<\/script>/s
    ]);
    if (embedded) {
      return this.parseEmbeddedData(embedded, url);
    }
    const apiProduct = await this.tryZaraApi(url);
    if (apiProduct) return apiProduct;
    return this.parseDom(html, url);
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    const colors = [];
    if (data.color) colors.push(data.color);
    const sizes = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((o) => {
        const size = o.itemOffered?.size ?? o.size;
        if (size) sizes.push(size);
      });
    }
    return {
      brand: "Zara",
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      colors: colors.length > 0 ? colors : void 0,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : void 0,
      material: data.material ?? void 0,
      retailer: "Zara",
      retailerUrl: url
    };
  }
  parseEmbeddedData(data, url) {
    const product = data?.props?.pageProps?.product ?? data?.props?.pageProps?.initialProduct ?? data?.product ?? data;
    const detail = product?.detail ?? product;
    const colors = (detail?.colors ?? []).map((c) => c?.name ?? c?.label).filter(Boolean);
    const sizes = (detail?.sizes ?? detail?.variants ?? []).map((s) => s?.name ?? s?.displaySize ?? s?.label).filter(Boolean);
    const images = [];
    (detail?.media ?? detail?.xmedia ?? []).forEach((media) => {
      (media?.xmedia ?? [media]).forEach((img) => {
        if (img?.url) {
          const src = img.url.startsWith("http") ? img.url : `https:${img.url}`;
          images.push(src);
        }
      });
    });
    const price = detail?.price != null ? typeof detail.price === "number" ? detail.price / 100 : this.parsePrice(String(detail.price)) : void 0;
    return {
      brand: "Zara",
      title: detail?.name ?? product?.name ?? void 0,
      description: this.stripHtml(detail?.description ?? product?.description),
      price,
      images: images.length > 0 ? images : void 0,
      colors: colors.length > 0 ? colors : void 0,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : void 0,
      retailer: "Zara",
      retailerUrl: url
    };
  }
  /** Zara has a public API — try fetching structured JSON directly */
  async tryZaraApi(pageUrl) {
    try {
      const match = pageUrl.match(/\b(\d{7,10})\.html/);
      if (!match) return null;
      const productId = match[1];
      const locale = pageUrl.includes("/en-in/") ? "en_IN" : "en_US";
      const apiUrl = `https://www.zara.com/itxrest/3/catalog/store/25009456/product/category/0/detail?productId=${productId}&locale=${locale}`;
      const response = await fetch(apiUrl, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" },
        signal: AbortSignal.timeout(8e3)
      });
      if (!response.ok) return null;
      const data = await response.json();
      return this.parseEmbeddedData(data, pageUrl);
    } catch {
      return null;
    }
  }
  parseDom(html, url) {
    const $ = cheerio7.load(html);
    const meta = this.extractMetaTags(html);
    const title = (meta["og:title"] ?? $("h1").first().text().trim()) || void 0;
    const price = this.parsePrice(meta["product:price:amount"] || $(".price__amount-current").first().text());
    const images = meta["og:image"] ? [meta["og:image"]] : [];
    return {
      brand: "Zara",
      title,
      price,
      description: meta["og:description"] ?? void 0,
      images: images.length > 0 ? images : void 0,
      retailer: "Zara",
      retailerUrl: url
    };
  }
};

// src/lib/importers/GenericImporter.ts
import * as cheerio8 from "cheerio";
var GenericImporter = class extends BaseImporter {
  constructor() {
    super(...arguments);
    this.retailerName = "Retailer";
  }
  // Handles everything — always returns true (last resort)
  canHandle(_url) {
    return true;
  }
  async importProduct(url) {
    const html = await this.fetchPage(url);
    const meta = this.extractMetaTags(html);
    const retailerName = this.detectRetailerName(url, meta);
    const jsonLd = this.extractJsonLd(html, "Product");
    if (jsonLd?.name) {
      return {
        ...this.parseJsonLd(jsonLd, url),
        retailer: retailerName,
        retailerUrl: url
      };
    }
    const nextData = this.extractEmbeddedState(html, [
      /<script id="__NEXT_DATA__"[^>]*>\s*(\{.+?\})\s*<\/script>/s
    ]);
    if (nextData) {
      const parsed = this.parseNextData(nextData, url, retailerName);
      if (parsed.title || parsed.price || (parsed.images?.length ?? 0) > 0) {
        return parsed;
      }
    }
    return this.parseFromMeta(meta, html, url, retailerName);
  }
  parseJsonLd(data, url) {
    const offers = this.parseJsonLdOffer(data.offers);
    const images = Array.isArray(data.image) ? data.image : data.image ? [data.image] : [];
    const sizes = [];
    const colors = [];
    if (Array.isArray(data.offers)) {
      data.offers.forEach((o) => {
        const size = o.itemOffered?.size ?? o.size;
        const color = o.itemOffered?.color ?? o.color;
        if (size) sizes.push(size);
        if (color && !colors.includes(color)) colors.push(color);
      });
    }
    if (data.color && !colors.includes(data.color)) colors.push(data.color);
    return {
      brand: data.brand?.name ?? data.brand ?? void 0,
      title: data.name ?? void 0,
      description: this.stripHtml(data.description),
      ...offers,
      images,
      sizes: sizes.length > 0 ? [...new Set(sizes)] : void 0,
      colors: colors.length > 0 ? [...new Set(colors)] : void 0,
      material: data.material ?? void 0,
      averageRating: data.aggregateRating?.ratingValue ? Number(data.aggregateRating.ratingValue) : void 0,
      reviewsCount: data.aggregateRating?.reviewCount ? Number(data.aggregateRating.reviewCount) : void 0
    };
  }
  parseNextData(data, url, retailerName) {
    const product = data?.props?.pageProps?.product ?? data?.props?.pageProps?.data?.product ?? data?.props?.pageProps?.productDetails ?? data?.props?.pageProps?.initialData?.product;
    if (!product) return { retailer: retailerName, retailerUrl: url };
    const images = (product?.images ?? product?.media ?? product?.gallery ?? []).map((img) => {
      const src = img?.url ?? img?.src ?? img?.imageURL ?? (typeof img === "string" ? img : null);
      if (!src) return null;
      return src.startsWith("http") ? src : src.startsWith("//") ? `https:${src}` : null;
    }).filter(Boolean);
    return {
      brand: product?.brand?.name ?? product?.brandName ?? product?.brand ?? void 0,
      title: product?.name ?? product?.title ?? product?.productName ?? void 0,
      description: this.stripHtml(product?.description ?? product?.shortDescription),
      price: this.parsePrice(String(product?.price?.value ?? product?.salePrice ?? product?.price ?? "")),
      originalPrice: this.parsePrice(String(product?.originalPrice ?? product?.mrp ?? product?.price?.originalValue ?? "")),
      images: images.length > 0 ? images : void 0,
      colors: product?.color ? [product.color] : product?.colours ? [product.colours] : void 0,
      material: product?.material ?? product?.fabric ?? void 0,
      retailer: retailerName,
      retailerUrl: url
    };
  }
  parseFromMeta(meta, html, url, retailerName) {
    const $ = cheerio8.load(html);
    const title = (meta["og:title"] ?? $("h1").first().text().trim()) || void 0;
    const description = meta["og:description"] ?? $('meta[name="description"]').attr("content") ?? void 0;
    const images = [];
    if (meta["og:image:secure_url"]) images.push(meta["og:image:secure_url"]);
    else if (meta["og:image"]) images.push(meta["og:image"]);
    const priceRaw = meta["product:price:amount"] ?? meta["og:price:amount"] ?? "";
    const price = this.parsePrice(priceRaw) || void 0;
    const brand = meta["og:brand"] ?? meta["product:brand"] ?? void 0;
    return {
      brand,
      title,
      description,
      price,
      images: images.length > 0 ? images : void 0,
      retailer: retailerName,
      retailerUrl: url
    };
  }
  /** Detects a human-readable retailer name from the domain or site meta. */
  detectRetailerName(url, meta) {
    if (meta["og:site_name"]) return meta["og:site_name"];
    const known = {
      "urbanic.com": "Urbanic",
      "bewakoof.com": "Bewakoof",
      "snitchofficial.com": "Snitch",
      "snitch.co.in": "Snitch",
      "rarerabbit.in": "Rare Rabbit",
      "tatacliq.com": "Tata CLiQ",
      "nykaa.com": "Nykaa Fashion",
      "nykaafashion.com": "Nykaa Fashion",
      "meesho.com": "Meesho",
      "limeroad.com": "LimeRoad",
      "craftsvilla.com": "Craftsvilla",
      "manyavar.com": "Manyavar",
      "fabindia.com": "FabIndia",
      "westside.com": "Westside",
      "wrogn.com": "Wrogn",
      "uniqlo.com": "Uniqlo"
    };
    try {
      const hostname = new URL(url).hostname.replace("www.", "");
      for (const [pattern, name] of Object.entries(known)) {
        if (hostname.includes(pattern)) return name;
      }
      return hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
    } catch {
      return "Retailer";
    }
  }
};

// src/lib/importers/ImporterFactory.ts
var REGISTRY = [
  new MyntraImporter(),
  new AjioImporter(),
  new AmazonImporter(),
  new FlipkartImporter(),
  new HmImporter(),
  new ZaraImporter()
];
var GENERIC = new GenericImporter();
var ImporterFactory = class _ImporterFactory {
  /**
   * Returns the most appropriate importer for the given URL.
   * Falls back to GenericImporter if no specific importer matches.
   */
  static getImporter(url) {
    for (const importer of REGISTRY) {
      if (importer.canHandle(url)) {
        return importer;
      }
    }
    return GENERIC;
  }
  /**
   * Detects the retailer name for a URL without running the full import.
   * Used by the UI to display "Detected Retailer: Myntra" immediately.
   */
  static detectRetailerName(url) {
    const importer = _ImporterFactory.getImporter(url);
    if (importer !== GENERIC) return importer.retailerName;
    return GENERIC.retailerName;
  }
};

// src/expressApp.ts
import { GoogleGenAI } from "@google/genai";
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
app.post(
  "/api/admin/import-product",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "A product URL is required." });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL format." });
    }
    try {
      const importer = ImporterFactory.getImporter(parsedUrl.href);
      const product = await importer.importProduct(parsedUrl.href);
      return res.json({
        success: true,
        product,
        retailerName: importer.retailerName
      });
    } catch (err) {
      console.error("[ImportProduct] Error importing from URL:", url, err?.message);
      return res.status(502).json({
        success: false,
        error: "Failed to fetch product data from the provided URL.",
        detail: err?.message ?? "Unknown error"
      });
    }
  }
);
app.post(
  "/api/curate/import-url",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, error: "A product URL is required." });
    }
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid URL format." });
    }
    let scraped = {};
    let retailerName = "Retailer";
    try {
      const importer = ImporterFactory.getImporter(parsedUrl.href);
      scraped = await importer.importProduct(parsedUrl.href);
      retailerName = importer.retailerName;
    } catch (err) {
      console.warn("[AICuration] Scraper failed or returned empty. Attempting basic URL parse fallback.", err?.message);
    }
    const isBlocked = !scraped.title || scraped.title.toLowerCase().includes("something went wrong") || scraped.title.toLowerCase().includes("oops") || scraped.title.toLowerCase().includes("access denied") || scraped.title.toLowerCase().includes("cloudflare") || scraped.title.toLowerCase().includes("attention required") || scraped.title.toLowerCase().includes("robot check");
    if (isBlocked) {
      console.log("[AICuration] Scraping blocked or returned error page. Extracting from URL path...");
      const urlMetadata = parseMetadataFromUrl(parsedUrl.href);
      scraped = {
        ...scraped,
        title: urlMetadata.title || scraped.title || "Curated Tall Garment",
        brand: urlMetadata.brand || scraped.brand || "Brand",
        retailer: retailerName,
        isScrapeBlocked: true
      };
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a fashion AI specialized in sizing, styling, and classifying products for tall men (6ft+).
Given this scraped raw product metadata:
${JSON.stringify(scraped)}

And the retailer product URL: ${parsedUrl.href}

Generate a clean, professional, structured curation response matching this JSON schema exactly:
{
  "brand": "Inferred fashion brand (e.g., Zara, Roadster, H&M, Snitch)",
  "title": "Concise human-friendly display title",
  "category": "One of: 'Ethnic Wear', 'Formals', 'Streetwear', 'Casuals'",
  "subCategory": "Garment detailed style (e.g., Shirts, Kurtas, Cargo Pants)",
  "material": "Material blend breakdown (e.g., 100% Cotton, Belgian Linen)",
  "price": 1499,
  "retailer": "Retailer platform name",
  "occasions": ["Daily Wear", "Travel"],
  "seasons": ["All Season"],
  "colors": ["Navy", "Olive"],
  "tags": ["relaxed-fit", "tall-friendly"],
  "tallFit": {
    "tallFriendly": true,
    "recommendedHeightRanges": ["6'2\u20136'3", "6'4\u20136'5"],
    "bodyTypes": ["Athletic", "Broad"],
    "highlights": ["Extended Sleeves", "Longline Dropped Torso"]
  }
}

Strict requirements:
1. "category" MUST be exactly one of: 'Ethnic Wear', 'Formals', 'Streetwear', 'Casuals'.
2. The "price" MUST be an integer number.
3. The response MUST be a single raw JSON object. Do not wrap the JSON output in markdown code blocks or any other formatting.`;
        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        const text = response.text || "";
        const parsedResult = JSON.parse(text.trim());
        return res.json({
          success: true,
          source: "gemini-3.5-flash",
          ...parsedResult
        });
      } catch (err) {
        console.error("[AICuration] Gemini API curation failed. Falling back to structured parser.", err?.message);
      }
    }
    try {
      const fallbackResult = runFallbackParser(scraped, parsedUrl.href, retailerName);
      return res.json(fallbackResult);
    } catch (err) {
      return res.status(502).json({
        success: false,
        error: "Failed to curate product from URL.",
        detail: err?.message ?? "Unknown error"
      });
    }
  }
);
function runFallbackParser(scraped, url, detectedRetailer) {
  let retailer = scraped.retailer || detectedRetailer || "Retailer";
  if (retailer === "Retailer" || !retailer) {
    try {
      const host = new URL(url).hostname.replace("www.", "").split(".")[0];
      retailer = host.charAt(0).toUpperCase() + host.slice(1);
    } catch {
      retailer = "Retailer";
    }
  }
  const combinedText = `${scraped.title || ""} ${scraped.category || ""} ${scraped.subCategory || ""} ${scraped.description || ""}`.toLowerCase();
  let category = "Casuals";
  if (combinedText.match(/kurta|ethnic|sangeet|sherwani|wedding|festive/)) {
    category = "Ethnic Wear";
  } else if (combinedText.match(/blazer|suit|trousers|formal|corporate|interview/)) {
    category = "Formals";
  } else if (combinedText.match(/hoodie|sweatshirt|cargo|streetwear|skate|hypebeast/)) {
    category = "Streetwear";
  }
  let subCategory = scraped.subCategory || scraped.category || "";
  if (!subCategory) {
    if (combinedText.includes("shirt")) subCategory = "Shirts";
    else if (combinedText.includes("jeans")) subCategory = "Jeans";
    else if (combinedText.includes("kurta")) subCategory = "Kurtas";
    else if (combinedText.includes("sneaker")) subCategory = "Sneakers";
    else if (combinedText.includes("jacket")) subCategory = "Jackets";
    else subCategory = "Garments";
  }
  const price = typeof scraped.price === "number" ? scraped.price : 1499;
  const highlights = ["Extended Torso Fit"];
  if (combinedText.match(/shirt|jacket|hoodie|sweatshirt/)) {
    highlights.push("Extended Sleeves");
  } else if (combinedText.match(/pants|jeans|cargo|chinos/)) {
    highlights.push("Extra Inseam Length");
  }
  return {
    success: true,
    source: "fallback-parser",
    brand: scraped.brand || "Roadster",
    title: scraped.title || "Curated Tall Garment",
    category,
    subCategory,
    material: scraped.material || "100% Cotton",
    price,
    retailer,
    occasions: scraped.occasions && scraped.occasions.length > 0 ? scraped.occasions : ["Daily Wear"],
    seasons: scraped.seasons && scraped.seasons.length > 0 ? scraped.seasons : ["All Season"],
    colors: scraped.colors && scraped.colors.length > 0 ? scraped.colors : ["Navy"],
    tags: scraped.tags && scraped.tags.length > 0 ? scraped.tags : ["relaxed-fit", "tall-friendly"],
    tallFit: {
      tallFriendly: true,
      recommendedHeightRanges: ["6'2\u20136'3", "6'4\u20136'5"],
      bodyTypes: ["Athletic", "Broad"],
      highlights
    }
  };
}
function parseMetadataFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = decodeURIComponent(url.pathname).toLowerCase();
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return {};
    let titleRaw = "";
    let brandRaw = "";
    let categoryRaw = "";
    const domain = url.hostname.replace("www.", "").split(".")[0];
    const detectedRetailer = domain.charAt(0).toUpperCase() + domain.slice(1);
    if (url.hostname.includes("myntra.com")) {
      const buyIdx = segments.indexOf("buy");
      if (buyIdx > 1) {
        titleRaw = segments[buyIdx - 2];
        brandRaw = segments[buyIdx - 3] || "";
      } else if (segments.length >= 2) {
        titleRaw = segments[1];
        brandRaw = segments[0];
      }
    } else if (url.hostname.includes("ajio.com")) {
      const pIdx = segments.indexOf("p");
      if (pIdx > 0) {
        const productSegment = segments[pIdx - 1];
        const parts = productSegment.split("-");
        brandRaw = parts[0] || "";
        titleRaw = parts.slice(1).join(" ");
      }
    } else if (url.hostname.includes("snitch.co.in") || url.hostname.includes("snitch.co")) {
      const prodIdx = segments.indexOf("products");
      if (prodIdx >= 0 && segments[prodIdx + 1]) {
        titleRaw = segments[prodIdx + 1];
        brandRaw = "Snitch";
      }
    } else if (url.hostname.includes("zara.com")) {
      const last = segments[segments.length - 1] || "";
      if (last.includes("-p")) {
        titleRaw = last.split("-p")[0];
        brandRaw = "Zara";
      }
    } else if (url.hostname.includes("hm.com")) {
      if (segments.length >= 2) {
        titleRaw = segments[segments.length - 2] || "";
        brandRaw = "H&M";
      }
    }
    if (!titleRaw) {
      const candidates = segments.filter((s) => {
        return !s.match(/^\d+$/) && !["p", "buy", "product", "products", "in", "en", "item", "items", "detail", "details"].includes(s);
      });
      if (candidates.length > 0) {
        titleRaw = candidates[candidates.length - 1];
      }
    }
    const cleanBrand = brandRaw ? brandRaw.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : detectedRetailer;
    let cleanTitle = titleRaw ? titleRaw.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") : "";
    if (!cleanTitle || cleanTitle.toLowerCase() === "en in" || cleanTitle.length <= 5) {
      cleanTitle = `${cleanBrand} Curated Garment`;
    }
    return {
      brand: cleanBrand || void 0,
      title: cleanTitle || void 0,
      category: categoryRaw || void 0
    };
  } catch {
    return {};
  }
}
var expressApp_default = app;

// api/_index.ts
var index_default = expressApp_default;
export {
  index_default as default
};
